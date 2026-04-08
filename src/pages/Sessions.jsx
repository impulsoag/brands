import React, { useEffect, useState, useCallback } from 'react'
import { MonitorSmartphone, Smartphone, Monitor, Globe } from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'

function DeviceBadge({ type }) {
  if (!type) return <span className="text-muted">—</span>
  const map = { mobile:'badge-blue', desktop:'badge-purple', tablet:'badge-yellow' }
  return <span className={`badge ${map[type.toLowerCase()]||'badge-gray'}`}>{type}</span>
}

function SourceBadge({ src }) {
  if (!src) return <span className="text-muted" style={{fontSize:12}}>direto</span>
  const map = { instagram:'badge-purple', tiktok:'badge-cyan', youtube:'badge-red', google:'badge-blue', facebook:'badge-blue' }
  return <span className={`badge ${map[src.toLowerCase()]||'badge-gray'}`}>{src}</span>
}

function truncateId(id) {
  if (!id) return '—'
  return id.length > 16 ? id.slice(0,8)+'...'+id.slice(-6) : id
}

function fmtTime(seconds) {
  if (!seconds) return '0s'
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds/60)}min`
  return `${(seconds/3600).toFixed(1)}h`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})
}

const _cache = {}

export default function Sessions() {
  const [fPeriod, setFPeriod]         = useState('7')
  const [fInfluencer, setFInfluencer] = useState('')
  const [fDevice, setFDevice]         = useState('')

  const cached = _cache[fPeriod]
  const [sessions, setSessions]       = useState(cached || [])
  const [loading, setLoading]         = useState(!cached)

  const loadSessions = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const since = new Date(); since.setDate(since.getDate()-Number(fPeriod))
      const { data, error } = await supabase.from('sessions').select('*')
        .gte('created_at', since.toISOString())
        .order('created_at',{ascending:false}).limit(500)
      if (error) throw error
      setSessions(data||[])
      _cache[fPeriod] = data||[]
    } catch(err) {
      console.error('[Sessions]', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => {
    loadSessions(!_cache[fPeriod])
    const ch = supabase.channel('sessions-rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'sessions'},({new:row})=>{
        setSessions(prev=>[row,...prev])
      })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'sessions'},({new:row})=>{
        setSessions(prev=>prev.map(s=>s.id===row.id?row:s))
      })
      .subscribe()
    return ()=>{ supabase.removeChannel(ch) }
  }, [loadSessions])

  const displayed = sessions.filter(s =>
    (!fInfluencer || s.influencer === fInfluencer) &&
    (!fDevice || (s.device_type||'').toLowerCase() === fDevice)
  )

  // Métricas
  const mobile  = sessions.filter(s=>(s.device_type||'').toLowerCase()==='mobile').length
  const desktop = sessions.filter(s=>(s.device_type||'').toLowerCase()==='desktop').length
  const totalTime = sessions.reduce((a,s)=>a+(s.total_time||0),0)
  const avgTime = sessions.length > 0 ? Math.round(totalTime/sessions.length) : 0

  const optInfluencers = [...new Set(sessions.map(s=>s.influencer).filter(Boolean))]

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Sessões</h1>
        <p className="page-subtitle">{sessions.length} sessões no período</p>
      </div>

      {/* Summary cards */}
      <div className="stat-cards-grid">
        <StatCard label="Total Sessões"    value={sessions.length}    icon={<MonitorSmartphone size={18}/>} color="--accent-blue"/>
        <StatCard label="Mobile"           value={mobile}             sub={sessions.length>0?`${Math.round(mobile/sessions.length*100)}% do total`:''} icon={<Smartphone size={18}/>} color="--accent-cyan"/>
        <StatCard label="Desktop"          value={desktop}            sub={sessions.length>0?`${Math.round(desktop/sessions.length*100)}% do total`:''} icon={<Monitor size={18}/>}    color="--accent-purple"/>
        <StatCard label="Tempo Médio"      value={fmtTime(avgTime)}   sub="por sessão"                     icon={<Globe size={18}/>}                  color="--accent-yellow"/>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <span className="filters-label">Filtros:</span>

        <select className="filter-select" value={fPeriod} onChange={e=>setFPeriod(e.target.value)}>
          <option value="1">Hoje</option>
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>

        <select className="filter-select" value={fInfluencer} onChange={e=>setFInfluencer(e.target.value)}>
          <option value="">Todos os influenciadores</option>
          {optInfluencers.map(v=><option key={v} value={v}>{v}</option>)}
        </select>

        <select className="filter-select" value={fDevice} onChange={e=>setFDevice(e.target.value)}>
          <option value="">Todos dispositivos</option>
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>

        {(fInfluencer||fDevice) && (
          <button onClick={()=>{setFInfluencer('');setFDevice('')}}
            style={{background:'none',border:'none',color:'var(--accent-red)',cursor:'pointer',fontSize:12,fontFamily:'var(--font-sans)'}}>
            Limpar
          </button>
        )}
        <span className="text-muted text-small" style={{marginLeft:'auto'}}>{displayed.length} sessões</span>
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner"/>Carregando sessões...</div>
      ) : displayed.length === 0 ? (
        <div className="empty-state"><MonitorSmartphone size={28} color="var(--text-muted)"/>Nenhuma sessão encontrada</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Influenciador</th>
                <th>Dispositivo</th>
                <th>UTM Source</th>
                <th>Tempo</th>
                <th>Páginas</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(s=>(
                <tr key={s.id}>
                  <td className="td-mono" title={s.session_id}>{truncateId(s.session_id)}</td>
                  <td className="td-primary">{s.influencer || <span className="text-muted">—</span>}</td>
                  <td><DeviceBadge type={s.device_type}/></td>
                  <td><SourceBadge src={s.utm_source}/></td>
                  <td><span style={{color:'var(--accent-cyan)',fontWeight:600,fontSize:13}}>{fmtTime(s.total_time)}</span></td>
                  <td><span style={{color:'var(--text-primary)',fontWeight:600}}>{s.page_count??1}</span></td>
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
