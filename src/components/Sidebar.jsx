import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, Activity, MonitorSmartphone,
  Zap, Settings, UserCog, ChevronLeft, ChevronRight,
  Menu, X, LogOut, Shield, Star, Search, Bug,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

const NAV_LINKS = [
  { to: '/visao',    label: 'Visão',    Icon: LayoutDashboard },
  { to: '/marcas',   label: 'Marcas',   Icon: Users },
  { to: '/eventos',  label: 'Eventos',  Icon: Activity },
  { to: '/sessoes',         label: 'Sessões',         Icon: MonitorSmartphone },
  { to: '/influenciadores', label: 'Influenciadores', Icon: Star },
  { to: '/bugs',            label: 'Bugs',            Icon: Bug },
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
        <div className="sidebar-logo" style={{ borderBottom: '1px solid var(--sidebar-border)', paddingBottom: '16px', marginBottom: '4px' }}>
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

        {/* Search */}
        {!collapsed && (
          <div className="sidebar-search">
            <div className="sidebar-search-input-wrap">
              <Search className="sidebar-search-icon" size={13} />
              <input className="sidebar-search-input" type="text" placeholder="Pesquisar..." readOnly />
            </div>
          </div>
        )}

        {/* Nav principal */}
        <nav className="sidebar-nav">
          {!collapsed && <span className="sidebar-section-label">Menu</span>}
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink
              key={to} to={to} onClick={close}
              className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
              title={collapsed ? label : undefined}
            >
              <Icon className="sidebar-link-icon" size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Nav inferior */}
        <nav className="sidebar-nav-bottom">
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
            <div className="sidebar-user">
              <div className="sidebar-avatar" style={{ background: 'rgba(37,15,239,0.2)', color: '#818cf8', border: '2px solid rgba(37,15,239,0.25)' }}>
                {(profile?.nome || profile?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {profile?.nome || profile?.email?.split('@')[0] || 'Usuário'}
                </span>
                <span className="sidebar-user-role">
                  {profile?.role === 'admin' ? 'Admin' : 'Viewer'}
                </span>
              </div>
              <button className="sidebar-user-logout" onClick={signOut} title="Sair">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button className="sidebar-logout-icon" onClick={signOut} title="Sair">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
