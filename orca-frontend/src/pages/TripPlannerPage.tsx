import { useState } from 'react'
import { api, type TripPlanResult } from '../api'

export default function TripPlannerPage() {
  const [vesselMmsi, setVesselMmsi] = useState('ORCA-9')
  const [departure, setDeparture] = useState(6)
  const [speed, setSpeed] = useState(12.5)
  const [duration, setDuration] = useState(4.5)
  const [fuel, setFuel] = useState(50)
  const [result, setResult] = useState<TripPlanResult | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState('')

  const formatDeparture = (val: number) => {
    const h = Math.floor(val)
    const m = (val % 1) ? '30' : '00'
    return `${String(h).padStart(2, '0')}:${m}`
  }

  const handleCalculate = async () => {
    setIsCalculating(true)
    setError('')
    try {
      const plan = await api.calculateTrip({
        vessel_mmsi: vesselMmsi,
        departure_time: formatDeparture(departure),
        cruise_speed_kts: speed,
        duration_hrs: duration,
        fuel_limit_l: fuel,
      })
      setResult(plan)
    } catch (e) {
      setError('Calculation failed — check backend connection.')
    } finally {
      setIsCalculating(false)
    }
  }

  const fuelPct = result ? Math.round((result.estimated_fuel_l / result.fuel_limit_l) * 100) : 0
  const isFeasible = result?.status === 'feasible'

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Trip Planner</h2>
        <span className="panel-sub">4D spatiotemporal route synthesis</span>
      </div>
      <div className="grid-planner">
        <div className="card">
          <div className="card-head">
            <div className="card-title"><svg className="icon"><use href="#i-target"></use></svg>Mission Parameters</div>
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <div className="slider-group">
              <div className="slider-label"><span>Vessel MMSI</span></div>
              <input className="field" value={vesselMmsi} onChange={e => setVesselMmsi(e.target.value)} style={{width: '100%'}} />
            </div>
            <div className="slider-group">
              <div className="slider-label"><span>Departure Window</span><span className="mono">{formatDeparture(departure)}</span></div>
              <input type="range" min="4" max="12" step="0.5" value={departure} onChange={e => setDeparture(parseFloat(e.target.value))} />
              <div className="slider-ticks"><span>04:00</span><span>08:00</span><span>12:00</span></div>
            </div>
            <div className="slider-group">
              <div className="slider-label"><span>Cruise Speed (kts)</span><span className="mono">{speed.toFixed(1)}</span></div>
              <input type="range" min="6" max="14" step="0.5" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} />
              <div className="slider-ticks"><span>6.0</span><span>10.0</span><span>14.0</span></div>
            </div>
            <div className="slider-group">
              <div className="slider-label"><span>Operation Duration (hrs)</span><span className="mono">{duration.toFixed(1)}</span></div>
              <input type="range" min="2" max="8" step="0.5" value={duration} onChange={e => setDuration(parseFloat(e.target.value))} />
              <div className="slider-ticks"><span>2.0</span><span>5.0</span><span>8.0</span></div>
            </div>
            <div className="slider-group">
              <div className="slider-label"><span>Fuel Tank Limit (L)</span></div>
              <input className="field" type="number" value={fuel} onChange={e => setFuel(parseFloat(e.target.value))} style={{width: '100%'}} />
            </div>
            {error && <div style={{color: 'var(--danger)', fontSize: 12}}>{error}</div>}
            <button
              className="btn btn-solid btn-block"
              onClick={handleCalculate}
              disabled={isCalculating}
              style={{background: 'var(--flare)', borderColor: 'var(--flare)', color: '#20120a', opacity: isCalculating ? 0.7 : 1}}
            >
              <svg className="icon" style={{width: 14, height: 14}}><use href="#i-refresh"></use></svg>
              {isCalculating ? 'Calculating…' : 'Recalculate Spatiotemporal Twin'}
            </button>
          </div>
        </div>

        <div className="card" style={{minHeight: 420}}>
          <div className="card-title"><svg className="icon"><use href="#i-wave"></use></svg>4D Trajectory &amp; Hazard Analysis</div>
          <svg viewBox="0 0 420 260" preserveAspectRatio="none" style={{width: '100%', height: 260}}>
            <line x1="34" y1="10" x2="34" y2="220" stroke="var(--panel-line)"/>
            <line x1="34" y1="220" x2="410" y2="220" stroke="var(--panel-line)"/>
            <path d="M55,215 C100,180 130,110 170,95 C200,85 240,55 280,90 C320,120 350,190 385,215" fill="none" stroke="var(--bio)" strokeWidth="2.2"/>
            {result && (
              <circle cx="245" cy="58" r="4" fill={isFeasible ? 'var(--bio)' : 'var(--danger)'}>
                <animate attributeName="r" values="4;11;4" dur="1.6s" repeatCount="indefinite"/>
              </circle>
            )}
          </svg>
          {result && (
            <div className="grid" style={{gridTemplateColumns: 'repeat(3,1fr)'}}>
              <div className="kv">
                <div className="kv-label">Fuel Consumption</div>
                <div className="kv-value" style={{color: isFeasible ? 'var(--bio)' : 'var(--danger)'}}>
                  {result.estimated_fuel_l}<span>/{result.fuel_limit_l}L</span>
                </div>
                <div className="bar-track" style={{marginTop: 6}}>
                  <div className="bar-fill" style={{width: `${Math.min(fuelPct, 100)}%`, background: isFeasible ? 'var(--bio)' : 'var(--danger)'}}></div>
                </div>
              </div>
              <div className="kv">
                <div className="kv-label">Point of No Return</div>
                <div className="kv-value">{result.point_of_no_return}</div>
              </div>
              <div className="kv">
                <div className="kv-label">Route Status</div>
                <div className="kv-value" style={{color: isFeasible ? 'var(--bio)' : 'var(--danger)', fontSize: 13}}>
                  {isFeasible ? 'FEASIBLE' : 'REJECTED'}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><svg className="icon"><use href="#i-filter"></use></svg>Route Explainability Log</div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto'}}>
            {!result && (
              <div className="log-entry" style={{opacity: .6}}>
                <div className="log-head" style={{color: 'var(--ink-dim)'}}>Awaiting calculation…</div>
                <p>Set parameters and click Recalculate.</p>
              </div>
            )}
            {result && !isFeasible && (
              <div className="log-entry log-bad">
                <div className="log-head"><svg className="icon" style={{width: 14, height: 14}}><use href="#i-alert"></use></svg>Route Rejected</div>
                <p>Fuel estimate ({result.estimated_fuel_l}L) exceeds tank limit ({result.fuel_limit_l}L). Reduce speed or duration.</p>
              </div>
            )}
            {result && isFeasible && (
              <div className="log-entry log-info">
                <div className="log-head"><svg className="icon" style={{width: 14, height: 14}}><use href="#i-check"></use></svg>Route Feasible</div>
                <p>Estimated fuel: {result.estimated_fuel_l}L of {result.fuel_limit_l}L. Point of no return at {result.point_of_no_return}.</p>
                <button className="btn btn-solid btn-block" style={{marginTop: 8}}>Apply Route</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
