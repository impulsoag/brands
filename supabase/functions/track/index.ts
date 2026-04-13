/**
 * Edge Function: track
 * Recebe eventos em batch e persiste no Supabase.
 *
 * Payload esperado: { events: [...] }
 * Eventos suportados: page_view, click_cta, scroll, form_start, form_submit
 *
 * Deploy: supabase functions deploy track
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Eventos permitidos (padrão único)
const VALID_EVENTS = new Set(['page_view', 'click_cta', 'scroll', 'form_start', 'form_submit'])

// Helper: insere erro na tabela bugs sem lançar exceção
async function logBug(
  supabase: ReturnType<typeof createClient>,
  params: {
    type: string
    message: string
    error?: string
    session_id?: string | null
    event_id?: string | null
    page_url?: string | null
    referrer?: string | null
    function_name: string
    payload?: unknown
  }
) {
  try {
    await supabase.from('bugs').insert([{
      type:          params.type,
      message:       params.message,
      error:         params.error ?? null,
      session_id:    params.session_id ?? null,
      event_id:      params.event_id   ?? null,
      page_url:      params.page_url   ?? null,
      referrer:      params.referrer   ?? null,
      function_name: params.function_name,
      payload:       params.payload    ?? null,
    }])
  } catch {
    // silencioso — não podemos lançar erro no handler de erro
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  let body: { events?: Record<string, unknown>[] } = {}

  try {
    body = await req.json()
  } catch (err) {
    await logBug(supabase, {
      type: 'parse_error',
      message: 'Falha ao parsear payload JSON',
      error: String(err),
      function_name: 'track/parse',
    })
    return new Response(
      JSON.stringify({ ok: false, error: 'Payload inválido' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  const rawEvents: Record<string, unknown>[] = body?.events ?? []

  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Nenhum evento recebido' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // Filtra apenas eventos com nomes padronizados
  const events = rawEvents.filter(e => VALID_EVENTS.has(String(e.evento ?? '')))

  const first = rawEvents[0] // usa rawEvents para session/lead (independente do filtro)

  // ── 1. UPSERT DE SESSÃO ──────────────────────────────────────
  if (first?.session_id) {
    try {
      const sessionRow = {
        session_id:   String(first.session_id),
        influencer:   (first.influencer   as string) ?? null,
        device_type:  (first.device_type  as string) ?? null,
        utm_source:   (first.utm_source   as string) ?? null,
        utm_medium:   (first.utm_medium   as string) ?? null,
        utm_campaign: (first.utm_campaign as string) ?? null,
      }

      const { error: sessError } = await supabase
        .from('sessions')
        .upsert(sessionRow, { onConflict: 'session_id', ignoreDuplicates: true })

      if (sessError) {
        await logBug(supabase, {
          type: 'db_error',
          message: 'Erro ao fazer upsert de sessão',
          error: sessError.message,
          session_id: String(first.session_id),
          page_url: (first.page_url as string) ?? null,
          function_name: 'track/session',
          payload: sessionRow,
        })
      }
    } catch (err) {
      await logBug(supabase, {
        type: 'exception',
        message: 'Exceção ao processar sessão',
        error: String(err),
        session_id: String(first.session_id),
        function_name: 'track/session',
      })
    }
  }

  // ── 2. INSERT DE EVENTOS ─────────────────────────────────────
  if (events.length > 0) {
    try {
      const eventRows = events.map(e => ({
        evento:      String(e.evento),
        session_id:  (e.session_id  as string) ?? null,
        page_url:    (e.page_url    as string) ?? null,
        cta_name:    (e.cta_name    as string) ?? null,
        section:     (e.section     as string) ?? null,
        language:    (e.language    as string) ?? null,
        depth:       typeof e.depth === 'number' ? e.depth : null,
        referrer:    (e.referrer    as string) ?? null,
        question_id: (e.question_id as string) ?? null,
        // dados contextuais consolidados em props (sem duplicar em colunas)
        props: {
          device_type:  (e.device_type  as string) ?? null,
          utm_source:   (e.utm_source   as string) ?? null,
          utm_medium:   (e.utm_medium   as string) ?? null,
          utm_campaign: (e.utm_campaign as string) ?? null,
        },
        created_at: (e.created_at as string) ?? new Date().toISOString(),
      }))

      const { error: eventsError } = await supabase
        .from('events')
        .insert(eventRows)

      if (eventsError) {
        await logBug(supabase, {
          type: 'db_error',
          message: 'Erro ao inserir eventos',
          error: eventsError.message,
          session_id: (first.session_id as string) ?? null,
          page_url: (first.page_url as string) ?? null,
          function_name: 'track/events',
          payload: { count: eventRows.length },
        })
      }
    } catch (err) {
      await logBug(supabase, {
        type: 'exception',
        message: 'Exceção ao inserir eventos',
        error: String(err),
        session_id: (first.session_id as string) ?? null,
        function_name: 'track/events',
      })
    }
  }

  // ── 3. INSERT DE LEAD ─────────────────────────────────────────
  // Lead = evento form_submit com número de telefone
  const leadEvents = rawEvents.filter(e => e.evento === 'form_submit' && e.phone)

  if (leadEvents.length > 0) {
    try {
      const leadRows = leadEvents.map(e => ({
        nome:        (e.brand_name  as string) ?? null,
        numero:      String(e.phone),
        device_type: (e.device_type as string) ?? null,
        influencer:  (e.influencer  as string) ?? null,
        utm_source:  (e.utm_source  as string) ?? null,
        combo:       (e.combo       as string) ?? null,
        session_id:  (e.session_id  as string) ?? null,
        status:      'Novo Lead',
        created_at:  (e.created_at  as string) ?? new Date().toISOString(),
      }))

      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadRows)

      if (leadError) {
        await logBug(supabase, {
          type: 'db_error',
          message: 'Erro ao inserir lead',
          error: leadError.message,
          session_id: (leadEvents[0].session_id as string) ?? null,
          page_url: (leadEvents[0].page_url as string) ?? null,
          function_name: 'track/lead',
          payload: { count: leadRows.length },
        })
      }
    } catch (err) {
      await logBug(supabase, {
        type: 'exception',
        message: 'Exceção ao inserir lead',
        error: String(err),
        session_id: (leadEvents[0]?.session_id as string) ?? null,
        function_name: 'track/lead',
      })
    }
  }

  return new Response(
    JSON.stringify({ ok: true, received: rawEvents.length, processed: events.length }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
