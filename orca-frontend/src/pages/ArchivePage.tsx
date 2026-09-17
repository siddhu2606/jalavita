import { useState, useEffect } from 'react'
import { api, type ArchiveLog } from '../api'

function formatBytes(b: number) {
  if (b >= 1e9) return (b / 1e9).toFixed(1) + ' GB'
  if (b >= 1e6) return (b / 1e6).toFixed(1) + ' MB'
  if (b >= 1e3) return (b / 1e3).toFixed(0) + ' KB'
  return b + ' B'
}

export default function ArchivePage() {
  const [logs, setLogs] = useState<ArchiveLog[]>([])
  const [selected, setSelected] = useState<ArchiveLog | null>(null)
  const [severityFilter, setSeverityFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.archive(severityFilter || undefined)
      .then(data => { setLogs(data); setLoading(false) })
      .catch(console.error)
  }, [severityFilter])

  return (
    <section className="panel reveal-scale">
      <div className="panel-head">
        <h2>Archive</h2>
        <span className="panel-sub">Immutable telemetry &amp; provenance logs</span>
      </div>

      <div className="card" style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12}}>
        <svg className="icon" style={{color: 'var(--ink-faint)'}}><use href="#i-filter"></use></svg>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">All Outcomes</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="normal">Normal</option>
        </select>
        <button className="btn btn-solid" style={{marginLeft: 'auto'}}>
          <svg className="icon" style={{width: 14, height: 14}}><use href="#i-download"></use></svg>Export Selected
        </button>
      </div>

      <div className="grid grid-split">
        <div className="card">
          {loading ? (
            <div style={{padding: 24, color: 'var(--ink-faint)'}}>Loading archive…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp (UTC)</th>
                    <th>Vessel ID</th>
                    <th>Incident Type</th>
                    <th style={{textAlign: 'right'}}>Size</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      onClick={() => setSelected(log)}
                      style={{cursor: 'pointer', background: selected?.id === log.id ? 'rgba(47,230,198,.06)' : undefined}}
                    >
                      <td className="mono">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="mono" style={{color: 'var(--bio)'}}>{log.vessel_id}</td>
                      <td>{log.incident_type}</td>
                      <td className="mono" style={{textAlign: 'right'}}>{formatBytes(log.size_bytes)}</td>
                      <td>
                        <span className={`chip ${log.severity === 'critical' ? 'chip-bad' : log.severity === 'warning' ? 'chip-warn' : 'chip-good'}`}>
                          <i className="dot" style={{background: 'currentColor'}}></i>
                          {log.severity.charAt(0).toUpperCase() + log.severity.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><svg className="icon"><use href="#i-archive"></use></svg>Entry Preview</div>
          {selected ? (
            <>
              <div style={{fontSize: 10.5, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.05em'}}>Coordinates</div>
              <div className="mono" style={{fontSize: 13, color: 'var(--bio)'}}>{selected.latitude.toFixed(2)}°N · {selected.longitude.toFixed(2)}°E</div>
              <div className="code-block">
                {'{'}<br/>
                &nbsp;&nbsp;<span className="k">"log_id"</span>: <span className="v">"{`L-${selected.id}-A`}"</span>,<br/>
                &nbsp;&nbsp;<span className="k">"source"</span>: <span className="v">"{selected.source_node || 'N/A'}"</span>,<br/>
                &nbsp;&nbsp;<span className="k">"operator"</span>: <span className="v">"{selected.operator_id || 'N/A'}"</span>,<br/>
                &nbsp;&nbsp;<span className="k">"severity"</span>: <span className="v">"{selected.severity}"</span><br/>
                {'}'}
              </div>
              <div className="kv-grid">
                <div className="kv"><div className="kv-label">Size</div><div className="kv-value" style={{fontSize: 14}}>{formatBytes(selected.size_bytes)}</div></div>
                <div className="kv"><div className="kv-label">Notes</div><div className="kv-value" style={{fontSize: 12}}>{selected.notes || '—'}</div></div>
              </div>
              <button className="btn btn-solid btn-block">View Full Dossier</button>
            </>
          ) : (
            <div style={{color: 'var(--ink-faint)', fontSize: 12, padding: 12}}>Click a row to preview the entry.</div>
          )}
        </div>
      </div>
    </section>
  )
}
