import { useState, useEffect } from 'react'
import { api, type Vessel } from '../api'

export default function FieldAssistantPage() {
  const [vessels, setVessels] = useState<Vessel[]>([])
  const [target, setTarget] = useState('all')
  const [language, setLanguage] = useState('English')
  const [message, setMessage] = useState('"Maintain 240° SW heading — 2.8m squall swell ahead. Acknowledge on receipt."')
  const [broadcasting, setBroadcasting] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    api.vessels().then(setVessels).catch(console.error)
  }, [])

  const handleBroadcast = async () => {
    setBroadcasting(true)
    setResult('')
    try {
      const resp: any = await api.broadcast(target, language, message)
      setResult(resp.message)
    } catch (e) {
      setResult('Broadcast failed — check connection.')
    } finally {
      setBroadcasting(false)
    }
  }

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Field Assist</h2>
        <span className="panel-sub">Direct vessel advisories &amp; comms relay</span>
      </div>
      <div className="grid grid-split">
        <div className="card">
          <div className="card-title"><svg className="icon"><use href="#i-boat"></use></svg>Active Vessel Roster</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Vessel</th><th>Operator</th><th>Speed</th><th>Status</th><th style={{textAlign: 'right'}}>Action</th></tr></thead>
              <tbody>
                {vessels.map(v => (
                  <tr key={v.mmsi}>
                    <td className="mono" style={{color: 'var(--bio)'}}>{v.name}</td>
                    <td>{v.operator}</td>
                    <td className="mono">{v.speed_kts.toFixed(1)} kts</td>
                    <td>
                      <span className={`chip ${v.status === 'critical' ? 'chip-bad' : v.status === 'warning' ? 'chip-warn' : 'chip-good'}`}>
                        <i className="dot" style={{background: 'currentColor'}}></i>
                        {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                      </span>
                    </td>
                    <td style={{textAlign: 'right'}}>
                      <button className="btn" onClick={() => setTarget(v.mmsi)}>
                        <svg className="icon" style={{width: 13, height: 13}}><use href="#i-bell"></use></svg>Relay
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title"><svg className="icon"><use href="#i-bell"></use></svg>Broadcast Advisory</div>
          <select value={target} onChange={e => setTarget(e.target.value)}>
            <option value="all">All vessels</option>
            {vessels.map(v => <option key={v.mmsi} value={v.mmsi}>{v.name}</option>)}
          </select>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            <option>English</option>
            <option>Marathi</option>
            <option>Hindi</option>
          </select>
          <textarea
            className="code-block"
            style={{minHeight: 60, resize: 'vertical', color: 'var(--ink-dim)', background: 'var(--panel-2)', border: '1px solid var(--panel-line)', borderRadius: 8, padding: 12, fontFamily: 'inherit', fontSize: 12}}
            value={message}
            onChange={e => setMessage(e.target.value)}
          />
          {result && <div className="chip chip-good" style={{width: '100%', padding: '8px 12px', fontSize: 12}}>{result}</div>}
          <button
            className="btn btn-solid btn-block"
            onClick={handleBroadcast}
            disabled={broadcasting}
          >
            <svg className="icon" style={{width: 14, height: 14}}><use href="#i-bell"></use></svg>
            {broadcasting ? 'Sending…' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </section>
  )
}
