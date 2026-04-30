import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, MousePointerClick, Activity, TrendingUp, Lightbulb,
  Plus, X, Trash2, Instagram, Globe,
} from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const PIE_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#06b6d4']

let _overviewCache = null

function fmtDate(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#1a1d2e', border:'1px solid #1e2330', borderRadius:8, padding:'8px 12px', fontSize:12 }}>
      <p style={{ color:'#94a3b8', marginBottom:4 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color: p.color||'#e2e8f0', fontWeight:600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ── Modal cadastrar influenciador ──────────────────────────
function ModalInfluencer({ onClose, onSaved }) {
  const [form, setForm] = useState({ nome:'', handle:'', link_perfil:'', link_landing:'', foto_url:'' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    const { error } = await supabase.from('influencers').insert([form])
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Cadastrar Landing Page</span>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" placeholder="Ex: Gatinha Original" required
                value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Handle (parâmetro URL) *</label>
              <input className="form-input" placeholder="Ex: gatinha (sem @)" required
                value={form.handle} onChange={e=>setForm(f=>({...f,handle:e.target.value.toLowerCase().replace(/\s/g,'')}))} />
              <span style={{fontSize:11,color:'var(--text-muted)'}}>Deve ser igual ao valor do <code>?influencer=</code> na URL da landing</span>
            </div>
            <div className="form-group">
              <label className="form-label">Link do perfil (Instagram/TikTok)</label>
              <input className="form-input" placeholder="https://instagram.com/..." type="url"
                value={form.link_perfil} onChange={e=>setForm(f=>({...f,link_perfil:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Link da landing page</label>
              <input className="form-input" placeholder="https://..." type="url"
                value={form.link_landing} onChange={e=>setForm(f=>({...f,link_landing:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">URL da foto de perfil</label>
              <input className="form-input" placeholder="https://... (opcional)"
                value={form.foto_url} onChange={e=>setForm(f=>({...f,foto_url:e.target.value}))} />
            </div>
            {err && <div className="alert alert-error" style={{marginTop:0}}>{err}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="loading-spinner" style={{width:14,height:14}}/> : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Card de influenciador ──────────────────────────────────
function InfluencerCard({ inf, metrics, onDelete }) {
  const sessoes   = metrics?.sessoes   || 0
  const marcas    = metrics?.marcas    || 0
  const conversao = sessoes > 0 ? ((marcas / sessoes) * 100).toFixed(1) : '0.0'

  const initial = (inf.nome || inf.handle || '?')[0].toUpperCase()

  return (
    <div className="influencer-card">
      <div
        className="influencer-status-dot"
        title={inf.is_active ? 'Landing ativa' : 'Landing inativa'}
        style={{ background: inf.is_active ? 'var(--accent-green)' : 'var(--accent-red)' }}
      />

      <div className="influencer-card-actions">
        <button className="influencer-action-btn" onClick={() => onDelete(inf.id)} title="Remover">
          <Trash2 size={13}/>
        </button>
      </div>

      <div className="influencer-avatar">
        {inf.foto_url
          ? <img src={inf.foto_url} alt={inf.nome} onError={e=>{e.target.style.display='none'}} />
          : initial
        }
      </div>

      <div className="influencer-name">{inf.nome}</div>
      <div className="influencer-handle">@{inf.handle}</div>

      <div className="influencer-stats">
        <div className="influencer-stat">
          <div className="influencer-stat-value">{sessoes}</div>
          <div className="influencer-stat-label">Acessos</div>
        </div>
        <div className="influencer-stat">
          <div className="influencer-stat-value">{marcas}</div>
          <div className="influencer-stat-label">Marcas</div>
        </div>
        <div className="influencer-stat">
          <div className="influencer-stat-value">{conversao}%</div>
          <div className="influencer-stat-label">Conversão</div>
        </div>
      </div>

      <div className="influencer-links">
        {inf.link_perfil && (
          <a className="influencer-link-btn" href={inf.link_perfil} target="_blank" rel="noopener noreferrer">
            <Instagram size={12}/> Perfil
          </a>
        )}
        {inf.link_landing && (
          <a className="influencer-link-btn" href={inf.link_landing} target="_blank" rel="noopener noreferrer">
            <Globe size={12}/> Landing
          </a>
        )}
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────
export default function Overview() {
  const { isAdmin } = useAuth()
  const [loading, setLoading]       = useState(!_overviewCache)
  const [stats, setStats]           = useState(_overviewCache?.stats    || { leads:0, sessoes:0, eventos:0, conversao:0 })
  const [lineData, setLineData]     = useState(_overviewCache?.lineData || [])
  const [barData, setBarData]       = useState(_overviewCache?.barData  || [])
  const [pieData, setPieData]       = useState(_overviewCache?.pieData  || [])
  const [insights, setInsights]     = useState(_overviewCache?.insights || [])
  const [influencers, setInfluencers] = useState([])
  const [metrics, setMetrics]       = useState({})
  const [modal, setModal]           = useState(false)

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [
        { count: totalLeads },
        { count: totalSessoes },
        { count: totalEventos },
      ] = await Promise.all([
        supabase.from('leads').select('*',    { count:'exact', head:true }),
        supabase.from('sessions').select('*', { count:'exact', head:true }),
        supabase.from('events').select('*',   { count:'exact', head:true }),
      ])

      // Conversão: leads / sessions
      const conversao = totalSessoes > 0 ? ((totalLeads / totalSessoes) * 100).toFixed(1) : '0.0'
      const newStats  = { leads: totalLeads ?? 0, sessoes: totalSessoes ?? 0, eventos: totalEventos ?? 0, conversao }
      setStats(newStats)

      // Leads por dia (14 dias)
      const since14 = new Date(); since14.setDate(since14.getDate() - 14)
      const { data: leadsRaw } = await supabase.from('leads').select('created_at')
        .gte('created_at', since14.toISOString()).order('created_at', { ascending: true })
      const byDay = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date(); d.setDate(d.getDate() - (13 - i))
        byDay[fmtDate(d.toISOString())] = 0
      }
      ;(leadsRaw || []).forEach(r => { const k = fmtDate(r.created_at); if (k in byDay) byDay[k]++ })
      const newLineData = Object.entries(byDay).map(([date, marcas]) => ({ date, marcas }))
      setLineData(newLineData)

      // Tipos de eventos (distribuição)
      const { data: evRaw } = await supabase.from('events').select('evento')
      const evCount = {}
      ;(evRaw || []).forEach(e => { evCount[e.evento] = (evCount[e.evento] || 0) + 1 })
      const newBarData = Object.entries(evCount).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([tipo, qtd]) => ({ tipo, qtd }))
      setBarData(newBarData)

      // Origem das sessões por utm_source (sessions table — fonte correta)
      const { data: sessOrigemRaw } = await supabase.from('sessions').select('utm_source')
      const origCount = {}
      ;(sessOrigemRaw || []).forEach(s => {
        const src = s.utm_source || 'direto'
        origCount[src] = (origCount[src] || 0) + 1
      })
      const newPieData = Object.entries(origCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value]) => ({ name, value }))
      setPieData(newPieData)

      // Insights
      const { data: combosRaw } = await supabase.from('leads').select('combo,influencer')
      const comboCount = {}, influCount = {}
      ;(combosRaw || []).forEach(l => {
        if (l.combo)      comboCount[l.combo]      = (comboCount[l.combo]      || 0) + 1
        if (l.influencer) influCount[l.influencer]  = (influCount[l.influencer] || 0) + 1
      })
      const topCombo = Object.entries(comboCount).sort((a, b) => b[1] - a[1])[0]
      const topInflu = Object.entries(influCount).sort((a, b) => b[1] - a[1])[0]
      const { count: clicksHoje } = await supabase.from('events').select('*', { count:'exact', head:true })
        .eq('evento', 'click_cta').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
      const newInsights = []
      if (topCombo) newInsights.push(`Combo mais popular: "${topCombo[0]}" com ${topCombo[1]} marcas captadas`)
      if (topInflu) newInsights.push(`Influenciador com mais conversões: ${topInflu[0]} (${topInflu[1]} leads)`)
      newInsights.push(`Cliques no CTA hoje: ${clicksHoje ?? 0}`)
      if (conversao > 0) newInsights.push(`Taxa de conversão sessão → marca: ${conversao}%`)
      setInsights(newInsights)

      _overviewCache = { stats: newStats, lineData: newLineData, barData: newBarData, pieData: newPieData, insights: newInsights }
    } catch(err) {
      console.error('[Overview]', err)
    } finally {
      setLoading(false)
    }
  }, [])

  async function loadInfluencers() {
    const { data } = await supabase.from('influencers').select('*').order('created_at', { ascending: false })
    const infs = data || []
    setInfluencers(infs)

    if (infs.length === 0) return

    const handles = infs.map(i => i.handle)
    const [{ data: sessData }, { data: leadData }] = await Promise.all([
      supabase.from('sessions').select('influencer').in('influencer', handles),
      supabase.from('leads').select('influencer').in('influencer', handles),
    ])
    const m = {}
    handles.forEach(h => { m[h] = { sessoes: 0, marcas: 0 } })
    ;(sessData || []).forEach(s => { if (m[s.influencer]) m[s.influencer].sessoes++ })
    ;(leadData || []).forEach(l => { if (m[l.influencer]) m[l.influencer].marcas++ })
    setMetrics(m)
  }

  async function handleDelete(id) {
    if (!confirm('Remover este cadastro?')) return
    await supabase.from('influencers').delete().eq('id', id)
    loadInfluencers()
  }

  useEffect(() => {
    loadData(!_overviewCache)
    loadInfluencers()

    const channel = supabase.channel('overview-rt')
      .on('postgres_changes', { event:'*', schema:'public', table:'leads' },      () => loadData(false))
      .on('postgres_changes', { event:'*', schema:'public', table:'sessions' },   () => loadData(false))
      .on('postgres_changes', { event:'*', schema:'public', table:'events' },     () => loadData(false))
      .on('postgres_changes', { event:'*', schema:'public', table:'influencers' }, () => loadInfluencers())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">Visão</h1>
          <p className="page-subtitle">Performance de todas as landing pages</p>
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => setModal(true)}>
            <Plus size={15}/> Cadastrar
          </button>
        )}
      </div>

      {influencers.length > 0 && (
        <div className="influencer-grid">
          {influencers.map(inf => (
            <InfluencerCard
              key={inf.id}
              inf={inf}
              metrics={metrics[inf.handle]}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner"/>Carregando dados...</div>
      ) : (
        <>
          <div className="stat-cards-grid">
            <StatCard label="Total de Marcas"  value={stats.leads.toLocaleString('pt-BR')}   sub="leads captados"        icon={<Users size={18}/>}            color="--accent-blue"/>
            <StatCard label="Conversão"         value={`${stats.conversao}%`}                 sub="sessão → marca"         icon={<TrendingUp size={18}/>}        color="--accent-green"/>
            <StatCard label="Sessões"           value={stats.sessoes.toLocaleString('pt-BR')} sub="visitas únicas"         icon={<MousePointerClick size={18}/>} color="--accent-yellow"/>
            <StatCard label="Total de Eventos"  value={stats.eventos.toLocaleString('pt-BR')} sub="interações rastreadas"  icon={<Activity size={18}/>}          color="--accent-purple"/>
          </div>

          {insights.length > 0 && (
            <div className="insights-block">
              <div className="insights-title"><Lightbulb size={15} color="var(--accent-yellow)"/>Insights</div>
              <div className="insights-list">
                {insights.map((text, i) => (
                  <div key={i} className="insight-item">
                    <span className="insight-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}/>
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="charts-grid-3">
            <div className="card">
              <div className="card-title">Marcas por Dia</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{top:4,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330"/>
                  <XAxis dataKey="date" tick={{fill:'#64748b',fontSize:11}}/>
                  <YAxis tick={{fill:'#64748b',fontSize:11}} allowDecimals={false}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Line type="monotone" dataKey="marcas" name="Marcas" stroke="#3b82f6" strokeWidth={2} dot={{fill:'#3b82f6',r:3}} activeDot={{r:5}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">Tipos de Eventos</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} layout="vertical" margin={{top:4,right:8,left:8,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" horizontal={false}/>
                  <XAxis type="number" tick={{fill:'#64748b',fontSize:11}}/>
                  <YAxis dataKey="tipo" type="category" tick={{fill:'#94a3b8',fontSize:11}} width={90}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Bar dataKey="qtd" name="Quantidade" fill="#8b5cf6" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="card-title">Origem das Sessões</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:'#1a1d2e',border:'1px solid #1e2330',borderRadius:8,fontSize:12}}/>
                    <Legend iconType="circle" iconSize={8} formatter={v=><span style={{color:'#94a3b8',fontSize:11}}>{v}</span>}/>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{height:220}}>Sem dados de origem</div>
              )}
            </div>
          </div>
        </>
      )}

      {modal && <ModalInfluencer onClose={() => setModal(false)} onSaved={loadInfluencers}/>}
    </div>
  )
}
