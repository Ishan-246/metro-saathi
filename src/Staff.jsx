import { useCallback, useEffect, useState } from 'react';

const stations = ['Vanaz', 'Anand Nagar', 'Paud Phata', 'SNDT College', 'Garware College', 'Deccan Gymkhana', 'Chhatrapati Sambhaji Udyan', 'PMC Bhavan', 'District Court', 'RTO', 'Pune Railway Station', 'Ruby Hall Clinic', 'Bund Garden', 'Yerwada', 'Kalyani Nagar', 'Ramwadi'];
const dateLabel = (value) => new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

function ReportCard({ report, update }) {
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const patch = (payload) => update(report.id, payload);
  return <article className={`staff-report ${report.emergency ? 'staff-emergency' : ''}`}>
    {report.emergency && <div className="emergency">Emergency · tell station staff now · 112 / Pune Metro helpline 1800 270 5501</div>}
    <div className="staff-report-head"><strong className={`priority-tag ${report.label?.toLowerCase()}`}>{report.label} · {report.priority}</strong><span className={`status-pill ${report.status}`}>{report.status.replace('_', ' ')}</span></div>
    <p className="reason-line">{report.reason}</p><p><strong>{report.category.replace('_', ' ')}</strong> · {report.summary}</p>
    <blockquote>{report.text}</blockquote>
    <div className="report-meta"><span>{dateLabel(report.createdAt)}</span><span>{report.team}</span></div>
    {report.notes?.length > 0 && <ul className="notes">{report.notes.map((item, i) => <li key={`${item.at}-${i}`}>{item.text} <small>{dateLabel(item.at)}</small></li>)}</ul>}
    <div className="report-actions">
      {report.status === 'open' && <button onClick={() => patch({ status: 'in_progress' })}>Start work</button>}
      {report.status !== 'resolved' && <button onClick={() => setNoteOpen((open) => !open)}>Add note</button>}
      {report.status !== 'resolved' && <button onClick={() => patch({ status: 'resolved' })}>Mark resolved</button>}
      {report.status === 'resolved' && <button onClick={() => patch({ status: 'open' })}>Reopen</button>}
    </div>
    {noteOpen && <form className="note-form" onSubmit={(e) => { e.preventDefault(); if (note.trim()) { patch({ note: note.trim() }); setNote(''); setNoteOpen(false); } }}><input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Technician visit or update" required /><button type="submit">Save note</button></form>}
  </article>;
}

export default function Staff() {
  const [reports, setReports] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [ai, setAi] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { const [rr, ss, ii] = await Promise.all([fetch('/api/reports'), fetch('/api/status'), fetch('/api/incidents')]); if (!rr.ok || !ii.ok) throw new Error('Could not load reports'); setReports(await rr.json()); setIncidents(await ii.json()); setAi((await ss.json()).ai); setError(''); }
    catch { setError('Cannot reach the server. Check npm start.'); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [load]);

  async function update(id, payload) {
    try { const response = await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error('Update failed'); await load(); }
    catch (err) { setError(err.message); }
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayReports = reports.filter((r) => new Date(r.createdAt) >= today);
  const openReports = reports.filter((r) => r.status !== 'resolved');
  const groups = stations.map((station) => ({ station, reports: reports.filter((r) => r.station === station).sort((a, b) => b.priority - a.priority || new Date(a.createdAt) - new Date(b.createdAt)) })).filter((g) => g.reports.length);
  const emergencies = reports.filter((r) => r.emergency && r.status !== 'resolved').sort((a, b) => b.priority - a.priority || new Date(a.createdAt) - new Date(b.createdAt));
  const updateReport = (id, payload) => update(id, payload);

  return <>
    <div className="utility"><span>Prototype for Pune Metro Aqua Line · Not an official Maha-Metro service</span><span>A+　A　A−</span></div>
    <header className="header"><div className="header-inner"><a className="brand" href="/">Metro Saathi · Issue Desk</a><span className="badge">{ai ? 'AI ready' : 'Offline fallback'}</span><a className="staff-home" href="/">Commuter page</a></div></header>
    <main className="staff-main"><h1>Staff dashboard</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="stats" aria-label="Report statistics">
        <Stat value={todayReports.length} label="Reports today" /><Stat value={openReports.length} label="Open on the line" /><Stat value={openReports.filter((r) => r.priority >= 70).length} label="High / emergency open" /><Stat value={todayReports.filter((r) => r.status === 'resolved').length} label="Resolved today" />
      </section>
      <section className="station-strip"><h2>Aqua Line stations</h2><div className="station-dots">{stations.map((name) => { const items = openReports.filter((r) => r.station === name); const max = Math.max(0, ...items.map((r) => r.priority)); return <a className={`station-dot ${max >= 70 ? 'high' : max >= 40 ? 'medium' : items.length ? 'low' : ''}`} href={`#station-${encodeURIComponent(name)}`} key={name} title={`${name}: ${items.length} open`}><i>{items.length}</i><span>{name}</span></a>; })}</div></section>
      {emergencies.length > 0 && <section className="emergency-list"><h2>Emergencies · immediate attention</h2>{emergencies.map((r) => <ReportCard key={r.id} report={r} update={updateReport} />)}</section>}
      <section className="incidents"><h2>Incidents</h2>{incidents.filter((incident) => incident.reportCount >= 2).map((incident) => <article className="incident-card" key={incident.reportIds.join('-')}><strong>{incident.category === 'crowding' ? 'Crowding' : incident.category.replace('_', ' ')}</strong> across {incident.stations.join(', ')} <span>· {incident.reportCount} reports · {incident.label}</span></article>)}{incidents.every((incident) => incident.reportCount < 2) && <p className="muted">No linked reports yet.</p>}</section>
      <section className="station-reports"><h2>Reports by station</h2>{groups.map(({ station, reports: items }) => <section className="station-group" id={`station-${encodeURIComponent(station)}`} key={station}><h3>{station}<span>{items.filter((r) => r.status !== 'resolved').length} open</span></h3>{items.map((r) => <ReportCard key={r.id} report={r} update={updateReport} />)}</section>)}</section>
    </main>
    <footer><a href="/">Commuter page</a><span>Auto-refreshes every 3 seconds</span></footer>
  </>;
}
function Stat({ value, label }) { return <article className="stat-card"><strong>{value}</strong><span>{label}</span></article>; }
