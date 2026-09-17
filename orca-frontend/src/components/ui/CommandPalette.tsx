import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'
import { useEffect, useRef, useState } from 'react'

const commands = [
  { id: 'command', label: 'Mission Control', icon: 'terminal', path: '/command', group: 'Navigation' },
  { id: 'sensors', label: 'Sensors Dashboard', icon: 'sensors', path: '/sensors', group: 'Navigation' },
  { id: 'networks', label: 'Networks Dashboard', icon: 'hub', path: '/networks', group: 'Navigation' },
  { id: 'analytics', label: 'Analytics Dashboard', icon: 'analytics', path: '/analytics', group: 'Navigation' },
  { id: 'archive', label: 'Archive Dashboard', icon: 'inventory_2', path: '/archive', group: 'Navigation' },
  { id: 'field', label: 'Field Assistant', icon: 'sailing', path: '/field', group: 'Navigation' },
  { id: 'crisis', label: 'Crisis Alert', icon: 'warning', path: '/crisis', group: 'Navigation' },
  { id: 'planner', label: 'Trip Planner', icon: 'route', path: '/planner', group: 'Navigation' },
  { id: 'home', label: 'Landing Page', icon: 'home', path: '/', group: 'Navigation' },
  { id: 'emergency', label: 'Emergency Protocol', icon: 'sos', path: '/crisis', group: 'Actions' },
]

export default function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.group.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleSelect = (path: string) => {
    navigate(path)
    setCommandPaletteOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      handleSelect(filtered[selectedIndex].path)
    } else if (e.key === 'Escape') {
      setCommandPaletteOpen(false)
    }
  }

  if (!commandPaletteOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={() => setCommandPaletteOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface-container border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5">
          <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
          <input
            ref={inputRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/50 outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-[10px] text-on-surface-variant">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-on-surface-variant text-body-sm">
              No results found for "{search}"
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd.path)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                  i === selectedIndex ? 'bg-primary-container/40 text-on-surface' : 'text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[18px] text-tertiary">{cmd.icon}</span>
                <span className="text-body-sm font-medium">{cmd.label}</span>
                <span className="ml-auto text-[10px] text-on-surface-variant/50 uppercase tracking-wider">{cmd.group}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
