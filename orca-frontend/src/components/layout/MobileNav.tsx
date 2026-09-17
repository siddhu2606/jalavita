import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '../../utils'

const mobileNavItems = [
  { path: '/command', icon: 'terminal', label: 'Live' },
  { path: '/sensors', icon: 'sensors', label: 'Sensors' },
  { path: '/crisis', icon: 'warning', label: 'Alerts' },
  { path: '/planner', icon: 'route', label: 'Plan' },
]

export default function MobileNav() {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-container-low/95 backdrop-blur-xl border-t border-white/5">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-all',
                isActive
                  ? 'text-tertiary'
                  : 'text-on-surface-variant hover:text-on-surface'
              )}
            >
              <span
                className={cn(
                  'material-symbols-outlined text-[22px]',
                  isActive && 'text-tertiary'
                )}
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold tracking-wide">
                {item.label}
              </span>
              {item.path === '/crisis' && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emergency-orange" />
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
