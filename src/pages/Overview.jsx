import React, { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Users, MousePointerClick, Activity, TrendingUp,
  Lightbulb,
} from 'lucide-react'
import StatCard from '../components/StatCard.jsx'
import { supabase } from '../lib/supabase.js'

// Cores para o PieChart
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

// Formata data para exibição no gráfico (dd/MM)
function fmtDate(iso) {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

// Tooltip personalizado para os gráficos
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1d2e', border: '1px solid #1e2330',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#e2e8f0', fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function Overview() {
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState({ leads: 0, sessoes: 0, eventos: 0, conversao: 0 })
  const [lineData, setLineData] = useState([])
  const [barData, setBarData]   = useState([])
  const [pieData, setPieData]   = useState([])
  const [insights, setInsights] = useState([])

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      // ── Contagens gerais ──────────────────────────────────────────
      const [
        { count: totalLeads },
        { count: totalSessoes },
        { count: totalEventos },
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
      ])

      // Conversão = leads / sessões * 100
      const conversao = totalSessoes > 0
        ? ((totalLeads / totalSessoes) * 100).toFixed(1)
        : '0.0'

      setStats({
        leads: totalLeads ?? 0,
        sessoes: totalSessoes ?? 0,
        eventos: totalEventos ?? 0,
        conversao,
      })

      // ── Leads por dia (últimos 14 dias) ───────────────────────────
      const since = new Date()
      since.setDate(since.getDate() - 14)

      const { data: leadsRaw } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: true })

      // Agrupa por data
      const byDay = {}
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - (13 - i))
        byDay[fmtDate(d.toISOString())] = 0
      }
      ;(leadsRaw || []).forEach(r => {
        const key = fmtDate(r.created_at)
        if (key in byDay) byDay[key]++
      })

      setLineData(Object.entries(byDay).map(([date, marcas]) => ({ date, marcas })))

      // ── Tipos de eventos (top 8) ──────────────────────────────────
      const { data: eventsRaw } = await supabase
        .from('events')
        .select('evento')

      const evCount = {}
      ;(eventsRaw || []).forEach(e => {
        evCount[e.evento] = (evCount[e.evento] || 0) + 1
      })
      const sorted = Object.entries(evCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tipo, qtd]) => ({ tipo, qtd }))
      setBarData(sorted)

      // ── Origem dos cliques (PieChart) ─────────────────────────────
      const { data: origensRaw } = await supabase
        .from('events')
        .select('utm_source')
        .eq('evento', 'cta_click')

      const origCount = {}
      ;(origensRaw || []).forEach(e => {
        const src = e.utm_source || 'direto'
        origCount[src] = (origCount[src] || 0) + 1
      })
      setPieData(
        Object.entries(origCount).map(([name, value]) => ({ name, value }))
      )

      // ── Insights dinâmicos ────────────────────────────────────────
      const { data: combosRaw } = await supabase
        .from('leads')
        .select('combo, influencer')

      const comboCount = {}
      const influCount = {}
      ;(combosRaw || []).forEach(l => {
        if (l.combo) comboCount[l.combo] = (comboCount[l.combo] || 0) + 1
        if (l.influencer) influCount[l.influencer] = (influCount[l.influencer] || 0) + 1
      })

      const topCombo   = Object.entries(comboCount).sort((a,b) => b[1]-a[1])[0]
      const topInflu   = Object.entries(influCount).sort((a,b) => b[1]-a[1])[0]
      const { count: clicksHoje } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('evento', 'cta_click')
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())

      const insightsList = []
      if (topCombo)
        insightsList.push(`Combo mais popular: "${topCombo[0]}" com ${topCombo[1]} marcas captadas`)
      if (topInflu)
        insightsList.push(`Influenciador com mais conversões: ${topInflu[0]} (${topInflu[1]} leads)`)
      insightsList.push(`Cliques no CTA hoje: ${clicksHoje ?? 0}`)
      if (conversao > 0)
        insightsList.push(`Taxa de conversão sessão → marca: ${conversao}%`)

      setInsights(insightsList)
    } catch (err) {
      console.error('[Overview] Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Realtime: re-busca os dados agregados sem mostrar loading spinner
    const channel = supabase
      .channel('overview-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },    () => loadData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => loadData(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' },   () => loadData(false))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  return (
    <div className="page-container fade-in">
      {/* Cabeçalho */}
      <div className="page-header">
        <h1 className="page-title">Visão Geral</h1>
        <p className="page-subtitle">Resumo de performance de todas as landing pages</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Carregando dados...
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="stat-cards-grid">
            <StatCard
              label="Total de Marcas"
              value={stats.leads.toLocaleString('pt-BR')}
              sub="leads captados"
              icon={<Users size={18} />}
              color="--accent-blue"
            />
            <StatCard
              label="Conversão"
              value={`${stats.conversao}%`}
              sub="sessão → marca"
              icon={<TrendingUp size={18} />}
              color="--accent-green"
            />
            <StatCard
              label="Sessões"
              value={stats.sessoes.toLocaleString('pt-BR')}
              sub="visitas únicas"
              icon={<MousePointerClick size={18} />}
              color="--accent-yellow"
            />
            <StatCard
              label="Total de Eventos"
              value={stats.eventos.toLocaleString('pt-BR')}
              sub="interações rastreadas"
              icon={<Activity size={18} />}
              color="--accent-purple"
            />
          </div>

          {/* ── Insights ── */}
          {insights.length > 0 && (
            <div className="insights-block">
              <div className="insights-title">
                <Lightbulb size={15} color="var(--accent-yellow)" />
                Insights do Período
              </div>
              <div className="insights-list">
                {insights.map((text, i) => (
                  <div key={i} className="insight-item">
                    <span
                      className="insight-dot"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Gráficos ── */}
          <div className="charts-grid-3">
            {/* LineChart — Marcas por Dia */}
            <div className="card">
              <div className="card-title">Marcas por Dia</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lineData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone" dataKey="marcas" name="Marcas"
                    stroke="#3b82f6" strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* BarChart — Tipos de Eventos */}
            <div className="card">
              <div className="card-title">Tipos de Eventos</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2330" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis dataKey="tipo" type="category" tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qtd" name="Quantidade" fill="#8b5cf6" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* PieChart — Origem dos Cliques */}
            <div className="card">
              <div className="card-title">Origem dos Cliques</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#1a1d2e', border: '1px solid #1e2330',
                        borderRadius: 8, fontSize: 12,
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ height: 220 }}>
                  Sem dados de cliques
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
