import React, { useEffect, useState, useCallback } from 'react'
import { MousePointerClick, ArrowDownUp, HelpCircle, Clock, Activity } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'

// Cache em memória por período
const _cache = {}

// Configuração de cores por tipo de evento
const EVENT_COLORS = {
  page_view:    'badge-blue',
  cta_click:    'badge-green',
  scroll_depth: 'badge-yellow',
  faq_click:    'badge-purple',
  lead:         'badge-orange',
  time_on_page: 'badge-cyan',
  quiz_answer:  'badge-red',
}

function EventBadge({ tipo }) {
  const cls = EVENT_COLORS[tipo] || 'badge-gray'
  return <span className={`badge ${cls}`}>{tipo}</span>
}

// Valor legível por tipo de evento
function EventValue({ evento, depth, time_seconds, cta_name, question }) {
  if (evento === 'scroll_depth' && depth != null)
    return <span className="badge badge-yellow">{depth}%</span>
  if (evento === 'time_on_page' && time_seconds != null)
    return <span className="badge badge-cyan">{time_seconds}s</span>
  if (evento === 'cta_click' && cta_name)
    return <span className="text-small" style={{ color: 'var(--text-primary)' }}>{cta_name}</span>
  if (evento === 'faq_click' && question)
    return (
      <span
        className="text-small"
        style={{ color: 'var(--text-secondary)', maxWidth: 200, display: 'inline-block',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        title={question}
      >
        {question}
      </span>
    )
  return <span className="text-muted">—</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Events() {
  const [fPeriod, setFPeriod]     = useState('7')
  const [fType, setFType]         = useState('')

  const cached = _cache[fPeriod]
  const [events, setEvents]       = useState(cached?.events || [])
  const [loading, setLoading]     = useState(!cached)
  const [eventTypes, setEventTypes] = useState(cached?.eventTypes || [])
  const [summary, setSummary]     = useState(cached?.summary || { clicks: 0, scrolls: 0, faqs: 0, totalTime: 0 })

  const loadEvents = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - Number(fPeriod))

      let query = supabase
        .from('events')
        .select('id,evento,depth,time_seconds,pagina,page_url,influencer,cta_name,question,created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(300)

      if (fType) query = query.eq('evento', fType)

      const { data, error } = await query
      if (error) throw error

      setEvents(data || [])

      // Tipos únicos para o filtro
      const { data: typesRaw } = await supabase
        .from('events')
        .select('evento')
        .gte('created_at', since.toISOString())
      const types = [...new Set((typesRaw || []).map(e => e.evento).filter(Boolean))]
      setEventTypes(types)

      // Cards de resumo
      const clicks     = (data || []).filter(e => e.evento === 'cta_click').length
      const scrolls    = (data || []).filter(e => e.evento === 'scroll_depth').length
      const faqs       = (data || []).filter(e => e.evento === 'faq_click').length
      const totalTime  = (data || [])
        .filter(e => e.evento === 'time_on_page' && e.time_seconds)
        .reduce((acc, e) => acc + (e.time_seconds || 0), 0)
      const newSummary = { clicks, scrolls, faqs, totalTime }
      setSummary(newSummary)

      _cache[fPeriod] = { events: data || [], eventTypes: types, summary: newSummary }
    } catch (err) {
      console.error('[Events] Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }, [fType, fPeriod])

  useEffect(() => {
    loadEvents(!_cache[fPeriod])

    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, ({ new: row }) => {
        setEvents(prev => {
          const updated = [row, ...prev]
          // Recalcula summary cards
          const clicks    = updated.filter(e => e.evento === 'cta_click').length
          const scrolls   = updated.filter(e => e.evento === 'scroll_depth').length
          const faqs      = updated.filter(e => e.evento === 'faq_click').length
          const totalTime = updated
            .filter(e => e.evento === 'time_on_page' && e.time_seconds)
            .reduce((acc, e) => acc + (e.time_seconds || 0), 0)
          setSummary({ clicks, scrolls, faqs, totalTime })
          // Adiciona novo tipo ao filtro se necessário
          if (row.evento) setEventTypes(t => t.includes(row.evento) ? t : [...t, row.evento])
          return updated
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadEvents])

  // Formata tempo total em horas/minutos
  function fmtTime(seconds) {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`
    return `${(seconds / 3600).toFixed(1)}h`
  }

  return (
    <div className="page-container fade-in">
      {/* Cabeçalho */}
      <div className="page-header">
        <h1 className="page-title">Eventos</h1>
        <p className="page-subtitle">Interações rastreadas nas landing pages</p>
      </div>

      {/* Summary Cards */}
      <div className="stat-cards-grid">
        <StatCard
          label="Cliques no CTA"
          value={summary.clicks}
          icon={<MousePointerClick size={18} />}
          color="--accent-green"
        />
        <StatCard
          label="Scrolls Rastreados"
          value={summary.scrolls}
          icon={<ArrowDownUp size={18} />}
          color="--accent-yellow"
        />
        <StatCard
          label="FAQ Clicks"
          value={summary.faqs}
          icon={<HelpCircle size={18} />}
          color="--accent-purple"
        />
        <StatCard
          label="Tempo Total"
          value={fmtTime(summary.totalTime)}
          sub="soma do time_on_page"
          icon={<Clock size={18} />}
          color="--accent-cyan"
        />
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <span className="filters-label">Filtros:</span>
        <select
          className="filter-select"
          value={fPeriod}
          onChange={e => setFPeriod(e.target.value)}
        >
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>

        <select
          className="filter-select"
          value={fType}
          onChange={e => setFType(e.target.value)}
        >
          <option value="">Todos os tipos</option>
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {fType && (
          <button
            onClick={() => setFType('')}
            style={{
              background: 'none', border: 'none', color: 'var(--accent-red)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Carregando eventos...
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <Activity size={28} color="var(--text-muted)" />
          Nenhum evento encontrado
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Página</th>
                <th>Influenciador</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {events.map(ev => (
                <tr key={ev.id}>
                  <td><EventBadge tipo={ev.evento} /></td>
                  <td>
                    <EventValue
                      evento={ev.evento}
                      depth={ev.depth}
                      time_seconds={ev.time_seconds}
                      cta_name={ev.cta_name}
                      question={ev.question}
                    />
                  </td>
                  <td>
                    {ev.pagina
                      ? <span className="text-small" style={{ color: 'var(--text-secondary)' }}>{ev.pagina}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>{ev.influencer || <span className="text-muted">—</span>}</td>
                  <td className="text-muted text-small">{fmtDate(ev.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
