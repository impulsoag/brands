import React, { useEffect, useState, useCallback } from 'react'
import { MonitorSmartphone } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Badge de device type
function DeviceBadge({ type }) {
  if (!type) return <span className="text-muted">—</span>
  const map = {
    mobile:  'badge-blue',
    desktop: 'badge-purple',
    tablet:  'badge-yellow',
  }
  return <span className={`badge ${map[type.toLowerCase()] || 'badge-gray'}`}>{type}</span>
}

// Badge de UTM source
function SourceBadge({ src }) {
  if (!src) return <span className="text-muted">direto</span>
  const map = {
    instagram: 'badge-purple',
    tiktok:    'badge-cyan',
    youtube:   'badge-red',
    google:    'badge-blue',
    facebook:  'badge-blue',
    twitter:   'badge-cyan',
  }
  return <span className={`badge ${map[src.toLowerCase()] || 'badge-gray'}`}>{src}</span>
}

// Trunca session_id para exibição
function truncateId(id) {
  if (!id) return '—'
  return id.length > 16 ? id.slice(0, 8) + '...' + id.slice(-6) : id
}

function fmtTime(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}min`
  return `${(seconds / 3600).toFixed(1)}h`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Sessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [fPeriod, setFPeriod]   = useState('7')

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - Number(fPeriod))

      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(300)

      if (error) throw error
      setSessions(data || [])
    } catch (err) {
      console.error('[Sessions] Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => {
    loadSessions()

    const channel = supabase
      .channel('sessions-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, ({ new: row }) => {
        setSessions(prev => [row, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, ({ new: row }) => {
        setSessions(prev => prev.map(s => s.id === row.id ? row : s))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadSessions])

  return (
    <div className="page-container fade-in">
      {/* Cabeçalho */}
      <div className="page-header">
        <h1 className="page-title">Sessões</h1>
        <p className="page-subtitle">{sessions.length} sessões exibidas</p>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <span className="filters-label">Período:</span>
        <select
          className="filter-select"
          value={fPeriod}
          onChange={e => setFPeriod(e.target.value)}
        >
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Carregando sessões...
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <MonitorSmartphone size={28} color="var(--text-muted)" />
          Nenhuma sessão encontrada
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Influenciador</th>
                <th>Origem</th>
                <th>Device</th>
                <th>UTM Source</th>
                <th>Tempo Total</th>
                <th>Páginas</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id}>
                  <td
                    className="td-mono"
                    title={s.session_id}
                    style={{ cursor: 'default' }}
                  >
                    {truncateId(s.session_id)}
                  </td>
                  <td className="td-primary">
                    {s.influencer || <span className="text-muted">—</span>}
                  </td>
                  <td>
                    {s.origin
                      ? <span className="badge badge-gray">{s.origin}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td><DeviceBadge type={s.device_type} /></td>
                  <td><SourceBadge src={s.utm_source} /></td>
                  <td>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600, fontSize: 12 }}>
                      {fmtTime(s.total_time)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {s.page_count ?? 1}
                    </span>
                  </td>
                  <td className="text-muted text-small">{fmtDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
