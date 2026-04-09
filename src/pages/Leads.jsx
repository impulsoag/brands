import React, { useEffect, useState, useCallback } from 'react'
import { Users, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const STATUS_OPTIONS = ['Novo Lead', 'Em Contato', 'Em Negociação', 'Fechado']

const statusClass = {
  'Novo Lead':      'status-novo-lead',
  'Em Contato':     'status-em-contato',
  'Em Negociação':  'status-negociacao',
  'Fechado':        'status-fechado',
}

// Situação auto-calculada pela idade do lead
function getSituacao(createdAt) {
  const dias = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
  if (dias >= 14) return { label: 'Urgente', cls: 'situacao-urgente' }
  if (dias >= 7)  return { label: 'Alerta',  cls: 'situacao-alerta'  }
  return               { label: 'Novo',    cls: 'situacao-novo'    }
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function fmtTelefone(num) {
  if (!num) return '—'
  const digits = String(num).replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`
  return num
}

const _cache = {}

export default function Leads() {
  const [fPeriod, setFPeriod]         = useState('30')
  const cached                        = _cache[fPeriod]
  const [leads, setLeads]             = useState(cached?.leads || [])
  const [filtered, setFiltered]       = useState(cached?.leads || [])
  const [loading, setLoading]         = useState(!cached)
  const [updating, setUpdating]       = useState(null)
  const [fInfluencer, setFInfluencer] = useState('')
  const [fStatus, setFStatus]         = useState('')
  const [fDevice, setFDevice]         = useState('')
  const [optInfluencers, setOptInfluencers] = useState(cached?.optInfluencers || [])

  const loadLeads = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const since = new Date()
      since.setDate(since.getDate() - Number(fPeriod))
      const { data, error } = await supabase
        .from('leads').select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error

      const rows = data || []
      setLeads(rows)
      const infs = [...new Set(rows.map(l=>l.influencer).filter(Boolean))]
      setOptInfluencers(infs)
      _cache[fPeriod] = { leads: rows, optInfluencers: infs }
    } catch(err) {
      console.error('[Leads]', err)
    } finally {
      setLoading(false)
    }
  }, [fPeriod])

  useEffect(() => {
    loadLeads(!_cache[fPeriod])
    const ch = supabase.channel('leads-rt')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'leads' }, ({ new: row }) => {
        setLeads(prev => [row, ...prev])
      })
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'leads' }, ({ new: row }) => {
        setLeads(prev => prev.map(l => l.id===row.id ? row : l))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadLeads])

  useEffect(() => {
    let list = leads
    if (fInfluencer) list = list.filter(l => l.influencer === fInfluencer)
    if (fStatus)     list = list.filter(l => l.status === fStatus)
    if (fDevice)     list = list.filter(l => (l.device_type||'').toLowerCase() === fDevice)
    setFiltered(list)
  }, [leads, fInfluencer, fStatus, fDevice])

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este lead?')) return
    try {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
      setLeads(prev => prev.filter(l => l.id !== id))
    } catch(err) {
      console.error('[Leads] delete', err)
      alert('Erro ao excluir o lead. Tente novamente.')
    }
  }

  async function handleStatusChange(id, newStatus) {
    setUpdating(id)
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', id)
      if (error) throw error
      setLeads(prev => prev.map(l => l.id===id ? { ...l, status: newStatus } : l))
    } catch(err) {
      console.error('[Leads] status', err)
    } finally {
      setUpdating(null)
    }
  }

  // Contadores de situação
  const counts = { Novo: 0, Alerta: 0, Urgente: 0 }
  leads.forEach(l => { counts[getSituacao(l.created_at).label]++ })

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 className="page-title">Marcas</h1>
          <p className="page-subtitle">{filtered.length} marcas exibidas</p>
        </div>
        {/* Situação summary */}
        <div style={{ display:'flex', gap:8 }}>
          <span className={`badge situacao-novo`}>{counts.Novo} Novos</span>
          {counts.Alerta  > 0 && <span className="badge situacao-alerta">{counts.Alerta} Alerta</span>}
          {counts.Urgente > 0 && <span className="badge situacao-urgente">{counts.Urgente} Urgente</span>}
        </div>
      </div>

      {/* Filtros */}
      <div className="filters-bar">
        <span className="filters-label">Filtros:</span>

        <select className="filter-select" value={fPeriod} onChange={e=>setFPeriod(e.target.value)}>
          <option value="7">Últimos 7 dias</option>
          <option value="14">Últimos 14 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
          <option value="365">Último ano</option>
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

        <select className="filter-select" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map(v=><option key={v} value={v}>{v}</option>)}
        </select>

        {(fInfluencer||fStatus||fDevice) && (
          <button onClick={()=>{setFInfluencer('');setFStatus('');setFDevice('')}}
            style={{background:'none',border:'none',color:'var(--accent-red)',cursor:'pointer',fontSize:12,fontFamily:'var(--font-sans)'}}>
            Limpar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-state"><div className="loading-spinner"/>Carregando marcas...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Users size={28} color="var(--text-muted)"/>Nenhuma marca encontrada</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nome da Marca</th>
                <th>Número</th>
                <th>Influenciador</th>
                <th>Origem</th>
                <th>Situação</th>
                <th>Data</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, idx) => {
                const sit = getSituacao(lead.created_at)
                return (
                  <tr key={lead.id}>
                    <td className="text-muted text-small">{idx+1}</td>
                    <td className="td-primary">{lead.nome || <span className="text-muted">—</span>}</td>
                    <td className="td-mono">{fmtTelefone(lead.numero)}</td>
                    <td>{lead.influencer || <span className="text-muted">—</span>}</td>
                    <td>
                      {lead.device_type
                        ? <span className={`badge ${lead.device_type.toLowerCase()==='mobile' ? 'badge-blue' : 'badge-purple'}`}>{lead.device_type}</span>
                        : lead.origem
                          ? <span className="badge badge-cyan">{lead.origem}</span>
                          : <span className="text-muted">—</span>
                      }
                    </td>
                    <td><span className={`badge ${sit.cls}`}>{sit.label}</span></td>
                    <td className="text-muted text-small">{fmtDate(lead.created_at)}</td>
                    <td>
                      <select
                        className={`status-select ${statusClass[lead.status] || 'status-novo-lead'}`}
                        value={lead.status || 'Novo Lead'}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                        disabled={updating === lead.id}
                      >
                        {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#ef4444', padding: '4px 6px', borderRadius: 'var(--radius-sm)',
                          display: 'flex', alignItems: 'center', transition: 'color .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#dc2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ef4444'}
                        title="Excluir lead"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
