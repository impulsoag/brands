import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const FALLBACK = { sessoes: 96, eventos: 686, marcas: 11 }
const INTERVAL = 30_000

export function useLiveStats() {
  const [stats, setStats] = useState(FALLBACK)
  const [loaded, setLoaded] = useState(false)

  async function fetchStats() {
    try {
      const [
        { count: sessoes },
        { count: eventos },
        { count: marcas },
      ] = await Promise.all([
        supabase.from('sessions').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*',   { count: 'exact', head: true }),
        supabase.from('leads').select('*',    { count: 'exact', head: true }),
      ])
      if (sessoes !== null || eventos !== null || marcas !== null) {
        setStats({
          sessoes: sessoes ?? FALLBACK.sessoes,
          eventos: eventos ?? FALLBACK.eventos,
          marcas:  marcas  ?? FALLBACK.marcas,
        })
      }
    } catch { /* mantém fallback */ } finally { setLoaded(true) }
  }

  useEffect(() => {
    fetchStats()
    const id = setInterval(fetchStats, INTERVAL)
    return () => clearInterval(id)
  }, [])

  return { stats, loaded }
}
