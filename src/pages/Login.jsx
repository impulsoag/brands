import React, { useState, useEffect, useRef } from 'react'
import { Zap, Eye, EyeOff, AlertCircle, X, Loader2, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useCountUp } from '../hooks/useCountUp.js'
import { useLiveStats } from '../hooks/useLiveStats.js'
import { supabase } from '../lib/supabase.js'
import './Login.css'

// ── Bokeh Canvas ───────────────────────────────────────────
function BokehCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    const COLORS = ['34,211,238', '139,92,246', '99,102,241', '34,211,238']
    const particles = Array.from({ length: 38 }, () => ({
      x:        Math.random() * canvas.width,
      y:        Math.random() * canvas.height,
      r:        1 + Math.random() * 2.5,
      glow:     12 + Math.random() * 32,
      opacity:  0.12 + Math.random() * 0.4,
      vx:       (Math.random() - 0.5) * 0.22,
      vy:       (Math.random() - 0.5) * 0.22,
      color:    COLORS[Math.floor(Math.random() * COLORS.length)],
    }))

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        // soft glow halo
        const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.glow)
        grd.addColorStop(0, `rgba(${p.color},${p.opacity})`)
        grd.addColorStop(1, `rgba(${p.color},0)`)
        ctx.fillStyle = grd
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.glow, 0, Math.PI * 2)
        ctx.fill()

        // hard center dot
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color},${Math.min(p.opacity * 2.5, 0.95)})`
        ctx.fill()
      })

      animId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className="lp-bokeh" />
}

// ── Stat number with count-up ──────────────────────────────
function StatNum({ value, label, duration, loaded, fmt }) {
  const count = useCountUp(loaded ? value : 0, duration)
  return (
    <div className="lp-stat">
      <div className="lp-stat-val">{loaded ? fmt(count) : '—'}</div>
      <div className="lp-stat-lbl">{label}</div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────
export default function Login() {
  const { signIn } = useAuth()
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [modal,       setModal]       = useState(false)
  const [influencers, setInfluencers] = useState(0)
  const { stats, loaded } = useLiveStats()

  useEffect(() => {
    supabase.from('influencers').select('*', { count: 'exact', head: true })
      .then(({ count }) => setInfluencers(count ?? 0))
  }, [])

  useEffect(() => {
    if (!modal) return
    const onKey = e => { if (e.key === 'Escape') setModal(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const err = await signIn(email, password)
    if (err) setError(err.message || 'E-mail ou senha incorretos.')
    setLoading(false)
  }

  // ×10 trick: useCountUp rounds to int, so multiply for 1 decimal
  const conversaoX10 = loaded && stats.sessoes > 0
    ? Math.round((stats.marcas / stats.sessoes) * 1000)
    : 0

  return (
    <div className="lp-root">
      {/* ── Floating card ── */}
      <div className="lp-card">
        <BokehCanvas />

        <div className="lp-ui">
          {/* top bar */}
          <div className="lp-topbar">
            <div className="lp-logo">
              <div className="lp-logo-icon"><Zap size={16} color="#22d3ee" /></div>
              <span className="lp-logo-text">Brands</span>
            </div>
            <button className="lp-menu-btn" onClick={() => setModal(true)} aria-label="Abrir login">
              <Menu size={20} color="rgba(255,255,255,0.7)" />
            </button>
          </div>

          {/* hero */}
          <div className="lp-hero">
            <div className="lp-badge">
              <span className="lp-badge-dot" /> AO VIVO
            </div>

            <h1 className="lp-headline">
              Inteligência em<br />
              <span className="lp-accent">tempo real</span><br />
              para influenciadores.
            </h1>

            <p className="lp-sub">
              Rastreie sessões, leads e conversões da sua operação.
            </p>

            <button className="lp-cta" onClick={() => setModal(true)}>
              Acessar plataforma
            </button>
          </div>

          {/* stats bottom */}
          <div className="lp-stats-bar">
            <div className="lp-stats-label">Dados ao vivo</div>
            <div className="lp-stats-row">
              <StatNum value={stats.sessoes}  label="Sessões"       duration={1400} loaded={loaded} fmt={n => n.toLocaleString('pt-BR')} />
              <div className="lp-stat-div" />
              <StatNum value={stats.marcas}   label="Leads"         duration={1200} loaded={loaded} fmt={n => n.toLocaleString('pt-BR')} />
              <div className="lp-stat-div" />
              <StatNum value={influencers}    label="Influenciadores" duration={1000} loaded={loaded} fmt={n => n.toLocaleString('pt-BR')} />
              <div className="lp-stat-div" />
              <StatNum value={conversaoX10}   label="Conversão"     duration={1600} loaded={loaded} fmt={n => `${(n / 10).toFixed(1)}%`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal login ── */}
      {modal && (
        <div className="lp-overlay" onClick={() => setModal(false)}>
          <div
            className="lp-modal"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="lp-modal-title"
          >
            <button className="lp-modal-close" onClick={() => setModal(false)} aria-label="Fechar">
              <X size={16} />
            </button>

            <div className="lp-modal-logo">
              <div className="lp-logo-icon"><Zap size={14} color="#22d3ee" /></div>
              <span className="lp-logo-text" style={{ fontSize: 15 }}>Brands</span>
            </div>

            <h2 className="lp-modal-title" id="lp-modal-title">Bem-vindo de volta</h2>
            <p className="lp-modal-sub">Entre com suas credenciais de acesso</p>

            <form onSubmit={handleSubmit} noValidate>
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-email">E-mail</label>
                <input
                  id="lp-email"
                  className="lp-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                />
              </div>

              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-password">Senha</label>
                <div className="lp-input-wrap">
                  <input
                    id="lp-password"
                    className="lp-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPass(p => !p)}
                    tabIndex={-1}
                    aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="lp-error" role="alert">
                  <AlertCircle size={13} /> {error}
                </div>
              )}

              <button className="lp-submit" type="submit" disabled={loading}>
                {loading
                  ? <><Loader2 size={15} className="lp-spinner" /> Entrando...</>
                  : 'Entrar'
                }
              </button>
            </form>

            <div className="lp-modal-links">
              <a href="#" className="lp-link">Esqueceu a senha?</a>
              <span>·</span>
              <a href="mailto:suporte.impulsoag@gmail.com" className="lp-link">Entre em contato</a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
