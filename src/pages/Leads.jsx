import React, { useEffect, useState, useCallback } from 'react'
import { Users, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

// Opções de status disponíveis
const STATUS_OPTIONS = ['Nova', 'Contatado', 'Fechado', 'Perdido']

// Mapeamento de status para classe CSS
const statusClass = {
  Nova:       'status-nova',
  Contatado:  'status-contatado',
  Fechado:    'status-fechado',
  Perdido:    'status-perdido',
}

// Badge de intenção
function IntentBadge({ value }) {
  if (!value) return <span className="text-muted">—</span>
  return <span className="badge badge-purple">{value}</span>
}

// Formata data para pt-BR
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Leads() {
  const [leads, setLeads]             = useState([])
  const [filtered, setFiltered]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [updating, setUpdating]       = useState(null) // id do lead sendo atualizado

  // Filtros
  const [fInfluencer, setFInfluencer] = useState('')
  const [fCombo, setFCombo]           = useState('')
  const [fOrigin, setFOrigin]         = useState('')
  const [fStatus, setFStatus]         = useState('')
  const [fPeriod, setFPeriod]         = useState('30')

  // Opções únicas para os filtros
  const [optInfluencers, setOptInfluencers] = useState([])
  const [optCombos, setOptCombos]           = useState([])
  const [optOrigins, setOptOrigins]         = useState([])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - Number(fPeriod))

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error

      setLeads(data || [])

      // Extrair opções únicas para os filtros
      const influencers = [...new Set((data || []).map(l => l.influencer).filter(Boolean))]
      const combos      = [...new Set((data || []).map(l => l.combo).filter(Boolean))]
      const origins     = [...new Set((data || []).map(l => l.origem).filter(Boolean))]
      setOptInfluencers(influencers)
      setOptCombos(combos)
      setOptOrigins(origins)
    } catch (err) {
      console.error('[Leads] Erro ao carregar:', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => { loadLeads() }, [loadLeads])

  // Aplica filtros locais
  useEffect(() => {
    let list = leads
    if (fInfluencer) list = list.filter(l => l.influencer === fInfluencer)
    if (fCombo)      list = list.filter(l => l.combo === fCombo)
    if (fOrigin)     list = list.filter(l => l.origem === fOrigin)
    if (fStatus)     list = list.filter(l => l.status === fStatus)
    setFiltered(list)
  }, [leads, fInfluencer, fCombo, fOrigin, fStatus])

  // Atualiza status inline no Supabase
  async function handleStatusChange(id, newStatus) {
    setUpdating(id)
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error

      // Atualiza localmente sem recarregar tudo
      setLeads(prev =>
        prev.map(l => l.id === id ? { ...l, status: newStatus } : l)
      )
    } catch (err) {
      console.error('[Leads] Erro ao atualizar status:', err)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="page-container fade-in">
      {/* Cabeçalho */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Marcas Captadas</h1>
          <p className="page-subtitle">
            {filtered.length} marcas exibidas
          </p>
        </div>
        <button
          onClick={loadLeads}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '7px 12px',
            color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
            fontFamily: 'var(--font-sans)',
          }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <span className="filters-label">Filtros:</span>

        <select
          className="filter-select"
          value={fPeriod}
          onChange={e => setFPeriod(e.target.value)}
        >
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
        </select>

        <select
          className="filter-select"
          value={fInfluencer}
          onChange={e => setFInfluencer(e.target.value)}
        >
          <option value="">Todos os influenciadores</option>
          {optInfluencers.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="filter-select"
          value={fCombo}
          onChange={e => setFCombo(e.target.value)}
        >
          <option value="">Todos os combos</option>
          {optCombos.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="filter-select"
          value={fOrigin}
          onChange={e => setFOrigin(e.target.value)}
        >
          <option value="">Todas as origens</option>
          {optOrigins.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        <select
          className="filter-select"
          value={fStatus}
          onChange={e => setFStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>

        {(fInfluencer || fCombo || fOrigin || fStatus) && (
          <button
            onClick={() => { setFInfluencer(''); setFCombo(''); setFOrigin(''); setFStatus('') }}
            style={{
              background: 'none', border: 'none', color: 'var(--accent-red)',
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          Carregando marcas...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Users size={28} color="var(--text-muted)" />
          Nenhuma marca encontrada
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome da Marca</th>
                <th>Número</th>
                <th>Influenciador</th>
                <th>Combo</th>
                <th>Origem</th>
                <th>Intenção</th>
                <th>Data</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, idx) => (
                <tr key={lead.id}>
                  <td className="text-muted text-small">{idx + 1}</td>
                  <td className="td-primary">{lead.nome || <span className="text-muted">—</span>}</td>
                  <td className="td-mono">{lead.numero || '—'}</td>
                  <td>{lead.influencer || <span className="text-muted">—</span>}</td>
                  <td>
                    {lead.combo
                      ? <span className="badge badge-blue">{lead.combo}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td>
                    {lead.origem
                      ? <span className="badge badge-cyan">{lead.origem}</span>
                      : <span className="text-muted">—</span>
                    }
                  </td>
                  <td><IntentBadge value={lead.intencao} /></td>
                  <td className="text-muted text-small">{fmtDate(lead.created_at)}</td>
                  <td>
                    <select
                      className={`status-select ${statusClass[lead.status] || 'status-nova'}`}
                      value={lead.status || 'Nova'}
                      onChange={e => handleStatusChange(lead.id, e.target.value)}
                      disabled={updating === lead.id}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
