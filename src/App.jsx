import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import Login from './pages/Login.jsx'
import Overview from './pages/Overview.jsx'
import Leads from './pages/Leads.jsx'
import Events from './pages/Events.jsx'
import Sessions from './pages/Sessions.jsx'
import Usuarios from './pages/Usuarios.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import Influenciadores from './pages/Influenciadores.jsx'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="loading-spinner" style={{ width: 28, height: 28 }} />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/"             element={<Navigate to="/visao" replace />} />
          <Route path="/visao"        element={<Overview />} />
          <Route path="/marcas"       element={<Leads />} />
          <Route path="/eventos"      element={<Events />} />
          <Route path="/sessoes"      element={<Sessions />} />
          <Route path="/usuarios"     element={<Usuarios />} />
          <Route path="/configuracoes"    element={<Configuracoes />} />
          <Route path="/influenciadores" element={<Influenciadores />} />
          <Route path="*"             element={<Navigate to="/visao" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*"     element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/visao" replace />
  return <Login />
}
