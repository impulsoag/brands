import React, { useState } from 'react'
import { Zap, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useCountUp } from '../hooks/useCountUp.js'
import { useLiveStats } from '../hooks/useLiveStats.js'
import './Login.css'

function StatItem({ value, label, duration }) {
  const count = useCountUp(value, duration)
  return (
    <div className="login-stat">
      <span className="login-stat-value">{count.toLocaleString('pt-BR')}</span>
      <span className="login-stat-label">{label}</span>
    </div>
  )
}

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { stats, loaded } = useLiveStats()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(email, password)
    if (err) setError(err.message || 'E-mail ou senha incorretos.')
    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* ── Brand Area ── */}
      <div className="login-brand">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />
        <div className="login-grid-pattern" />

        <div className="login-brand-content">
          <div className="login-brand-logo">
            <div className="login-brand-logo-icon">
              <Zap size={26} color="#250fef" />
            </div>
            <span className="login-brand-logo-text">Brands</span>
          </div>

          <div className="login-brand-center">
            <h1 className="login-brand-headline">
              Ecossistema inteligente para influenciadores.
            </h1>
            <p className="login-brand-sub">
              Plataforma completa para captação de marcas, análise de
              dados e gerenciamento de leads em um só lugar.
            </p>
          </div>

          <div className="login-stats-card">
            <div className="login-stats-live">
              <span className="login-stats-live-dot" />
              <span className="login-stats-live-text">AO VIVO</span>
            </div>
            <div className="login-stats-grid">
              <StatItem value={loaded ? stats.sessoes : 0} label="Sessões totais" duration={1400} />
              <div className="login-stat-divider" />
              <StatItem value={loaded ? stats.eventos : 0} label="Eventos totais" duration={1600} />
              <div className="login-stat-divider" />
              <StatItem value={loaded ? stats.marcas  : 0} label="Leads captados" duration={1200} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Area ── */}
      <div className="login-form-area">
        <div className="login-mobile-logo">
          <div className="login-mobile-logo-icon">
            <Zap size={18} color="#250fef" />
          </div>
          <span className="login-mobile-logo-text">Brands</span>
        </div>

        <div className="login-form-inner">
          <div className="login-form-header">
            <h2 className="login-form-title">Bem-vindo de volta</h2>
            <p className="login-form-subtitle">Entre na sua conta para continuar</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-field">
              <label className="login-label">E-mail</label>
              <input
                className={`login-input${error ? ' login-input--error' : ''}`}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="login-label">Senha</label>
              <div className="login-input-wrapper">
                <input
                  className={`login-input${error ? ' login-input--error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-eye"
                  onClick={() => setShowPass(p => !p)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-forgot">
              <a href="#" className="login-forgot-link">Esqueceu a senha?</a>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading
                ? <><Loader2 size={16} className="login-btn-spinner" /> Entrando...</>
                : <>Entrar <ArrowRight size={16} /></>
              }
            </button>
          </form>

          <p className="login-footer">
            Não tem uma conta?{' '}
            <a href="mailto:suporte.impulsoag@gmail.com" className="login-footer-link">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
