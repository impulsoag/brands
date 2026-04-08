import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import Leads from './pages/Leads.jsx'
import Events from './pages/Events.jsx'
import Sessions from './pages/Sessions.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/"          element={<Navigate to="/overview" replace />} />
            <Route path="/overview"  element={<Overview />} />
            <Route path="/leads"     element={<Leads />} />
            <Route path="/events"    element={<Events />} />
            <Route path="/sessions"  element={<Sessions />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
