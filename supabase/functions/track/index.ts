/**
 * Edge Function: track
 * Recebe eventos em batch e persiste no Supabase.
 *
 * Payload esperado: { events: [...] }
 * Eventos aceitos: page_view, click_cta, scroll, form_start, form_submit
 *
 * Deploy: supabase functions deploy track
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// ── Eventos permitidos (padrão global) ───────────────────────
const ALLOWED_EVENTS = ['page_view', 'click_cta', 'scroll', 'form_start', 'form_submit'] as const
type AllowedEvent = typeof ALLOWED_EVENTS[number]

function isAllowedEvent(evt: unknown): evt is AllowedEvent {
  return ALLOWED_EVENTS.includes(evt as AllowedEvent)
}

// ── Tipos ─────────────────────────────────────────────────────
type Severity = 'low' | 'medium' | 'high'

interface LogErrorParams {
  type: string
  message: string
  severity: Severity
  error?: string
  session_id?: string | null
  event_id?: string | null
  page_url?: string | null
  referrer?: string | null
  function_name: string
  payload?: unknown
}

// ── Helper central de log de erros ────────────────────────────
// Todos os erros passam aqui — nenhum fica só no console.
async function logError(
  supabase: ReturnType<typeof createClient>,
  params: LogErrorParams
): Promise<void> {
  try {
    await supabase.from('bugs').insert([{
      type:          params.type,
      message:       params.message,
      severity:      params.severity,
      error:         params.error         ?? null,
      session_id:    params.session_id    ?? null,
      event_id:      params.event_id      ?? null,
      page_url:      params.page_url      ?? null,
      referrer:      params.referrer      ?? null,
      function_name: params.function_name,
      payload:       params.payload       ?? null,
    }])
  } catch (e) {
    // Último recurso — se o próprio insert em bugs falhar,
    // ao menos registramos no console da edge function.
    console.error('[track] logError falhou:', e, '| original:', params.message)
  }
}

// ── Handler principal ─────────────────────────────────────────
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

  // ── 1. Parse do payload ──────────────────────────────────────
  let body: { events?: Record<string, unknown>[] } = {}
  try {
    body = await req.json()
  } catch (err) {
    await logError(supabase, {
      type: 'parse_error',
      message: 'Falha ao parsear payload JSON',
      severity: 'medium',
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

  // ── 2. Validação de session_id (CRÍTICO) ─────────────────────
  // Todo batch deve ter session_id — sem ele não há rastreabilidade.
  const first = rawEvents[0]
  const sessionId = first?.session_id ? String(first.session_id) : null

  if (!sessionId) {
    await logError(supabase, {
      type: 'validation_error',
      message: 'session_id ausente no payload — execução bloqueada',
      severity: 'high',
      function_name: 'track/validation',
      payload: { events_count: rawEvents.length, first_event: first?.evento },
    })
    return new Response(
      JSON.stringify({ ok: false, error: 'session_id obrigatório' }),
      { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  // ── 3. Filtra e valida eventos (padrão global) ────────────────
  const invalidEvents = rawEvents.filter(e => !isAllowedEvent(e.evento))
  const validEvents   = rawEvents.filter(e =>  isAllowedEvent(e.evento))

  // Registra eventos desconhecidos como aviso (não bloqueia)
  if (invalidEvents.length > 0) {
    await logError(supabase, {
      type: 'validation_error',
      message: `Eventos fora do padrão rejeitados: ${invalidEvents.map(e => e.evento).join(', ')}`,
      severity: 'low',
      session_id: sessionId,
      function_name: 'track/validation',
      payload: { rejected: invalidEvents.map(e => e.evento) },
    })
  }

  // ── 4. Upsert de sessão ───────────────────────────────────────
  try {
    const sessionRow = {
      session_id:   sessionId,
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
      await logError(supabase, {
        type: 'db_error',
        message: 'Erro ao fazer upsert de sessão',
        severity: 'high',
        error: sessError.message,
        session_id: sessionId,
        page_url: (first.page_url as string) ?? null,
        function_name: 'track/session',
        payload: sessionRow,
      })
    }
  } catch (err) {
    await logError(supabase, {
      type: 'exception',
      message: 'Exceção ao processar sessão',
      severity: 'high',
      error: String(err),
      session_id: sessionId,
      function_name: 'track/session',
    })
  }

  // ── 5. Insert de eventos válidos ─────────────────────────────
  if (validEvents.length > 0) {
    try {
      const eventRows = validEvents.map(e => ({
        evento:      String(e.evento),
        session_id:  sessionId,
        page_url:    (e.page_url    as string) ?? null,
        cta_name:    (e.cta_name    as string) ?? null,
        section:     (e.section     as string) ?? null,
        language:    (e.language    as string) ?? null,
        depth:       typeof e.depth === 'number' ? e.depth : null,
        referrer:    (e.referrer    as string) ?? null,
        question_id: (e.question_id as string) ?? null,
        // dados contextuais em props — sem duplicação em colunas
        props: {
          device_type:  (e.device_type  as string) ?? null,
          utm_source:   (e.utm_source   as string) ?? null,
          utm_medium:   (e.utm_medium   as string) ?? null,
          utm_campaign: (e.utm_campaign as string) ?? null,
        },
        created_at: (e.created_at as string) ?? new Date().toISOString(),
      }))

      const { error: eventsError } = await supabase.from('events').insert(eventRows)

      if (eventsError) {
        await logError(supabase, {
          type: 'db_error',
          message: 'Erro ao inserir eventos',
          severity: 'medium',
          error: eventsError.message,
          session_id: sessionId,
          page_url: (first.page_url as string) ?? null,
          function_name: 'track/events',
          payload: { count: eventRows.length },
        })
      }
    } catch (err) {
      await logError(supabase, {
        type: 'exception',
        message: 'Exceção ao inserir eventos',
        severity: 'medium',
        error: String(err),
        session_id: sessionId,
        function_name: 'track/events',
      })
    }
  }

  // ── 6. Insert de lead (form_submit + phone) ───────────────────
  const leadEvents = rawEvents.filter(e => e.evento === 'form_submit' && e.phone)

  if (leadEvents.length > 0) {
    // 6a. Verifica se a sessão existe antes de salvar o lead
    let sessionExists = false
    try {
      const { data: sessCheck, error: sessCheckError } = await supabase
        .from('sessions')
        .select('session_id')
        .eq('session_id', sessionId)
        .maybeSingle()

      if (sessCheckError) {
        await logError(supabase, {
          type: 'db_error',
          message: 'Erro ao verificar existência da sessão para lead',
          severity: 'high',
          error: sessCheckError.message,
          session_id: sessionId,
          function_name: 'track/lead/session_check',
        })
      } else {
        sessionExists = !!sessCheck
      }
    } catch (err) {
      await logError(supabase, {
        type: 'exception',
        message: 'Exceção ao verificar sessão para lead',
        severity: 'high',
        error: String(err),
        session_id: sessionId,
        function_name: 'track/lead/session_check',
      })
    }

    if (!sessionExists) {
      await logError(supabase, {
        type: 'integrity_error',
        message: 'Lead rejeitado — session_id não encontrado na tabela sessions',
        severity: 'high',
        session_id: sessionId,
        function_name: 'track/lead',
        payload: { phone_present: true, session_id: sessionId },
      })
    } else {
      // 6b. Sessão confirmada — salva o lead
      try {
        const leadRows = leadEvents.map(e => ({
          nome:        (e.brand_name  as string) ?? null,
          numero:      String(e.phone),
          device_type: (e.device_type as string) ?? null,
          influencer:  (e.influencer  as string) ?? null,
          utm_source:  (e.utm_source  as string) ?? null,
          combo:       (e.combo       as string) ?? null,
          session_id:  sessionId,
          status:      'Novo Lead',
          created_at:  (e.created_at  as string) ?? new Date().toISOString(),
        }))

        const { error: leadError } = await supabase.from('leads').insert(leadRows)

        if (leadError) {
          await logError(supabase, {
            type: 'db_error',
            message: 'Erro ao inserir lead',
            severity: 'high',
            error: leadError.message,
            session_id: sessionId,
            page_url: (leadEvents[0].page_url as string) ?? null,
            function_name: 'track/lead',
            payload: { count: leadRows.length },
          })
        }
      } catch (err) {
        await logError(supabase, {
          type: 'exception',
          message: 'Exceção ao inserir lead',
          severity: 'high',
          error: String(err),
          session_id: sessionId,
          function_name: 'track/lead',
        })
      }
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      received: rawEvents.length,
      processed: validEvents.length,
      rejected: invalidEvents.length,
    }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  )
})
