import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({ label, value, sub, icon, color = '--accent-blue', delta = null }) {
  const iconBg = `rgba(var(--${color.replace('--', '')}-rgb, 59,130,246), 0.12)`

  // Mapeamento de cor para rgba
  const colorMap = {
    '--accent-blue':   'rgba(59,130,246,0.12)',
    '--accent-green':  'rgba(34,197,94,0.12)',
    '--accent-yellow': 'rgba(245,158,11,0.12)',
    '--accent-red':    'rgba(239,68,68,0.12)',
    '--accent-purple': 'rgba(139,92,246,0.12)',
    '--accent-cyan':   'rgba(6,182,212,0.12)',
    '--accent-orange': 'rgba(249,115,22,0.12)',
  }

  const iconColor = `var(${color})`
  const bgColor   = colorMap[color] || 'rgba(59,130,246,0.12)'

  let deltaEl = null
  if (delta !== null) {
    if (delta > 0) {
      deltaEl = (
        <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:11, fontWeight:600, marginLeft:6, color:'#22c55e' }}>
          <TrendingUp size={13}/> +{delta.toFixed(1)}%
        </span>
      )
    } else if (delta < 0) {
      deltaEl = (
        <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:11, fontWeight:600, marginLeft:6, color:'#ef4444' }}>
          <TrendingDown size={13}/> {delta.toFixed(1)}%
        </span>
      )
    } else {
      deltaEl = (
        <span style={{ display:'inline-flex', alignItems:'center', gap:2, fontSize:11, fontWeight:600, marginLeft:6, color:'#94a3b8' }}>
          → 0%
        </span>
      )
    }
  }

  return (
    <div className="stat-card fade-in">
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value ?? '—'}{deltaEl}</span>
        {sub && <span className="stat-card-sub">{sub}</span>}
      </div>
      {icon && (
        <div
          className="stat-card-icon"
          style={{ background: bgColor, color: iconColor }}
        >
          {icon}
        </div>
      )}
    </div>
  )
}
