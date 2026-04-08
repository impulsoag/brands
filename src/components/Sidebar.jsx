import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, MonitorSmartphone,
  Zap, Settings, UserCog, ChevronLeft, ChevronRight,
  Menu, X, LogOut, Shield,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { to: '/visao',    label: 'Visão',    Icon: LayoutDashboard },
  { to: '/marcas',   label: 'Marcas',   Icon: Users },
  { to: '/eventos',  label: 'Eventos',  Icon: Activity },
  { to: '/sessoes',  label: 'Sessões',  Icon: MonitorSmartphone },
]

export default function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  return (
    <>
      {/* Botão hamburger — mobile */}
      <button className="hamburger" onClick={() => setMobileOpen(true)} aria-label="Menu">
        <Menu size={20} />
      </button>

      {/* Overlay mobile */}
      {mobileOpen && <div className="sidebar-overlay" onClick={close} />}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={14} color="#fff" />
          </div>
          {!collapsed && (
            <div>
              <span className="sidebar-logo-text">Brands</span>
              <span className="sidebar-logo-sub">Dashboard</span>
            </div>
          )}
          {/* Fechar no mobile */}
          <button className="sidebar-close-btn" onClick={close}><X size={18} /></button>
          {/* Colapsar no desktop */}
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        {/* Nav principal */}
        <nav className="sidebar-nav">
          {!collapsed && <span className="sidebar-section-label">Menu</span>}
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to} to={to} onClick={close}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
              title={collapsed ? label : undefined}
            >
              <Icon className="sidebar-link-icon" size={16} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Nav inferior */}
        <nav className="sidebar-nav-bottom">
          {!collapsed && <span className="sidebar-section-label">Sistema</span>}
          {isAdmin && (
            <NavLink to="/usuarios" onClick={close}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
              title={collapsed ? 'Usuários' : undefined}
            >
              <UserCog className="sidebar-link-icon" size={16} />
              {!collapsed && <span>Usuários</span>}
            </NavLink>
          )}
          <NavLink to="/configuracoes" onClick={close}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
            title={collapsed ? 'Configurações' : undefined}
          >
            <Settings className="sidebar-link-icon" size={16} />
            {!collapsed && <span>Configurações</span>}
          </NavLink>
        </nav>

        {/* Rodapé */}
        <div className="sidebar-footer">
          {!collapsed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div className="sidebar-avatar">
                  {(profile?.nome || profile?.email || 'U')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.nome || profile?.email?.split('@')[0] || 'Usuário'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {profile?.role === 'admin'
                      ? <span style={{ color: 'var(--accent-purple)' }}>Admin</span>
                      : 'Viewer'
                    }
                  </div>
                </div>
              </div>
              <button className="sidebar-logout" onClick={signOut}>
                <LogOut size={13} /> Sair
              </button>
            </>
          ) : (
            <button className="sidebar-logout sidebar-logout-icon" onClick={signOut} title="Sair">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
