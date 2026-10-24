import { useEffect, useState } from 'react';
import Staff from './Staff.jsx';

const stations = ['Vanaz', 'Anand Nagar', 'Paud Phata', 'SNDT College', 'Garware College', 'Deccan Gymkhana', 'Chhatrapati Sambhaji Udyan', 'PMC Bhavan', 'District Court', 'RTO', 'Pune Railway Station', 'Ruby Hall Clinic', 'Bund Garden', 'Yerwada', 'Kalyani Nagar', 'Ramwadi'];
const referenceFor = (report) => report.referenceId || `MS-${1000 + [...report.id].reduce((n, char) => (n * 31 + char.charCodeAt(0)) % 9000, 0)}`;

export default function App() {
  const [station, setStation] = useState('Vanaz'); const [text, setText] = useState(''); const [report, setReport] = useState(null);
  const [error, setError] = useState(''); const [ai, setAi] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const isStaffPage = window.location.pathname === '/staff';
    document.title = isStaffPage ? 'Metro Saathi · Issue Desk' : 'Metro Saathi · Report an issue';
    if (isStaffPage) return;
    fetch('/api/status').then((r) => r.json()).then((data) => setAi(data.ai)).catch(() => setAi(false));
  }, []);
  async function submit(event) {
    event.preventDefault(); setReport(null);
    if (text.trim().length < 5) { setError('Please describe the problem'); return; }
    setError(''); setBusy(true);
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ station, text: text.trim() }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not submit the report.'); setReport(data);
    } catch (err) { setError(`${err.message} Check that the server is running.`); } finally { setBusy(false); }
  }
  if (window.location.pathname === '/staff') return <Staff />;
  return <>
    <div className="utility"><span>Prototype for Pune Metro Aqua Line · Not an official Maha-Metro service</span><div className="text-tools" aria-label="Text size"><button>A+</button><button>A</button><button>A−</button></div></div>
    <header className="header"><div className="header-inner"><a className="brand" href="/"><svg className="train-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a3 3 0 0 1 3 3v10a4 4 0 0 1-2.2 3.58L20 21h-2l-2-2H8l-2 2H4l2.2-2.42A4 4 0 0 1 4 15V5a3 3 0 0 1 3-3Zm-1 3v6h12V5a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1Zm0 8v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2H6Zm2 1h2v2H8v-2Zm6 0h2v2h-2v-2Z" fill="currentColor"/></svg><span>Metro Saathi</span></a><span className="badge">{ai ? 'AI ready' : 'Offline fallback'}</span></div></header>
    <main className="layout">
      <section className="intro"><p className="eyebrow">PUNE METRO · AQUA LINE</p><h1>Help make your journey safer.</h1><p>Tell us what is happening at your station. Your report will be routed to the right team, with urgent issues brought forward first.</p><div className="notice"><strong>Emergency?</strong> Tell station staff now, or call 112. Pune Metro helpline: 1800 270 5501.</div></section>
      <section className="panel"><h2>Report a problem</h2><p className="subheading">तक्रार नोंदवा · Submit a report</p>
        <form onSubmit={submit}><label htmlFor="station">स्थान · Station</label><select id="station" value={station} onChange={(e) => setStation(e.target.value)}>{stations.map((item) => <option key={item}>{item}</option>)}</select>
          <label htmlFor="description">तक्रार · What's wrong?</label><div className="examples"><span>Try:</span>{['Vanaz la escalator band aahe, khup gardi aahe', 'प्लेटफॉर्म पर बहुत भीड़ है', 'Stairs are wet and slippery near platform 2'].map((example) => <button type="button" key={example} onClick={() => setText(example)}>{example}</button>)}</div><textarea id="description" value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe the problem in Marathi, Hindi or English…" rows="5" />
          <div className="form-foot"><span>Minimum 5 characters</span><button className="primary" disabled={busy}>{busy ? 'Sending…' : 'तक्रार नोंदवा · Submit report'}</button></div>{error && <p className="error" role="alert">{error}</p>}
        </form>
        {report && <article className="result" aria-live="polite">{report.emergency && <div className="emergency-banner">Emergency: tell station staff now, or call 112. Pune Metro helpline: 1800 270 5501.</div>}<h3 className="registered">Complaint registered</h3><p className="reference">Reference: {referenceFor(report)}</p>
          <dl><div><dt>Sent to</dt><dd>{report.team}</dd></div><div><dt>Station</dt><dd>{report.station}</dd></div><div><dt>Priority</dt><dd>{report.priority >= 70 ? 'Urgent' : 'Normal'}</dd></div><div><dt>Similar reports today</dt><dd>{report.similarToday ?? 0}</dd></div></dl><button type="button" className="primary another-report" onClick={() => { setReport(null); setText(''); setError(''); setStation('Vanaz'); }}>Report another problem</button>
        </article>}
      </section>
    </main><footer><a href="/staff">Staff view</a><span>Metro Saathi · Prototype</span></footer>
  </>;
}
