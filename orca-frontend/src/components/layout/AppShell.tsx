import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import Icons from '../Icons'

export default function AppShell() {
  return (
    <div className="app">
      <Icons />
      <Sidebar />
      <TopBar />
      <main className="canvas">
        <Outlet />
      </main>
    </div>
  )
}
