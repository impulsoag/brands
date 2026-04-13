import React, { useEffect, useState, useCallback } from 'react'
import { MousePointerClick, ArrowDownUp, HelpCircle, Activity } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'

const EVENT_COLORS = {
  page_view:   'badge-blue',
  click_cta:   'badge-green',
  scroll:      'badge-yellow',
  form_start:  'badge-purple',
  form_submit: 'badge-orange',
}

function EventBadge({ tipo }) {
  return <span className={`badge ${EVENT_COLORS[tipo] || 'badge-gray'}`}>{tipo}</span>
}

function EventValue({ evento, depth, cta_name, question_id, props: evProps }) {
  if (evento === 'scroll'      && depth != null) return <span className="badge badge-yellow">{depth}%</span>
  if (evento === 'click_cta'   && cta_name)      return <span className="text-small" style={{ color: 'var(--text-primary)' }}>{cta_name}</span>
  if (evento === 'form_submit' && evProps?.combo) return <span className="text-small" style={{ color: 'var(--text-secondary)' }}>{evProps.combo}</span>
  if (question_id)                                return <span className="badge badge-purple">Q:{question_id}</span>
  return <span className="text-muted">—</span>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function truncateUrl(url) {
  if (!url) return '—'
  try {
    const u = new URL(url)
    return u.pathname || '/'
  } catch {
    return url.length > 40 ? url.slice(0, 40) + '…' : url
  }
}

const _cache = {}

export default function Events() {
  const [fPeriod, setFPeriod] = useState('7')
  const [fType, setFType]     = useState('')

  const cached = _cache[fPeriod]
  const [events, setEvents]         = useState(cached?.events || [])
  const [loading, setLoading]       = useState(!cached)
  const [eventTypes, setEventTypes] = useState(cached?.eventTypes || [])
  const [summary, setSummary]       = useState(cached?.summary || { clicks: 0, scrolls: 0, formSubmits: 0 })

  function computeSummary(rows) {
    return {
      clicks:      rows.filter(e => e.evento === 'click_cta').length,
      scrolls:     rows.filter(e => e.evento === 'scroll').length,
      formSubmits: rows.filter(e => e.evento === 'form_submit').length,
    }
  }

  const loadEvents = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const since = new Date(); since.setDate(since.getDate() - Number(fPeriod))

      const { data, error } = await supabase
        .from('events')
        .select('id,evento,session_id,page_url,cta_name,props,section,language,depth,referrer,question_id,created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      const rows = data || []
      setEvents(rows)

      const types = [...new Set(rows.map(e => e.evento).filter(Boolean))]
      setEventTypes(types)

      const newSummary = computeSummary(rows)
      setSummary(newSummary)

      _cache[fPeriod] = { events: rows, eventTypes: types, summary: newSummary }
    } catch(err) {
      console.error('[Events]', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => {
    loadEvents(!_cache[fPeriod])
    const ch = supabase.channel('events-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, ({ new: row }) => {
        setEvents(prev => {
          const updated = [row, ...prev]
          setSummary(computeSummary(updated))
          if (row.evento) setEventTypes(t => t.includes(row.evento) ? t : [...t, row.evento])
          return updated
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadEvents])

  const displayed = events.filter(e => !fType || e.evento === fType)

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Eventos</h1>
        <p className="page-subtitle">Interações rastreadas nas landing pages</p>
      </div>

      <div className="stat-cards-grid">
        <StatCard label="Cliques no CTA"  value={summary.clicks}      icon={<MousePointerClick size={18}/>} color="--accent-green"/>
        <StatCard label="Scrolls"         value={summary.scrolls}     icon={<ArrowDownUp size={18}/>}      color="--accent-yellow"/>
        <StatCard label="Formulários"     value={summary.formSubmits} icon={<HelpCircle size={18}/>}       color="--accent-purple"/>
      </div>

      <div className="filters-bar">
        <span className="filters-label">Filtros:</span>

        <select className="filter-select" value={fPeriod} onChange={e => setFPeriod(e.target.value)}>
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>

        <select className="filter-select" value={fType} onChange={e => setFType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {eventTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {fType && (
          <button
            onClick={() => setFType('')}
            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}
          >
            Limpar
          </button>
        )}

        <span className="text-muted text-small" style={{ marginLeft: 'auto' }}>
          {displayed.length} eventos
        </span>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner"/>Carregando eventos...</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state"><Activity size={28} color="var(--text-muted)"/>Nenhum evento encontrado</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Página</th>
                <th>Seção</th>
                <th>Dispositivo</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(ev => (
                <tr key={ev.id}>
                  <td><EventBadge tipo={ev.evento}/></td>
                  <td><EventValue evento={ev.evento} depth={ev.depth} cta_name={ev.cta_name} question_id={ev.question_id} props={ev.props}/></td>
                  <td>
                    <span className="text-small" style={{ color: 'var(--text-secondary)' }} title={ev.page_url}>
                      {truncateUrl(ev.page_url)}
                    </span>
                  </td>
                  <td>
                    {ev.section
                      ? <span className="text-small" style={{ color: 'var(--text-secondary)' }}>{ev.section}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {ev.props?.device_type
                      ? <span className={`badge ${ev.props.device_type.toLowerCase() === 'mobile' ? 'badge-blue' : 'badge-purple'}`}>{ev.props.device_type}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
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
