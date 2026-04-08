import React from 'react'

/**
 * StatCard — card reutilizável de métrica
 *
 * Props:
 *  label  {string}      — título da métrica
 *  value  {string|number} — valor principal
 *  sub    {string}      — texto auxiliar opcional
 *  icon   {ReactNode}   — ícone Lucide (já instanciado)
 *  color  {string}      — variável CSS de cor (ex: '--accent-blue')
 */
export default function StatCard({ label, value, sub, icon, color = '--accent-blue' }) {
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

  return (
    <div className="stat-card fade-in">
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-value">{value ?? '—'}</span>
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
