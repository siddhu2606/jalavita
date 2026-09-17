export default function NetworksPage() {
  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Network</h2>
        <span className="panel-sub">Satellite &amp; terrestrial mesh</span>
      </div>

      <div className="grid grid-3">
        <div className="card" style={{minHeight: 400}}>
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-hub"></use></svg>Mesh Topology</div>
            <button className="btn"><svg className="icon" style={{width: 13, height: 13}}><use href="#i-refresh"></use></svg>Refresh</button>
          </div>
          <div className="instrument-surface">
            <div className="grid-overlay"></div>
            <svg width="100%" height="100%" viewBox="0 0 600 300" style={{position: 'absolute', inset: 0}}>
              <path className="flow-line" d="M90,150 C220,150 220,80 340,80" fill="none" stroke="var(--bio)" strokeWidth="2" opacity=".8"/>
              <path className="flow-line flow-line-slow" d="M340,80 C440,80 440,190 500,190" fill="none" stroke="var(--flare)" strokeWidth="2"/>
            </svg>
            <div className="node-dot" style={{left: '15%', top: '50%', width: 16, height: 16, background: 'var(--bio)', boxShadow: '0 0 12px var(--bio)'}}></div>
            <div className="node-label" style={{left: '15%', top: '50%'}}>Command HQ</div>
            <div className="node-dot" style={{left: '57%', top: '27%', width: 14, height: 14, background: 'var(--current)', boxShadow: '0 0 12px var(--current)'}}></div>
            <div className="node-label" style={{left: '57%', top: '27%'}}>Satellite Relay</div>
            <div className="node-dot" style={{left: '83%', top: '63%', width: 14, height: 14, background: 'var(--flare)', boxShadow: '0 0 12px var(--flare)'}}></div>
            <div className="node-label" style={{left: '83%', top: '63%'}}>TFA Vanguard</div>
          </div>
          <div className="legend">
            <span className="legend-item"><i className="legend-swatch" style={{background: 'var(--bio)'}}></i>Stable link</span>
            <span className="legend-item"><i className="legend-swatch" style={{background: 'var(--flare)'}}></i>Degraded</span>
            <span className="legend-item"><i className="legend-swatch" style={{background: 'var(--danger)'}}></i>Lost</span>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          <div className="card">
            <div className="card-title"><svg className="icon"><use href="#i-target"></use></svg>Bandwidth Allocation</div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5}}><span>Tactical Comms</span><span className="mono" style={{color: 'var(--bio)'}}>75%</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width: '75%', background: 'var(--bio)'}}></div></div>
              </div>
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5}}><span>Sensor Telemetry</span><span className="mono">15%</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width: '15%', background: 'var(--current)'}}></div></div>
              </div>
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5}}><span>Background Sync</span><span className="mono" style={{color: 'var(--flare)'}}>10%</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width: '10%', background: 'var(--flare)'}}></div></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-title"><svg className="icon"><use href="#i-hub"></use></svg>IPsec Tunnels</div>
            <table>
              <thead><tr><th>ID</th><th>Status</th><th style={{textAlign: 'right'}}>Uptime</th></tr></thead>
              <tbody>
                <tr><td className="mono">TUN-A1</td><td><span className="chip chip-good"><i className="dot" style={{background: 'currentColor'}}></i>Established</span></td><td className="mono" style={{textAlign: 'right'}}>45:12:00</td></tr>
                <tr><td className="mono">TUN-B2</td><td><span className="chip chip-good"><i className="dot" style={{background: 'currentColor'}}></i>Established</span></td><td className="mono" style={{textAlign: 'right'}}>12:04:33</td></tr>
                <tr><td className="mono">TUN-C3</td><td><span className="chip chip-warn"><i className="dot" style={{background: 'currentColor'}}></i>Rekeying</span></td><td className="mono" style={{textAlign: 'right'}}>00:00:15</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
