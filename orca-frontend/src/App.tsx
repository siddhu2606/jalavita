import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { Toaster } from 'sonner'
import AppShell from './components/layout/AppShell'
import LandingPage from './pages/LandingPage'
import MissionControlPage from './pages/MissionControlPage'
import SensorsPage from './pages/SensorsPage'
import NetworksPage from './pages/NetworksPage'
import AnalyticsPage from './pages/AnalyticsPage'
import ArchivePage from './pages/ArchivePage'
import FieldAssistantPage from './pages/FieldAssistantPage'
import CrisisPage from './pages/CrisisPage'
import TripPlannerPage from './pages/TripPlannerPage'
import { useAppStore } from './stores/appStore'
import CommandPalette from './components/ui/CommandPalette'

export default function App() {
  const { setCommandPaletteOpen } = useAppStore()

  // Global keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [setCommandPaletteOpen])

  return (
    <>
      <Routes>
        {/* Landing page has its own layout */}
        <Route path="/" element={<LandingPage />} />

        {/* Dashboard pages use AppShell layout */}
        <Route element={<AppShell />}>
          <Route path="/command" element={<MissionControlPage />} />
          <Route path="/sensors" element={<SensorsPage />} />
          <Route path="/networks" element={<NetworksPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/archive" element={<ArchivePage />} />
          <Route path="/field" element={<FieldAssistantPage />} />
          <Route path="/crisis" element={<CrisisPage />} />
          <Route path="/planner" element={<TripPlannerPage />} />
        </Route>
      </Routes>

      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1b2023',
            border: '1px solid rgba(241,246,249,0.1)',
            color: '#dee3e6',
            fontSize: '14px',
          },
        }}
      />
    </>
  )
}
