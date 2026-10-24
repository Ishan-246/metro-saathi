import { useCallback, useEffect, useRef, useState } from 'react';

const stations = ['Vanaz', 'Anand Nagar', 'Paud Phata', 'SNDT College', 'Garware College', 'Deccan Gymkhana', 'Chhatrapati Sambhaji Udyan', 'PMC Bhavan', 'District Court', 'RTO', 'Pune Railway Station', 'Ruby Hall Clinic', 'Bund Garden', 'Yerwada', 'Kalyani Nagar', 'Ramwadi'];
const categoryLabel = { escalator_lift: 'Escalator / lift', cleanliness: 'Cleanliness', crowding: 'Crowding', safety: 'Safety', ticketing: 'Ticketing', other: 'Other' };
const dateLabel = (value) => {
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (elapsed < 1) return 'Just now';
  if (elapsed < 60) return `${elapsed} min ago`;
  const hours = Math.floor(elapsed / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

function ReportCard({ report, update, isNew = false }) {
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const patch = (payload) => update(report.id, payload);
  const reason = (report.reason || '').replace(/\s*\u00b7\s*/g, ' \u00b7 ');
  return <article className={`staff-report ${isNew ? 'new-report' : ''}`}>
    <div className="report-primary"><strong className={`priority-tag ${report.label?.toLowerCase()}`}>{report.label} {'\u00b7'} {report.priority}</strong><p className="report-summary">{report.summary}</p></div>
    <div className="report-meta"><span>{dateLabel(report.createdAt)}</span><span>{report.team}</span><span className={`status-pill ${report.status}`}>{report.status.replace('_', ' ')}</span></div>
    <p className="reason-line">{reason}</p>
    {report.text !== report.summary && <blockquote>{report.text}</blockquote>}
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
  const [selectedStation, setSelectedStation] = useState('');
  const [newReportIds, setNewReportIds] = useState(() => new Set());
  const [ai, setAi] = useState(false);
  const [error, setError] = useState('');
  const knownReportIds = useRef(null);
  const load = useCallback(async () => {
    try {
      const [rr, ss, ii] = await Promise.all([fetch('/api/reports'), fetch('/api/status'), fetch('/api/incidents')]);
      if (!rr.ok || !ii.ok) throw new Error('Could not load reports');
      const incoming = await rr.json();
      if (knownReportIds.current) {
        const fresh = incoming.filter((report) => !knownReportIds.current.has(report.id)).map((report) => report.id);
        if (fresh.length) {
          setNewReportIds((current) => new Set([...current, ...fresh]));
          window.setTimeout(() => setNewReportIds((current) => new Set([...current].filter((id) => !fresh.includes(id)))), 2000);
        }
      }
      knownReportIds.current = new Set(incoming.map((report) => report.id));
      setReports(incoming); setIncidents(await ii.json()); setAi((await ss.json()).ai); setError('');
    } catch { setError('Cannot reach the server. Check npm start.'); }
  }, []);
  useEffect(() => { load(); const timer = setInterval(load, 3000); return () => clearInterval(timer); }, [load]);
  async function update(id, payload) {
    try { const response = await fetch(`/api/reports/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error('Update failed'); await load(); }
    catch (err) { setError(err.message); }
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayReports = reports.filter((r) => new Date(r.createdAt) >= today);
  const openReports = reports.filter((r) => r.status !== 'resolved');
  const filteredOpenReports = selectedStation ? openReports.filter((r) => r.station === selectedStation) : openReports;
  const groups = stations.filter((station) => !selectedStation || station === selectedStation).map((station) => ({ station, reports: filteredOpenReports.filter((r) => r.station === station).sort((a, b) => b.priority - a.priority || new Date(a.createdAt) - new Date(b.createdAt)) })).filter((g) => g.reports.length);
  const emergencies = filteredOpenReports.filter((r) => r.emergency).sort((a, b) => b.priority - a.priority || new Date(a.createdAt) - new Date(b.createdAt));
  const resolvedToday = todayReports.filter((r) => r.status === 'resolved').sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));
  const shownIncidents = incidents.filter((incident) => incident.reportCount >= 2);
  const updateReport = (id, payload) => update(id, payload);

  return <>
    <div className="utility"><span>Prototype for Pune Metro Aqua Line {'\u00b7'} Not an official Maha-Metro service</span><span>A+　A　A−</span></div>
    <header className="header"><div className="header-inner"><a className="brand" href="/">Metro Saathi {'\u00b7'} Issue Desk</a><span className="badge">{ai ? 'AI ready' : 'Offline fallback'}</span><a className="staff-home" href="/">Commuter page</a></div></header>
    <main className="staff-main"><h1>Staff dashboard</h1>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="stats" aria-label="Report statistics"><Stat value={todayReports.length} label="Reports today" /><Stat value={openReports.length} label="Open on the line" /><Stat value={openReports.filter((r) => r.priority >= 70).length} label="High / emergency open" /><Stat value={todayReports.filter((r) => r.status === 'resolved').length} label="Resolved today" /></section>
      <section className="station-strip"><div className="station-strip-head"><h2>Aqua Line stations</h2><button className="all-stations" onClick={() => setSelectedStation('')}>All stations</button></div><div className="station-dots">{stations.map((name) => { const items = openReports.filter((r) => r.station === name); const max = Math.max(0, ...items.map((r) => r.priority)); const label = name === 'Chhatrapati Sambhaji Udyan' ? 'Sambhaji Udyan' : name; return <button className={`station-dot ${max >= 70 ? 'high' : max >= 40 ? 'medium' : items.length ? 'low' : ''} ${selectedStation === name ? 'selected' : ''}`} onClick={() => setSelectedStation((current) => current === name ? '' : name)} key={name} title={`${name}: ${items.length} open`} aria-pressed={selectedStation === name}><i>{items.length}</i><span>{label}</span></button>; })}</div></section>
      {emergencies.length > 0 && <section className="emergency-list"><h2>Emergencies {'\u00b7'} immediate attention</h2>{emergencies.map((r) => <div className="emergency-entry" key={r.id}><div className="emergency-banner">Emergency {'\u00b7'} tell station staff now {'\u00b7'} 112 / Pune Metro helpline 1800 270 5501</div><ReportCard report={r} update={updateReport} isNew={newReportIds.has(r.id)} /></div>)}</section>}
      <section className="incidents"><h2>Incidents</h2>{shownIncidents.map((incident) => <article className={`incident-card ${incident.label?.toLowerCase()}`} key={incident.reportIds.join('-')}><strong>{categoryLabel[incident.category] ?? 'Other'} {incident.stations.length === 1 ? 'at' : 'across'} {incident.stations.join(', ')}</strong> <span>{'\u00b7'} {incident.reportCount} reports {'\u00b7'} {incident.label}</span></article>)}{shownIncidents.length === 0 && <p className="muted">No linked reports yet.</p>}</section>
      <section className="station-reports"><h2>Reports by station</h2>{groups.map(({ station, reports: items }) => <section className="station-group" id={`station-${encodeURIComponent(station)}`} key={station}><h3>{station}<span>{items.length} open</span></h3>{items.map((r) => <ReportCard key={r.id} report={r} update={updateReport} isNew={newReportIds.has(r.id)} />)}</section>)}</section>
      <details className="resolved-section"><summary>Resolved today ({resolvedToday.length})</summary>{resolvedToday.length ? resolvedToday.map((r) => <ReportCard key={r.id} report={r} update={updateReport} />) : <p className="muted">No reports resolved today.</p>}</details>
    </main>
    <footer><a href="/">Commuter page</a><span>Includes sample reports for demo. Data resets on restart (prototype, no database).</span></footer>
  </>;
}
function Stat({ value, label }) { return <article className="stat-card"><strong>{value}</strong><span>{label}</span></article>; }
