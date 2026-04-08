import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Activity,
  MonitorSmartphone,
  Zap,
} from 'lucide-react'

// Links de navegação principal
const NAV_LINKS = [
  { to: '/overview', label: 'Visão Geral',  Icon: LayoutDashboard },
  { to: '/leads',    label: 'Marcas',        Icon: Users },
  { to: '/events',   label: 'Eventos',       Icon: Activity },
  { to: '/sessions', label: 'Sessões',       Icon: MonitorSmartphone },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} color="#fff" />
        </div>
        <div>
          <span className="sidebar-logo-text">Brand</span>
          <span className="sidebar-logo-sub">Dashboard</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Menu</span>
        {NAV_LINKS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              'sidebar-link' + (isActive ? ' active' : '')
            }
          >
            <Icon className="sidebar-link-icon" size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé */}
      <div className="sidebar-footer">
        <div className="sidebar-footer-label">Admin</div>
        <div className="sidebar-footer-email">admin@brand.com.br</div>
      </div>
    </aside>
  )
}
