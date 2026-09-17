import { useState } from 'react'

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('SST')

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Analytics</h2>
        <span className="panel-sub">Causal inference &amp; kinematics</span>
      </div>

      <div className="grid grid-3col">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-alert"></use></svg>Causal Inference</div>
            <span className="panel-sub" style={{fontSize: 10.5}}>12h trend</span>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
            <div className="log-entry" style={{cursor: 'pointer'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <span className="chip chip-bad"><i className="dot" style={{background: 'currentColor'}}></i>Critical</span><span className="mono" style={{fontSize: 11, color: 'var(--flare)'}}>88%</span>
              </div>
              <div style={{fontSize: 12.5, fontWeight: 500, marginBottom: 2}}>Predicted Squall Onset</div>
              <div style={{fontSize: 10.5, color: 'var(--ink-faint)', marginBottom: 8}}>Est. 14:00Z · Sector Alpha-9</div>
              <svg className="sparkline" viewBox="0 0 200 34" preserveAspectRatio="none">
                <polyline points="0,28 25,25 50,26 75,18 100,20 125,10 150,12 175,4 200,2" fill="none" stroke="var(--danger)" strokeWidth="2"/>
                <polygon points="0,28 25,25 50,26 75,18 100,20 125,10 150,12 175,4 200,2 200,34 0,34" fill="var(--danger)" opacity=".12"/>
              </svg>
              <div className="bar-track" style={{marginTop: 6}}><div className="bar-fill" style={{width: '88%', background: 'var(--danger)'}}></div></div>
            </div>
            <div className="log-entry" style={{cursor: 'pointer'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <span className="chip chip-warn"><i className="dot" style={{background: 'currentColor'}}></i>Warning</span><span className="mono" style={{fontSize: 11, color: 'var(--flare)'}}>64%</span>
              </div>
              <div style={{fontSize: 12.5, fontWeight: 500, marginBottom: 2}}>Rogue Wave Spike</div>
              <div style={{fontSize: 10.5, color: 'var(--ink-faint)', marginBottom: 8}}>45.9°N, 12.4°W</div>
              <svg className="sparkline" viewBox="0 0 200 34" preserveAspectRatio="none">
                <polyline points="0,20 25,24 50,16 75,20 100,12 125,18 150,8 175,14 200,6" fill="none" stroke="var(--flare)" strokeWidth="2"/>
                <polygon points="0,20 25,24 50,16 75,20 100,12 125,18 150,8 175,14 200,6 200,34 0,34" fill="var(--flare)" opacity=".12"/>
              </svg>
              <div className="bar-track" style={{marginTop: 6}}><div className="bar-fill" style={{width: '64%', background: 'var(--flare)'}}></div></div>
            </div>
            <div className="log-entry" style={{cursor: 'pointer', opacity: .85}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6}}>
                <span className="chip chip-good"><i className="dot" style={{background: 'currentColor'}}></i>Normal</span><span className="mono" style={{fontSize: 11, color: 'var(--kelp)'}}>12%</span>
              </div>
              <div style={{fontSize: 12.5, fontWeight: 500, marginBottom: 2}}>Thermal Layer Inversion</div>
              <div style={{fontSize: 10.5, color: 'var(--ink-faint)', marginBottom: 8}}>Depth 150–200m</div>
              <svg className="sparkline" viewBox="0 0 200 34" preserveAspectRatio="none">
                <polyline points="0,10 25,14 50,10 75,16 100,12 125,20 150,16 175,22 200,24" fill="none" stroke="var(--kelp)" strokeWidth="2"/>
                <polygon points="0,10 25,14 50,10 75,16 100,12 125,20 150,16 175,22 200,24 200,34 0,34" fill="var(--kelp)" opacity=".12"/>
              </svg>
              <div className="bar-track" style={{marginTop: 6}}><div className="bar-fill" style={{width: '12%', background: 'var(--kelp)'}}></div></div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-wave"></use></svg>Kinematics — 48h</div>
            <div className="seg-tabs">
              <button className={activeTab === 'SST' ? 'active' : ''} onClick={() => setActiveTab('SST')}>SST</button>
              <button className={activeTab === 'Wave' ? 'active' : ''} onClick={() => setActiveTab('Wave')}>Wave</button>
              <button className={activeTab === 'Wind' ? 'active' : ''} onClick={() => setActiveTab('Wind')}>Wind</button>
            </div>
          </div>
          <div style={{position: 'relative'}}>
            <svg id="fc-svg" viewBox="0 0 400 200" preserveAspectRatio="none" style={{width: '100%', height: 220, cursor: 'crosshair'}}>
              <line x1="30" y1="10" x2="30" y2="170" stroke="var(--panel-line)"/>
              <line x1="30" y1="170" x2="390" y2="170" stroke="var(--panel-line)"/>
              <path d="M30,140 Q100,120 160,90 T290,60 T380,30" fill="none" stroke="var(--bio)" strokeWidth="2.2"/>
              <path d="M30,140 Q100,120 160,90 T290,60 T380,30 L380,170 L30,170 Z" fill="var(--bio)" opacity=".1"/>
              <path className="flow-line" d="M30,160 Q120,150 190,130 T340,120 T380,132" fill="none" stroke="var(--current)" strokeWidth="1.6"/>
              <circle cx="290" cy="60" r="4.5" fill="var(--bio)"/>
              <circle cx="290" cy="60" r="4.5" fill="none" stroke="var(--bio)" strokeWidth="1.4" opacity=".8">
                <animate attributeName="r" values="4.5;15;4.5" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values=".8;0;.8" dur="2s" repeatCount="indefinite"/>
              </circle>
              <text x="298" y="52" fill="var(--ink)" fontSize="10" fontFamily="IBM Plex Mono">21.4°C</text>
              <text x="26" y="185" fill="var(--ink-faint)" fontSize="9" fontFamily="IBM Plex Mono">T-48</text>
              <text x="370" y="185" fill="var(--ink-faint)" fontSize="9" fontFamily="IBM Plex Mono">NOW</text>
            </svg>
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          <div className="card">
            <div className="card-title"><svg className="icon"><use href="#i-target"></use></svg>Model Confidence</div>
            <div className="donut-wrap">
              <svg viewBox="0 0 120 120" width="150" height="150">
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--panel-2)" strokeWidth="10"/>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bio)" strokeWidth="10" strokeLinecap="round" strokeDasharray="314" strokeDashoffset="35"/>
              </svg>
              <div className="donut-center"><b className="mono">89%</b><span>Confidence</span></div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: 'var(--ink-dim)'}}>Inference Engine α</span><span className="mono" style={{color: 'var(--bio)'}}>0.92</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: 'var(--ink-dim)'}}>Kinematic Module β</span><span className="mono" style={{color: 'var(--current)'}}>0.85</span></div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{color: 'var(--ink-dim)'}}>Data Integrity</span><span className="mono" style={{color: 'var(--kelp)'}}>HIGH</span></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{fontSize: 10.5}}>YoY Thermal Anomaly</div>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 8}}>
              <span className="metric-value mono" style={{fontSize: 24, color: 'var(--danger)'}}>+2.4°C</span>
              <span style={{fontSize: 11, color: 'var(--ink-faint)'}}>vs 2023 avg</span>
            </div>
            <div style={{display: 'flex', alignItems: 'flex-end', gap: 3, height: 28}}>
              <div style={{flex: 1, background: 'rgba(255,138,76,.25)', height: '30%', borderRadius: '2px 2px 0 0'}}></div>
              <div style={{flex: 1, background: 'rgba(255,138,76,.35)', height: '40%', borderRadius: '2px 2px 0 0'}}></div>
              <div style={{flex: 1, background: 'rgba(255,138,76,.5)', height: '35%', borderRadius: '2px 2px 0 0'}}></div>
              <div style={{flex: 1, background: 'rgba(255,77,109,.7)', height: '65%', borderRadius: '2px 2px 0 0'}}></div>
              <div style={{flex: 1, background: 'var(--danger)', height: '100%', borderRadius: '2px 2px 0 0', boxShadow: '0 0 8px var(--danger)'}}></div>
            </div>
          </div>
          <div className="card">
            <div className="card-title" style={{fontSize: 10.5}}><svg className="icon" style={{width: 14, height: 14}}><use href="#i-compass"></use></svg>Species Tracking</div>
            <svg viewBox="0 0 200 50" style={{width: '100%', height: 50}}>
              <path d="M0,25 C40,5 60,45 100,25 S160,5 200,25" fill="none" stroke="var(--current)" strokeWidth="1.6" opacity=".8"/>
              <path d="M0,35 C40,15 60,55 100,35 S160,15 200,35" fill="none" stroke="var(--bio)" strokeWidth="1.6" opacity=".6"/>
            </svg>
            <div style={{fontSize: 11.5, color: 'var(--ink-dim)'}}>Pelagic shift detected: <b style={{color: 'var(--current)'}}>45NM North</b></div>
          </div>
        </div>
      </div>

      <div className="card" style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 24}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 220}}>
          <svg className="icon" style={{color: 'var(--bio)'}}><use href="#i-refresh"></use></svg>
          <div>
            <div style={{fontSize: 13, fontWeight: 600}}>Model Confidence &amp; Brier Scores</div>
            <div style={{fontSize: 11, color: 'var(--ink-faint)'}}>Active Ensemble: Aegis-Net v4.2</div>
          </div>
        </div>
        <div style={{flex: 1, display: 'flex', gap: 24, flexWrap: 'wrap', minWidth: 280}}>
          <div style={{flex: 1, minWidth: 150}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5}}><span style={{color: 'var(--ink-dim)'}}>Kinematic Engine</span><span className="chip chip-good">Excellent</span></div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}><span className="mono" style={{fontSize: 15, fontWeight: 600}}>0.12</span><div className="bar-track" style={{flex: 1}}><div className="bar-fill" style={{width: '88%', background: 'var(--bio)'}}></div></div></div>
          </div>
          <div style={{flex: 1, minWidth: 150}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5}}><span style={{color: 'var(--ink-dim)'}}>Thermal Prediction</span><span className="chip chip-info">Nominal</span></div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}><span className="mono" style={{fontSize: 15, fontWeight: 600}}>0.24</span><div className="bar-track" style={{flex: 1}}><div className="bar-fill" style={{width: '66%', background: 'var(--current)'}}></div></div></div>
          </div>
          <div style={{flex: 1, minWidth: 150}}>
            <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5}}><span style={{color: 'var(--ink-dim)'}}>Anomaly Detect</span><span className="chip chip-warn">Recalibrating</span></div>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}><span className="mono" style={{fontSize: 15, fontWeight: 600, color: 'var(--flare)'}}>0.41</span><div className="bar-track" style={{flex: 1}}><div className="bar-fill" style={{width: '41%', background: 'var(--flare)'}}></div></div></div>
          </div>
        </div>
      </div>
    </section>
  )
}
