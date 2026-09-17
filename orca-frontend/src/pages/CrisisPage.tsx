export default function CrisisPage() {
  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Crisis Monitor</h2>
        <span className="panel-sub" style={{color: 'var(--danger)'}}>IMBL proximity · Vessel ORCA-9</span>
      </div>
      <div className="grid grid-3">
        <div className="card" style={{minHeight: 440, borderColor: 'rgba(255,77,109,.3)'}}>
          <div className="card-head">
            <div className="card-title" style={{color: 'var(--danger)'}}><svg className="icon" style={{color: 'var(--danger)'}}><use href="#i-alert"></use></svg>Boundary Radar</div>
            <span className="chip chip-bad"><i className="dot" style={{background: 'currentColor'}}></i>Intercept in 00:03:42</span>
          </div>
          <div className="instrument-surface" style={{minHeight: 360, background: 'radial-gradient(ellipse at 50% 50%,rgba(255,77,109,.08),transparent 60%),var(--abyss-2)'}}>
            <div className="grid-overlay"></div>
            <div className="imbl-boundary"></div>
            <span className="imbl-tag mono">IMBL — 3.8km</span>
            <div className="danger-ring2"></div>
            <div className="node-dot" style={{left: '55%', top: '50%', width: 14, height: 14, background: 'var(--flare)', boxShadow: '0 0 12px var(--flare)'}}></div>
            <div className="node-label" style={{left: '55%', top: '50%'}}>ORCA-9 · 14kt · 142°</div>
          </div>
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          <div className="card" style={{borderColor: 'rgba(255,77,109,.3)'}}>
            <div className="card-title" style={{color: 'var(--danger)'}}>Intervention Required</div>
            <p style={{fontSize: 12.5, color: 'var(--ink-dim)', margin: 0}}>Vessel ORCA-9 is critically close to the International Maritime Boundary Line. Immediate action mandated.</p>
          </div>
          <div className="card" style={{flex: 1}}>
            <div className="card-title">Protocols</div>
            <button className="btn btn-block" style={{justifyContent: 'space-between'}}><span style={{display: 'flex', alignItems: 'center', gap: 8}}><svg className="icon" style={{width: 14, height: 14}}><use href="#i-bell"></use></svg>Automated Voice Call</span><svg className="icon" style={{width: 14, height: 14}}><use href="#i-chev-up"></use></svg></button>
            <button className="btn btn-block" style={{justifyContent: 'space-between'}}><span style={{display: 'flex', alignItems: 'center', gap: 8}}><svg className="icon" style={{width: 14, height: 14}}><use href="#i-satellite"></use></svg>Push NavIC Delta Sync</span><svg className="icon" style={{width: 14, height: 14}}><use href="#i-chev-up"></use></svg></button>
            <button className="btn btn-block" style={{marginTop: 'auto', background: 'var(--danger)', borderColor: 'var(--danger)', color: '#2a0008', fontSize: 13, padding: 14}}><svg className="icon" style={{width: 16, height: 16}}><use href="#i-flare"></use></svg>Escalate to Coast Guard</button>
          </div>
        </div>
      </div>
    </section>
  )
}
