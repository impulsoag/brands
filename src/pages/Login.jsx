import React, { useState, useEffect, useRef } from 'react'
import { Zap, Eye, EyeOff, AlertCircle, X, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useCountUp } from '../hooks/useCountUp.js'
import { useLiveStats } from '../hooks/useLiveStats.js'
import { supabase } from '../lib/supabase.js'
import './Login.css'

function ParticleCanvas() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let animId

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const particles = Array.from({ length: 80 }, () => {
      const speed = 0.3 + Math.random() * 0.3
      const angle = Math.random() * Math.PI * 2
      return {
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      }
    })

    const onMove = e => { mouseRef.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', onMove)

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const { x: mx, y: my } = mouseRef.current

      particles.forEach(p => {
        const dx = mx - p.x
        const dy = my - p.y
        const d  = Math.sqrt(dx * dx + dy * dy)
        if (d < 150 && d > 0) {
          p.vx += (dx / d) * 0.02
          p.vy += (dy / d) * 0.02
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          if (spd > 2) { p.vx = (p.vx / spd) * 2; p.vy = (p.vy / spd) * 2 }
        }

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > canvas.width)  p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(37,15,239,0.7)'
        ctx.fill()
      })

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(37,15,239,${(1 - d / 120).toFixed(3)})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      animId = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="lp-canvas" />
}

function StatNum({ value, label, duration, loaded, fmt }) {
  const count = useCountUp(loaded ? value : 0, duration)
  return (
    <div className="lp-stat">
      <div className="lp-stat-val">{loaded ? fmt(count) : '—'}</div>
      <div className="lp-stat-lbl">{label}</div>
    </div>
  )
}

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

  // Multiply by 10 so useCountUp (integers only) preserves one decimal place
  const conversaoX10 = loaded && stats.sessoes > 0
    ? Math.round((stats.marcas / stats.sessoes) * 1000)
    : 0

  return (
    <div className="lp-root">
      <ParticleCanvas />

      <div className="lp-ui">
        {/* Logo */}
        <div className="lp-logo">
          <div className="lp-logo-icon"><Zap size={18} color="#fff" /></div>
          <span className="lp-logo-text">Brands</span>
        </div>

        {/* Login button */}
        <button className="lp-login-btn" onClick={() => setModal(true)}>
          Entrar
        </button>

        {/* Hero */}
        <div className="lp-hero">
          <div className="lp-badge">
            <span className="lp-badge-dot" /> AO VIVO
          </div>

          <h1 className="lp-headline">
            Inteligência em <span className="lp-accent">tempo real</span><br />
            para influenciadores.
          </h1>

          <p className="lp-sub">
            Rastreie sessões, leads e conversões da sua operação — tudo em um só lugar.
          </p>

          <div className="lp-stats">
            <StatNum
              value={stats.sessoes}  label="Sessões Totais"    duration={1400}
              loaded={loaded}        fmt={n => n.toLocaleString('pt-BR')}
            />
            <StatNum
              value={stats.marcas}   label="Leads Captados"    duration={1200}
              loaded={loaded}        fmt={n => n.toLocaleString('pt-BR')}
            />
            <StatNum
              value={influencers}    label="Influenciadores"   duration={1000}
              loaded={loaded}        fmt={n => n.toLocaleString('pt-BR')}
            />
            <StatNum
              value={conversaoX10}   label="Taxa de Conversão" duration={1600}
              loaded={loaded}        fmt={n => `${(n / 10).toFixed(1)}%`}
            />
          </div>
        </div>

        <p className="lp-footer">Acesso restrito · Brands © 2025</p>
      </div>

      {/* Modal */}
      {modal && (
        <div className="lp-overlay" onClick={() => setModal(false)}>
          <div className="lp-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="lp-modal-title">
            <button className="lp-modal-close" onClick={() => setModal(false)} aria-label="Fechar">
              <X size={18} />
            </button>

            <div className="lp-modal-header">
              <h2 className="lp-modal-title" id="lp-modal-title">Bem-vindo de volta</h2>
              <p className="lp-modal-sub">Entre com suas credenciais</p>
            </div>

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
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
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
