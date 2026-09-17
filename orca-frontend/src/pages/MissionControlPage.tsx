import { useState, useEffect, useRef } from 'react'
import { api, createWebSocket, type DashboardSummary } from '../api'

export default function MissionControlPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const [agentStats, setAgentStats] = useState<{ name: string; latency_ms: number; brier_score: number }[]>([])
  const terminalContainerRef = useRef<HTMLDivElement>(null)

  // Fetch initial summary from REST API
  useEffect(() => {
    api.summary().then(setSummary).catch(console.error)
  }, [])

  // Connect to WebSocket for terminal logs
  useEffect(() => {
    const ws = createWebSocket('terminal', (data: any) => {
      if (data.type === 'terminal') {
        setTerminalLogs(prev => [...prev, data.line].slice(-20))
      }
    })
    return () => ws.close()
  }, [])

  // Connect to WebSocket for agent stats
  useEffect(() => {
    const ws = createWebSocket('agents', (data: any) => {
      if (data.type === 'agents') setAgentStats(data.agents)
    })
    return () => ws.close()
  }, [])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight
    }
  }, [terminalLogs])

  const vessels = summary?.vessel_count ?? 3492
  const alerts = summary?.weather_alerts ?? 7
  const resilience = summary?.network_resilience ?? 94

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Command</h2>
        <span className="panel-sub">Basin-wide status · updated <span className="mono">live</span></span>
      </div>

      <div className="grid grid-4">
        <div className="card metric-card">
          <div className="card-title"><svg className="icon"><use href="#i-boat"></use></svg>Active Vessels</div>
          <div className="metric-value mono">{vessels.toLocaleString('en-US')}</div>
          <div className="metric-delta up"><svg className="icon" style={{width: 12, height: 12}}><use href="#i-chev-up"></use></svg>+12% this week</div>
          <svg className="sparkline" viewBox="0 0 200 34" preserveAspectRatio="none">
            <polyline points="0,26 25,24 50,20 75,22 100,14 125,16 150,8 175,10 200,4" fill="none" stroke="var(--kelp)" strokeWidth="2"/>
            <polygon points="0,26 25,24 50,20 75,22 100,14 125,16 150,8 175,10 200,4 200,34 0,34" fill="var(--kelp)" opacity=".12"/>
          </svg>
        </div>
        <div className="card metric-card">
          <div className="card-title"><svg className="icon"><use href="#i-wave"></use></svg>Active PFZ Zones</div>
          <div className="metric-value mono">{summary?.active_pfz ?? 148}</div>
          <div className="metric-delta" style={{color: 'var(--ink-dim)'}}>42 high-yield · 106 standard</div>
        </div>
        <div className="card metric-card">
          <div className="card-title"><svg className="icon"><use href="#i-alert"></use></svg>Severe Weather Alerts</div>
          <div className="metric-value mono" style={{color: 'var(--danger)'}}>{String(alerts).padStart(2, '0')}</div>
          <div className="metric-delta bad"><svg className="icon" style={{width: 12, height: 12}}><use href="#i-alert"></use></svg>Critical — review now</div>
        </div>
        <div className="card metric-card">
          <div className="card-title"><svg className="icon"><use href="#i-hub"></use></svg>Network Resilience</div>
          <div className="metric-value mono">{resilience}<span style={{fontSize: 15, color: 'var(--ink-faint)'}}>/100</span></div>
          <div className="bar-track"><div className="bar-fill" style={{width: `${resilience}%`, background: 'var(--bio)'}}></div></div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card" style={{minHeight: 380}}>
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-compass"></use></svg>Global Telemetry</div>
            <span className="chip chip-info"><i className="dot" style={{background: 'currentColor'}}></i>Live</span>
          </div>
          <div className="instrument-surface">
            <div className="grid-overlay"></div>
            <svg width="100%" height="100%" viewBox="0 0 600 320" style={{position: 'absolute', inset: 0}}>
              <circle cx="230" cy="140" r="60" fill="var(--bio)" opacity=".14"/>
              <circle cx="230" cy="140" r="8" fill="var(--bio)"/>
              <circle cx="230" cy="140" r="14" fill="none" stroke="var(--bio)" strokeWidth="1.5" opacity=".6">
                <animate attributeName="r" values="14;34;14" dur="2.4s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".6;0;.6" dur="2.4s" repeatCount="indefinite"/>
              </circle>
              <circle cx="370" cy="200" r="42" fill="var(--kelp)" opacity=".12"/>
              <circle cx="370" cy="200" r="6" fill="var(--kelp)"/>
              <circle cx="440" cy="90" r="30" fill="var(--current)" opacity=".14"/>
              <circle cx="440" cy="90" r="6" fill="var(--current)"/>
              <circle cx="150" cy="230" r="5" fill="var(--flare)"/>
              <circle cx="150" cy="230" r="10" fill="none" stroke="var(--flare)" strokeWidth="1.5">
                <animate attributeName="r" values="10;24;10" dur="1.8s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".8;0;.8" dur="1.8s" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
        </div>

        <div className="card" style={{minHeight: 380}}>
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-pulse"></use></svg>Signal Feed</div>
          </div>
          <div className="feed">
            <div className="feed-item">
              <div className="feed-dot" style={{background: 'var(--bio-dim)', color: 'var(--bio)'}}><svg className="icon" style={{width: 13, height: 13}}><use href="#i-boat"></use></svg></div>
              <div className="feed-body"><span className="feed-title">Catch Report · V-902</span><span className="feed-text">High-yield yellowfin in Zone Alpha-7</span></div>
              <span className="feed-time mono">now</span>
            </div>
            <div className="feed-item">
              <div className="feed-dot" style={{background: 'var(--danger-dim)', color: 'var(--danger)'}}><svg className="icon" style={{width: 13, height: 13}}><use href="#i-alert"></use></svg></div>
              <div className="feed-body"><span className="feed-title">Squall Warning</span><span className="feed-text">Rapid pressure drop, Sector 4 — 12 vessels notified</span></div>
              <span className="feed-time mono">12m</span>
            </div>
            <div className="feed-item">
              <div className="feed-dot" style={{background: 'var(--kelp-dim)', color: 'var(--kelp)'}}><svg className="icon" style={{width: 13, height: 13}}><use href="#i-check"></use></svg></div>
              <div className="feed-body"><span className="feed-title">Calibration Complete</span><span className="feed-text">Buoy network reset — accuracy +4%</span></div>
              <span className="feed-time mono">45m</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specialist Agents — live from WebSocket */}
      <div className="card">
        <div className="card-head">
          <div className="card-title"><svg className="icon"><use href="#i-hub"></use></svg>Specialist Agents</div>
          <span className="chip chip-bad"><i className="dot" style={{background: 'currentColor'}}></i>Orchestrator Active</span>
        </div>
        <div className="grid grid-4" style={{gridTemplateColumns: 'repeat(2,1fr)'}}>
          {(agentStats.length > 0 ? agentStats : [
            {name: 'Planner', latency_ms: 120, brier_score: 0.05},
            {name: 'Ocean Analytics', latency_ms: 210, brier_score: 0.12},
            {name: 'Weather & Hazard', latency_ms: 340, brier_score: 0.45},
            {name: 'Trip Twin', latency_ms: 180, brier_score: 0.08},
            {name: 'Causal & Trend', latency_ms: 410, brier_score: 0.15},
            {name: 'Guardrail', latency_ms: 50, brier_score: 0.0},
          ]).map(agent => (
            <div key={agent.name} className="agent-row">
              <div className="agent-icon"><svg className="icon"><use href="#i-hub"></use></svg></div>
              <div className="agent-meta">
                <span className="agent-name">{agent.name}</span>
                <span className="agent-stats mono">{agent.latency_ms}ms · Brier {agent.brier_score.toFixed(2)}</span>
              </div>
              <i className="dot online" style={{marginLeft: 'auto'}}></i>
            </div>
          ))}
        </div>
      </div>

      {/* Terminal — live from WebSocket */}
      <div className="card" style={{marginTop: 18}}>
        <div className="card-head">
          <div className="card-title"><svg className="icon"><use href="#i-search"></use></svg>Terminal Log</div>
          <span className="chip chip-info"><i className="dot" style={{background: 'currentColor'}}></i>WebSocket</span>
        </div>
        <div ref={terminalContainerRef} className="code-block" style={{minHeight: 120, maxHeight: 120, overflowY: 'auto'}}>
          {terminalLogs.length === 0
            ? <div style={{color: 'var(--ink-faint)'}}>Connecting to terminal stream…</div>
            : terminalLogs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      </div>
    </section>
  )
}
