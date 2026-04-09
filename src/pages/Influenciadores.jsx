import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X, Instagram, Globe, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function extractHandle(url) {
  if (!url) return ''
  const match = url.match(/instagram\.com\/([^/?#]+)/)
  return match ? match[1].replace('@', '') : ''
}

async function checkLandpageStatus(url) {
  if (!url) return 'inativa'
  try {
    await fetch(url, { mode: 'no-cors', cache: 'no-store' })
    return 'ativa'
  } catch {
    return 'inativa'
  }
}

function ModalCadastrar({ onClose, onSaved }) {
  const [form, setForm] = useState({ nome: '', instagram_url: '', landpage_url: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr('')
    const handle = extractHandle(form.instagram_url) || form.nome.toLowerCase().replace(/\s+/g, '_')
    const { error } = await supabase.from('influencers').insert([{
      nome: form.nome,
      handle,
      link_perfil: form.instagram_url || null,
      link_landing: form.landpage_url || null,
    }])
    if (error) { setErr(error.message); setSaving(false); return }
    onSaved()
    onClose()
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.6)', zIndex: 9998,
      }} />

      {/* Modal container */}
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        width: '100%', maxWidth: 480,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-modal)',
      }}>
        <div className="modal-header">
          <span className="modal-title">Cadastrar Influenciador</span>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {err && <div style={{ color: 'var(--accent-red)', fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input className="form-input" placeholder="Nome do influenciador" required
                value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Instagram URL</label>
              <input className="form-input" type="url" placeholder="https://instagram.com/username"
                value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Landpage URL</label>
              <input className="form-input" type="url" placeholder="https://..."
                value={form.landpage_url} onChange={e => setForm(f => ({ ...f, landpage_url: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  )
}

export default function Influenciadores() {
  const [influencers, setInfluencers] = useState([])
  const [metrics, setMetrics] = useState({})
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const intervalRef = useRef(null)

  async function loadData() {
    const [{ data: infs }, { data: sessions }, { data: leads }] = await Promise.all([
      supabase.from('influencers').select('*').order('created_at', { ascending: false }),
      supabase.from('sessions').select('influencer'),
      supabase.from('leads').select('influencer'),
    ])

    const list = infs || []
    setInfluencers(list)

    const map = {}
    for (const s of sessions || []) {
      const h = s.influencer
      if (h) { if (!map[h]) map[h] = { sessions: 0, leads: 0 }; map[h].sessions++ }
    }
    for (const l of leads || []) {
      const h = l.influencer
      if (h) { if (!map[h]) map[h] = { sessions: 0, leads: 0 }; map[h].leads++ }
    }
    setMetrics(map)
    setLoading(false)
    return list
  }

  function checkAllStatuses(infs) {
    if (!infs?.length) return
    setStatuses(prev => {
      const next = { ...prev }
      for (const inf of infs) next[inf.id] = 'verificando'
      return next
    })
    for (const inf of infs) {
      checkLandpageStatus(inf.link_landing).then(status =>
        setStatuses(prev => ({ ...prev, [inf.id]: status }))
      )
    }
  }

  useEffect(() => {
    loadData().then(infs => {
      checkAllStatuses(infs)
      intervalRef.current = setInterval(() => {
        loadData().then(checkAllStatuses)
      }, 24 * 60 * 60 * 1000)
    })
    return () => clearInterval(intervalRef.current)
  }, [])

  function getMetrics(handle) {
    const m = metrics[handle] || { sessions: 0, leads: 0 }
    const pct = m.sessions > 0 ? ((m.leads / m.sessions) * 100).toFixed(1) : '0.0'
    return { ...m, pct }
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Influenciadores</h1>
          <p className="page-subtitle">{influencers.length} cadastrado{influencers.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Cadastrar
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="loading-spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : influencers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Nenhum influenciador cadastrado
        </div>
      ) : (
        <div className="influencer-grid">
          {influencers.map(inf => {
            const m = getMetrics(inf.handle)
            const igHandle = extractHandle(inf.link_perfil) || inf.handle
            const status = statuses[inf.id]

            return (
              <div key={inf.id} className="influencer-card">
                {/* Status da landpage */}
                <div style={{ position: 'absolute', top: 14, right: 14 }}>
                  {status === 'verificando' ? (
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <div className="loading-spinner" style={{ width: 10, height: 10, border: '1.5px solid var(--border)', borderTopColor: 'var(--accent-blue)' }} />
                      Verificando
                    </span>
                  ) : status === 'ativa' ? (
                    <span style={{ fontSize: 10, color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <CheckCircle size={10} /> Ativa
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <XCircle size={10} /> Inativa
                    </span>
                  )}
                </div>

                {/* Avatar */}
                <div className="influencer-avatar">
                  {inf.foto_url
                    ? <img src={inf.foto_url} alt={inf.nome} onError={e => { e.currentTarget.style.display = 'none' }} />
                    : inf.nome[0].toUpperCase()
                  }
                </div>

                <div className="influencer-name">{inf.nome}</div>
                <div className="influencer-handle">@{igHandle}</div>

                {/* Métricas */}
                <div className="influencer-stats">
                  <div className="influencer-stat">
                    <div className="influencer-stat-value">{m.sessions.toLocaleString('pt-BR')}</div>
                    <div className="influencer-stat-label">Acessos</div>
                  </div>
                  <div className="influencer-stat">
                    <div className="influencer-stat-value">{m.leads.toLocaleString('pt-BR')}</div>
                    <div className="influencer-stat-label">Conversões</div>
                  </div>
                  <div className="influencer-stat">
                    <div className="influencer-stat-value">{m.pct}%</div>
                    <div className="influencer-stat-label">Conv. %</div>
                  </div>
                </div>

                {/* Links */}
                <div className="influencer-links">
                  {inf.link_perfil && (
                    <a className="influencer-link-btn" href={inf.link_perfil} target="_blank" rel="noreferrer">
                      <Instagram size={12} /> Instagram
                    </a>
                  )}
                  {inf.link_landing && (
                    <a className="influencer-link-btn" href={inf.link_landing} target="_blank" rel="noreferrer">
                      <Globe size={12} /> Landpage
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <ModalCadastrar onClose={() => setShowModal(false)} onSaved={loadData} />}
    </div>
  )
}
