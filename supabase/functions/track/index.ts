/**
 * Edge Function: track
 * Recebe eventos em batch do trackEvent.js v4.0 e persiste no Supabase.
 *
 * Payload esperado: { events: [...] }
 *
 * Deploy: supabase functions deploy track
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cabeçalhos CORS — permitir qualquer origem (ajustar em produção se necessário)
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

Deno.serve(async (req: Request) => {
  // ── Preflight CORS ──────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ── Parse do payload ────────────────────────────────────────────
    const body = await req.json()
    const events: Record<string, unknown>[] = body?.events ?? []

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Nenhum evento recebido' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // ── Cliente Supabase com service_role (permissão total) ─────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // ── Upsert em batch na tabela events ────────────────────────────
    const eventRows = events.map(e => ({
      event_id:       e.event_id       ?? null,
      evento:         e.evento         ?? 'unknown',
      session_id:     e.session_id     ?? null,
      anonymous_id:   e.anonymous_id   ?? null,
      pagina:         e.pagina         ?? null,
      page_url:       e.page_url       ?? null,
      referrer:       e.referrer       ?? null,
      user_agent:     e.user_agent     ?? null,
      language:       e.language       ?? null,
      device_type:    e.device_type    ?? null,
      screen:         e.screen         ?? null,
      page_load_time: e.page_load_time ?? null,
      utm_source:     e.utm_source     ?? null,
      utm_medium:     e.utm_medium     ?? null,
      utm_campaign:   e.utm_campaign   ?? null,
      utm_term:       e.utm_term       ?? null,
      utm_content:    e.utm_content    ?? null,
      influencer:     e.influencer     ?? null,
      combo:          e.combo          ?? null,
      question:       e.question       ?? null,
      question_id:    e.question_id    ?? null,
      depth:          e.depth          ?? null,
      time_seconds:   e.time_seconds   ?? null,
      cta_name:       e.cta_name       ?? null,
      phone:          e.phone          ?? null,
      brand_name:     e.brand_name     ?? null,
      origin:         e.origin         ?? null,
      created_at:     e.created_at     ?? new Date().toISOString(),
    }))

    const { error: eventsError } = await supabase
      .from('events')
      .upsert(eventRows, { onConflict: 'event_id', ignoreDuplicates: true })

    if (eventsError) {
      console.error('[track] Erro ao inserir eventos:', eventsError)
      // Não interrompe — tenta fazer upsert de sessão mesmo assim
    }

    // ── Upsert de sessão (usa o primeiro evento do batch) ───────────
    const first = events[0]
    if (first?.session_id) {
      const sessionRow = {
        session_id:   first.session_id,
        anonymous_id: first.anonymous_id ?? null,
        influencer:   first.influencer   ?? null,
        origin:       first.origin       ?? null,
        device_type:  first.device_type  ?? null,
        utm_source:   first.utm_source   ?? null,
        utm_medium:   first.utm_medium   ?? null,
        utm_campaign: first.utm_campaign ?? null,
        updated_at:   new Date().toISOString(),
      }

      // Verifica se a sessão já existe para incrementar page_count e total_time
      const { data: existing } = await supabase
        .from('sessions')
        .select('id, page_count, total_time')
        .eq('session_id', first.session_id)
        .single()

      if (existing) {
        // Acumula tempo (soma todos os time_on_page do batch)
        const extraTime = events
          .filter(e => e.evento === 'time_on_page' && e.time_seconds)
          .reduce((acc: number, e) => acc + Number(e.time_seconds), 0)

        const hasNewPage = events.some(e => e.evento === 'page_view')

        await supabase
          .from('sessions')
          .update({
            ...sessionRow,
            page_count: existing.page_count + (hasNewPage ? 1 : 0),
            total_time: (existing.total_time ?? 0) + extraTime,
          })
          .eq('session_id', first.session_id)
      } else {
        // Nova sessão
        const { error: sessError } = await supabase
          .from('sessions')
          .upsert({ ...sessionRow, page_count: 1, total_time: 0 }, { onConflict: 'session_id' })

        if (sessError) {
          console.error('[track] Erro ao criar sessão:', sessError)
        }
      }
    }

    // ── Inserção de lead (evento = "lead") ──────────────────────────
    const leadEvents = events.filter(e => e.evento === 'lead' && e.phone)
    if (leadEvents.length > 0) {
      const leadRows = leadEvents.map(e => ({
        numero:       e.phone        ?? '',
        brand_name:   e.brand_name   ?? null,
        combo:        e.combo        ?? null,
        origem:       e.origin       ?? null,
        influencer:   e.influencer   ?? null,
        pagina:       e.pagina       ?? null,
        utm_source:   e.utm_source   ?? null,
        utm_medium:   e.utm_medium   ?? null,
        utm_campaign: e.utm_campaign ?? null,
        intencao:     'Novo',
        status:       'Nova',
        created_at:   e.created_at   ?? new Date().toISOString(),
      }))

      const { error: leadError } = await supabase
        .from('leads')
        .insert(leadRows)

      if (leadError) {
        console.error('[track] Erro ao inserir lead:', leadError)
      }
    }

    return new Response(
      JSON.stringify({ ok: true, received: events.length }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[track] Erro interno:', err)
    return new Response(
      JSON.stringify({ ok: false, error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  }
})
