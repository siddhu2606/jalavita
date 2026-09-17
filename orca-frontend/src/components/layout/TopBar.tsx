import { useEffect, useState } from 'react'

function formatUTCTime() {
  const d = new Date()
  return d.toISOString().slice(11, 19)
}

export default function TopBar() {
  const [utcTime, setUtcTime] = useState(formatUTCTime())

  useEffect(() => {
    const interval = setInterval(() => setUtcTime(formatUTCTime()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-context">
        <span className="ctx-sector">Sector 7G · Arabian Sea Basin</span>
        <span className="pill pill-good"><i className="dot"></i>System Nominal</span>
      </div>
      <div className="topbar-search">
        <svg className="icon"><use href="#i-search"></use></svg>
        <input placeholder="Search vessel ID, coordinates, or log entry…" />
      </div>
      <div className="topbar-actions">
        <span className="clock mono" id="clock">{utcTime} UTC</span>
        <button className="icon-btn" aria-label="Notifications">
          <svg className="icon"><use href="#i-bell"></use></svg>
        </button>
        <button className="icon-btn" aria-label="Settings">
          <svg className="icon"><use href="#i-gear"></use></svg>
        </button>
      </div>
    </header>
  )
}
