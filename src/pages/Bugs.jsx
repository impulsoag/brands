import React, { useEffect, useState, useCallback } from 'react'
import { Bug, AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'

const SEVERITY_COLORS = {
  critical: 'badge-red',
  error:    'badge-orange',
  warning:  'badge-yellow',
  info:     'badge-blue',
}

const TYPE_COLORS = {
  javascript: 'badge-red',
  network:    'badge-orange',
  promise:    'badge-yellow',
  tracking:   'badge-cyan',
  ui:         'badge-purple',
}

function SeverityBadge({ severity }) {
  if (!severity) return <span className="text-muted">—</span>
  return <span className={`badge ${SEVERITY_COLORS[severity.toLowerCase()] || 'badge-gray'}`}>{severity}</span>
}

function TypeBadge({ type }) {
  if (!type) return <span className="text-muted">—</span>
  return <span className={`badge ${TYPE_COLORS[type.toLowerCase()] || 'badge-gray'}`}>{type}</span>
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

function truncateId(id) {
  if (!id) return '—'
  return id.length > 16 ? id.slice(0, 8) + '...' + id.slice(-6) : id
}

const _cache = {}

export default function Bugs() {
  const [fPeriod, setFPeriod]     = useState('7')
  const [fType, setFType]         = useState('')
  const [fSeverity, setFSeverity] = useState('')
  const [expanded, setExpanded]   = useState(null)

  const cached = _cache[fPeriod]
  const [bugs, setBugs]         = useState(cached?.bugs || [])
  const [loading, setLoading]   = useState(!cached)
  const [bugTypes, setBugTypes] = useState(cached?.bugTypes || [])
  const [summary, setSummary]   = useState(cached?.summary || { total: 0, critical: 0, errors: 0, warnings: 0 })

  function computeSummary(rows) {
    return {
      total:    rows.length,
      critical: rows.filter(b => (b.severity || '').toLowerCase() === 'critical').length,
      errors:   rows.filter(b => (b.severity || '').toLowerCase() === 'error').length,
      warnings: rows.filter(b => (b.severity || '').toLowerCase() === 'warning').length,
    }
  }

  const loadBugs = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const since = new Date(); since.setDate(since.getDate() - Number(fPeriod))
      const { data, error } = await supabase
        .from('bugs')
        .select('id,created_at,type,message,error,session_id,event_id,page_url,referrer,function_name,payload,severity')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const rows = data || []
      setBugs(rows)

      const types = [...new Set(rows.map(b => b.type).filter(Boolean))]
      setBugTypes(types)

      const newSummary = computeSummary(rows)
      setSummary(newSummary)

      _cache[fPeriod] = { bugs: rows, bugTypes: types, summary: newSummary }
    } catch(err) {
      console.error('[Bugs]', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => {
    loadBugs(!_cache[fPeriod])
    const ch = supabase.channel('bugs-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bugs' }, ({ new: row }) => {
        setBugs(prev => {
          const updated = [row, ...prev]
          setSummary(computeSummary(updated))
          if (row.type) setBugTypes(t => t.includes(row.type) ? t : [...t, row.type])
          return updated
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadBugs])

  const displayed = bugs.filter(b =>
    (!fType     || b.type === fType) &&
    (!fSeverity || (b.severity || '').toLowerCase() === fSeverity)
  )

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Bugs</h1>
        <p className="page-subtitle">Monitoramento de erros e falhas do sistema</p>
      </div>

      <div className="stat-cards-grid">
        <StatCard label="Total de Bugs"  value={summary.total}    icon={<Bug size={18}/>}           color="--accent-blue"/>
        <StatCard label="Críticos"       value={summary.critical} icon={<ShieldAlert size={18}/>}   color="--accent-red"/>
        <StatCard label="Erros"          value={summary.errors}   icon={<AlertCircle size={18}/>}   color="--accent-orange"/>
        <StatCard label="Avisos"         value={summary.warnings} icon={<AlertTriangle size={18}/>} color="--accent-yellow"/>
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
          {bugTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select className="filter-select" value={fSeverity} onChange={e => setFSeverity(e.target.value)}>
          <option value="">Todas severidades</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        {(fType || fSeverity) && (
          <button
            onClick={() => { setFType(''); setFSeverity('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)' }}
          >
            Limpar
          </button>
        )}

        <span className="text-muted text-small" style={{ marginLeft: 'auto' }}>
          {displayed.length} bugs
        </span>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner"/>Carregando bugs...</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state">
          <Info size={28} color="var(--text-muted)"/>
          {bugs.length === 0 ? 'Nenhum bug registrado. Sistema saudável!' : 'Nenhum bug corresponde aos filtros.'}
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Severidade</th>
                <th>Tipo</th>
                <th>Mensagem</th>
                <th>Função</th>
                <th>Página</th>
                <th>Session</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(bug => (
                <React.Fragment key={bug.id}>
                  <tr
                    style={{ cursor: bug.error || bug.payload ? 'pointer' : 'default' }}
                    onClick={() => bug.error || bug.payload ? setExpanded(expanded === bug.id ? null : bug.id) : null}
                    title={bug.error || bug.payload ? 'Clique para ver detalhes' : undefined}
                  >
                    <td><SeverityBadge severity={bug.severity}/></td>
                    <td><TypeBadge type={bug.type}/></td>
                    <td>
                      <span className="text-small" style={{ color: 'var(--text-primary)', maxWidth: 260, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={bug.message}>
                        {bug.message || <span className="text-muted">—</span>}
                      </span>
                    </td>
                    <td>
                      {bug.function_name
                        ? <span className="td-mono" style={{ fontSize: 11 }}>{bug.function_name}</span>
                        : <span className="text-muted">—</span>
                      }
                    </td>
                    <td>
                      <span className="text-small" style={{ color: 'var(--text-secondary)' }} title={bug.page_url}>
                        {truncateUrl(bug.page_url)}
                      </span>
                    </td>
                    <td className="td-mono" style={{ fontSize: 11 }} title={bug.session_id}>
                      {truncateId(bug.session_id)}
                    </td>
                    <td className="text-muted text-small">{fmtDate(bug.created_at)}</td>
                  </tr>
                  {expanded === bug.id && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-tertiary)', padding: '12px 16px' }}>
                        {bug.error && (
                          <div style={{ marginBottom: bug.payload ? 8 : 0 }}>
                            <span className="text-small" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>Error Stack:</span>
                            <pre style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                              {bug.error}
                            </pre>
                          </div>
                        )}
                        {bug.payload && (
                          <div>
                            <span className="text-small" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Payload:</span>
                            <pre style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(bug.payload, null, 2)}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
