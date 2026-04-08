import React, { useState } from 'react'
import { Settings, User, Key, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Configuracoes() {
  const { user, profile } = useAuth()
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState(null)

  async function handleChangePassword(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: 'Senha alterada com sucesso.' }); setNewPassword('') }
    setSaving(false)
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie sua conta e preferências</p>
      </div>

      <div style={{ display: 'grid', gap: 16, maxWidth: 540 }}>
        {/* Info da conta */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={16} color="var(--accent-blue)" /> Minha Conta
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Nome</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{profile?.nome || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>E-mail</div>
              <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>{user?.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Papel</div>
              {profile?.role === 'admin'
                ? <span className="badge badge-purple">Admin</span>
                : <span className="badge badge-gray">Viewer</span>
              }
            </div>
          </div>
        </div>

        {/* Alterar senha */}
        <div className="card">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={16} color="var(--accent-yellow)" /> Alterar Senha
          </div>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Nova senha</label>
              <input
                className="form-input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required minLength={6}
              />
            </div>
            {msg && (
              <div className={`alert alert-${msg.type}`}>
                {msg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {msg.text}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
              {saving ? <span className="loading-spinner" style={{ width: 14, height: 14 }} /> : 'Salvar senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
