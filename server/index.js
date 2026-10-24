import express from 'express';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { classifyReportWithSource, keywordFallback } from './ai.js';
import { priorityDetails } from './priority.js';
import { groupIncidents } from './incidents.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.env') });

const app = express();
const port = Number(process.env.PORT) || 3000;
const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const indexPath = path.join(distPath, 'index.html');
const reports = [];
let nextReferenceNumber = 1042;
app.use(express.json());

const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const isToday = (date) => new Date(date) >= todayStart();
const refreshPriority = (report) => {
  const similarToday = reports.filter((item) => item.id !== report.id && item.station === report.station &&
    item.category === report.category && isToday(item.createdAt)).length;
  Object.assign(report, priorityDetails(report, similarToday));
  report.similarToday = similarToday;
};

const samples = [
  ['Vanaz', 'Escalator band aahe, elderly passenger is stuck near it'],
  ['Deccan Gymkhana', 'Khup gardi aahe platform var, slippery floor'],
  ['Garware College', 'Crowd building at the platform entrance, slippery floor'],
  ['Chhatrapati Sambhaji Udyan', 'Packed platform, gardi is increasing, slippery floor'],
  ['PMC Bhavan', 'तिकिट मशीन काम करत नाही'],
  ['District Court', 'Smoke smell near the electrical wire'],
  ['Pune Railway Station', 'Toilet area dirty and bad smell'],
  ['Ramwadi', 'QR ticket payment failing'],
  ['Vanaz', 'Lift is broken near the entrance'],
  ['Deccan Gymkhana', 'Platform railing needs repair'],
  ['PMC Bhavan', 'तिकिट मशीन काम करत नाही'],
  ['Ramwadi', 'Crowd rush at gate, child needs help'],
];
for (const [station, text] of samples) {
  const now = new Date();
  const report = { id: randomUUID(), station, text, ...keywordFallback(text), classificationSource: 'keywords', status: 'open', notes: [], createdAt: now.toISOString(), resolvedAt: null };
  refreshPriority(report);
  reports.push(report);
}
const crowdingSamples = reports.filter((r) => ['Deccan Gymkhana', 'Garware College', 'Chhatrapati Sambhaji Udyan'].includes(r.station) && r.category === 'crowding');
crowdingSamples.forEach((report, index) => { report.createdAt = new Date(Date.now() - (25 - index * 8) * 60 * 1000).toISOString(); });
reports[0].status = 'in_progress';
reports[0].notes.push({ text: 'Technician checking the lift', at: new Date().toISOString() });
for (const report of [reports[4], reports[7]]) {
  report.status = 'resolved';
  report.resolvedAt = new Date().toISOString();
}

app.get('/api/status', (_request, response) => response.json({ ai: Boolean(process.env.OPENAI_API_KEY) }));
app.get('/api/reports', (_request, response) => response.json(reports));
app.get('/api/reports/ref/:ref', (request, response) => {
  const report = reports.find((item) => item.referenceId?.toLowerCase() === request.params.ref.trim().toLowerCase());
  if (!report) return response.status(404).json({ error: 'No report found for that reference.' });
  return response.json({ referenceId: report.referenceId, station: report.station, team: report.team, status: report.status, latestNote: report.notes.at(-1)?.text ?? null });
});
app.get('/api/incidents', (_request, response) => response.json(groupIncidents(reports.filter((report) => report.status === 'open' || report.status === 'in_progress'))));

app.post('/api/reports', async (request, response) => {
  const { station, text } = request.body ?? {};
  if (typeof station !== 'string' || !station.trim() || typeof text !== 'string' || text.trim().length < 5) {
    return response.status(400).json({ error: 'Station and a description of at least 5 characters are required.' });
  }
  const { analysis, source } = await classifyReportWithSource(text.trim());
  const report = { id: randomUUID(), referenceId: `MS-${nextReferenceNumber++}`, station: station.trim(), text: text.trim(), ...analysis, classificationSource: source, status: 'open', notes: [], createdAt: new Date().toISOString(), resolvedAt: null };
  refreshPriority(report);
  reports.push(report);
  const recentResolved = reports.find((item) => item.id !== report.id && item.station === report.station && item.category === report.category && item.status === 'resolved' && item.resolvedAt && Date.now() - new Date(item.resolvedAt).getTime() <= 2 * 60 * 60 * 1000);
  if (recentResolved) {
    recentResolved.status = 'open';
    recentResolved.resolvedAt = null;
    recentResolved.notes.push({ text: 'Reopened: reported again', at: new Date().toISOString() });
  }
  return response.status(201).json(report);
});

app.patch('/api/reports/:id', (request, response) => {
  const report = reports.find((item) => item.id === request.params.id);
  if (!report) return response.status(404).json({ error: 'Report not found.' });
  const { status, note } = request.body ?? {};
  if (status !== undefined && !['open', 'in_progress', 'resolved'].includes(status)) return response.status(400).json({ error: 'Invalid status.' });
  if (note !== undefined && (typeof note !== 'string' || !note.trim())) return response.status(400).json({ error: 'Note must not be empty.' });
  if (status) {
    report.status = status;
    report.resolvedAt = status === 'resolved' ? new Date().toISOString() : null;
  }
  if (note) report.notes.push({ text: note.trim(), at: new Date().toISOString() });
  return response.json(report);
});

app.use(express.static(distPath));
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path === '/api' || request.path.startsWith('/api/')) return next();
  if (!existsSync(indexPath)) return next();
  return response.sendFile(indexPath);
});

app.listen(port, () => console.log(`Metro Saathi server listening on http://localhost:${port}`));
