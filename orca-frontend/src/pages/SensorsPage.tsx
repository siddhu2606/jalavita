import { useState, useEffect, useRef } from 'react'
import { api, createWebSocket, type SensorArray } from '../api'

export default function SensorsPage() {
  const [sensors, setSensors] = useState<SensorArray[]>([])
  const [liveSensors, setLiveSensors] = useState<Record<string, Partial<SensorArray>>>({})
  const [terminalLogs, setTerminalLogs] = useState<string[]>([])
  const terminalContainerRef = useRef<HTMLDivElement>(null)

  // Fetch initial sensor data
  useEffect(() => {
    api.sensors().then(setSensors).catch(console.error)
  }, [])

  // Live telemetry via WebSocket
  useEffect(() => {
    const ws = createWebSocket('telemetry', (data: any) => {
      if (data.type === 'telemetry' && data.sensors) {
        const map: Record<string, Partial<SensorArray>> = {}
        data.sensors.forEach((s: any) => { map[s.name] = s })
        setLiveSensors(map)
      }
    })
    return () => ws.close()
  }, [])

  // Terminal stream
  useEffect(() => {
    const ws = createWebSocket('terminal', (data: any) => {
      if (data.type === 'terminal') {
        setTerminalLogs(prev => [...prev, data.line].slice(-20))
      }
    })
    return () => ws.close()
  }, [])

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight
    }
  }, [terminalLogs])

  // Merge live WS data over the base REST data
  const merged = sensors.map(s => ({ ...s, ...(liveSensors[s.name] ?? {}) }))

  const main = merged[0]
  const signal = main?.signal_dbm ?? -42
  const latency = main?.latency_ms ?? 124
  const loss = main?.packet_loss_pct ?? 0.02
  const temp = main?.temp_c ?? 14.2

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Sensors</h2>
        <span className="panel-sub">{sensors.filter(s => s.status === 'online').length || 3} arrays online · Grid Ref Alpha-7</span>
      </div>

      <div className="grid grid-3col">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-pulse"></use></svg>Active Arrays</div>
            <span className="chip chip-good">{sensors.filter(s => s.status === 'online').length || 3} online</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            {(merged.length > 0 ? merged : sensors).map(s => (
              <div key={s.id} style={{background: 'var(--panel-2)', border: '1px solid var(--panel-line)', borderRadius: 9, padding: 12}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <span style={{fontSize: 12.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7}}>
                    <i className="dot" style={{background: s.status === 'online' ? 'var(--bio)' : 'var(--flare)', boxShadow: `0 0 6px ${s.status === 'online' ? 'var(--bio)' : 'var(--flare)'}`}}></i>
                    {s.name}
                  </span>
                  <span className="mono" style={{fontSize: 10.5, color: 'var(--ink-faint)'}}>{s.sensor_type}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-dim)', marginBottom: 6}}>
                  <span>Uplink <b className="mono" style={{color: s.uplink_pct > 90 ? 'var(--bio)' : 'var(--flare)'}}>{s.uplink_pct.toFixed(1)}%</b></span>
                  {s.is_hardline
                    ? <span className="mono" style={{color: 'var(--bio)'}}>HARDLINE</span>
                    : <span>Power <b className="mono" style={{color: s.power_pct < 50 ? 'var(--flare)' : undefined}}>{s.power_pct.toFixed(0)}%</b></span>
                  }
                </div>
                <svg className="sparkline" viewBox="0 0 200 30" preserveAspectRatio="none">
                  <polyline points="0,22 20,18 40,20 60,8 80,12 100,4 120,10 140,6 160,14 180,10 200,16" fill="none" stroke={s.status === 'online' ? 'var(--bio)' : 'var(--flare)'} strokeWidth="1.8"/>
                </svg>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{minHeight: 420}}>
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-compass"></use></svg>Spatial Coverage</div>
          </div>
          <div className="instrument-surface">
            <div className="grid-overlay"></div>
            <div className="radar-hand"></div>
            <div className="node-dot" style={{left: '34%', top: '38%', background: 'var(--bio)', boxShadow: '0 0 10px var(--bio)'}}></div>
            <div className="node-label" style={{left: '34%', top: '38%'}}>Oceansat-3</div>
            <div className="node-dot" style={{left: '58%', top: '64%', background: 'var(--flare)', boxShadow: '0 0 10px var(--flare)'}}></div>
            <div className="node-label" style={{left: '58%', top: '64%'}}>Buoy #442</div>
            <div className="node-dot" style={{left: '72%', top: '30%', background: 'var(--bio)', boxShadow: '0 0 10px var(--bio)'}}></div>
            <div className="node-label" style={{left: '72%', top: '30%'}}>AIS Alpha</div>
            <div className="surface-stat" style={{bottom: 14, left: 14, display: 'flex', gap: 16}}>
              <div><div style={{fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase'}}>Active Nodes</div><div className="mono" style={{color: 'var(--bio)', fontSize: 15}}>1,248</div></div>
              <div><div style={{fontSize: 10, color: 'var(--ink-faint)', textTransform: 'uppercase'}}>Coverage</div><div className="mono" style={{fontSize: 15}}>84,000 km²</div></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-target"></use></svg>Telemetry Detail</div>
            <span className="chip chip-info"><i className="dot" style={{background: 'currentColor'}}></i>Live</span>
          </div>
          <div className="kv-grid">
            <div className="kv"><div className="kv-label">Signal</div><div className="kv-value"><span>{signal.toFixed(1)}</span><span>dBm</span></div></div>
            <div className="kv"><div className="kv-label">Packet Loss</div><div className="kv-value"><span>{loss.toFixed(3)}</span><span>%</span></div></div>
            <div className="kv"><div className="kv-label">Latency</div><div className="kv-value"><span>{Math.round(latency)}</span><span>ms</span></div></div>
            <div className="kv"><div className="kv-label">Temp (int)</div><div className="kv-value"><span>{temp.toFixed(1)}</span><span>°C</span></div></div>
          </div>
          <div>
            <div style={{fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8}}>SNR — 24h trend</div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 4, height: 64}}>
              {[55,62,48,70,85,78,98].map((h, i) => (
                <div key={i} style={{flex: 1, background: 'var(--bio)', opacity: 0.35 + i * 0.1, height: `${h}%`, borderRadius: '2px 2px 0 0', transition: 'height .6s ease'}}></div>
              ))}
            </div>
          </div>
          <div style={{display: 'flex', gap: 8}}>
            <button className="btn btn-block"><svg className="icon" style={{width: 14, height: 14}}><use href="#i-refresh"></use></svg>Run Diagnostic</button>
            <button className="btn btn-block"><svg className="icon" style={{width: 14, height: 14}}><use href="#i-target"></use></svg>Force Recalibrate</button>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop: 18}}>
        <div className="card-head">
          <div className="card-title"><svg className="icon"><use href="#i-search"></use></svg>Raw Data Stream</div>
          <span className="chip chip-info"><i className="dot" style={{background: 'currentColor'}}></i>WebSocket</span>
        </div>
        <div ref={terminalContainerRef} className="code-block" style={{minHeight: 120, maxHeight: 120, overflowY: 'auto'}}>
          {terminalLogs.length === 0
            ? <div style={{color: 'var(--ink-faint)'}}>Connecting to data stream…</div>
            : terminalLogs.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      </div>
    </section>
  )
}