import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/command',  icon: 'i-compass', label: 'Command'     },
  { path: '/sensors',  icon: 'i-pulse',   label: 'Sensors'     },
  { path: '/networks', icon: 'i-hub',     label: 'Network'     },
  { path: '/analytics',icon: 'i-wave',    label: 'Analytics'   },
  { path: '/archive',  icon: 'i-archive', label: 'Archive'     },
  { path: '/field',    icon: 'i-boat',    label: 'Field Assist'},
  { path: '/crisis',   icon: 'i-alert',   label: 'Crisis'      },
  { path: '/planner',  icon: 'i-route',   label: 'Trip Planner'},
]

export default function Sidebar() {
  return (
    <nav className="rail" aria-label="Primary">
      <div className="rail-brand">
        <div className="brand-mark">JALA<span>VITA</span></div>
        <div className="brand-eyebrow">Command Deck</div>
      </div>
      
      <div className="rail-nav" role="tablist">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `rail-link ${isActive ? 'active' : ''}`}
          >
            <svg className="icon"><use href={`#${item.icon}`}></use></svg>
            {item.label}
          </NavLink>
        ))}
      </div>
      
      <div className="rail-bottom">
        <button className="btn-emergency">
          <svg className="icon"><use href="#i-flare"></use></svg>
          Emergency Protocol
        </button>
        <a className="rail-diag" href="#">
          <svg className="icon"><use href="#i-target"></use></svg>
          Diagnostics
        </a>
        <div className="operator">
          <span className="avatar">AR</span>
          <div className="operator-meta">
            <span className="operator-name">A. Rangan</span>
            <span className="operator-role"><i className="dot online"></i>Watch Officer</span>
          </div>
        </div>
      </div>
    </nav>
  )
}
