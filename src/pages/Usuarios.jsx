import React, { useEffect, useState } from 'react'
import { UserPlus, Shield, Eye, Trash2, X, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Usuarios() {
  const { isAdmin } = useAuth()
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [form, setForm]         = useState({ nome: '', email: '', password: '', role: 'viewer' })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState(null) // { type: 'success'|'error', text }

  async function loadProfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setProfiles(data || [])
    setLoading(false)
  }

  useEffect(() => { loadProfiles() }, [])

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { nome: form.nome, role: form.role } },
      })
      if (error) throw error

      // Se email confirmation estiver desabilitado, o usuário já vem criado
      // Caso contrário, ele receberá um email
      setMsg({ type: 'success', text: 'Usuário criado. Se confirmação de e-mail estiver ativa, o usuário receberá um e-mail.' })
      setForm({ nome: '', email: '', password: '', role: 'viewer' })
      setModal(false)
      setTimeout(loadProfiles, 1000)
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Erro ao criar usuário.' })
    } finally {
      setSaving(false)
    }
  }

  function fmtDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  if (!isAdmin) {
    return (
      <div className="page-container fade-in">
        <div className="empty-state" style={{ paddingTop: 80 }}>
          <Shield size={32} color="var(--accent-red)" />
          <span style={{ marginTop: 12 }}>Acesso restrito a administradores</span>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">{profiles.length} usuários com acesso ao painel</p>
        </div>
        <button className="btn-primary" onClick={() => { setModal(true); setMsg(null) }}>
          <UserPlus size={15} />
          Novo Usuário
        </button>
      </div>

      {msg && (
        <div className={`alert alert-${msg.type}`}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="loading-state"><div className="loading-spinner" />Carregando...</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td className="td-primary">{p.nome || '—'}</td>
                  <td>{p.email || '—'}</td>
                  <td>
                    {p.role === 'admin'
                      ? <span className="badge badge-purple"><Shield size={10} /> Admin</span>
                      : <span className="badge badge-gray"><Eye size={10} /> Viewer</span>
                    }
                  </td>
                  <td className="text-muted text-small">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar usuário */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Novo Usuário</span>
              <button className="modal-close" onClick={() => setModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome</label>
                  <input className="form-input" type="text" placeholder="Nome do usuário"
                    value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" placeholder="email@exemplo.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha temporária</label>
                  <input className="form-input" type="password" placeholder="Mínimo 6 caracteres"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
                </div>
                <div className="form-group">
                  <label className="form-label">Papel</label>
                  <select className="form-input" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="viewer">Viewer (só leitura)</option>
                    <option value="admin">Admin (acesso total)</option>
                  </select>
                </div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Dica: para criar usuários sem confirmação de e-mail, desabilite "Email Confirmations" no Supabase Auth → Settings.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
