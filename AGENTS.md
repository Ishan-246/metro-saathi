# Metro Saathi — AGENTS.md

## Who I am
Ishan Dadape, 2nd-year MBA Tech Computer Engineering student. I know Node.js, Express, REST APIs, JWT, basic React. Explain what you change in simple words.

## The event
DevDay Exchange Community Metro Hackathon, Pune, 24 Oct 2026. Track: Urban Mobility. Building before the event is allowed.
- Tonight (23 Oct): build the core with the keyword fallback (no API key yet).
- Metro sprint 12:00–1:15 (Vanaz → Ramwadi → Vanaz): polish + plug in the real OpenAI call once credits/key arrive. Internet may be patchy, charging very limited.
- Metro Bhavan 3:00–4:30: deploy, test, submit. Top 10 judged at 4:30.

## The idea
Commuters report problems at a metro station in Marathi, Hindi or English (also Marathi typed in English letters, e.g. "Vanaz la escalator band aahe, khup gardi aahe"). AI understands the report; plain rules calculate the priority. Staff see open reports grouped by station, most urgent first, and move them through statuses until fixed.
Principle: AI understands the complaint. Rules decide the priority.

## Website: one responsive site, no app, no login
Page 1 — "/" Commuter page
- Top utility bar: "Prototype for Pune Metro Aqua Line · Not an official Maha-Metro service" on the left; "A+ A A−" text-size buttons on the right.
- Header: "Metro Saathi" + status badge ("AI ready" or "Offline fallback").
- Form card: "स्थानक · Station" dropdown (16 Aqua Line stations), "तक्रार · What's wrong?" text area, "तक्रार नोंदवा · Submit report" button. Min 5 characters, else show "Please describe the problem".
- After submit, commuter result card shows only: “Complaint registered”, short reference ID (MS-1042 style), team, station, “Urgent” (priority 70+) or “Normal”, and similar reports today. If emergency, show the red emergency banner. Priority number, label, and reason are staff-only.
- If Emergency: red banner on the result card: "Emergency: tell station staff now, or call 112. Pune Metro helpline: 1800 270 5501."
- Laptop: short intro on the left, form card on the right. Phone: one column.
- Footer: small "Staff view" link.

Page 2 — "/staff" Staff dashboard ("Metro Saathi · Issue Desk")
- Same utility bar and header + status badge.
- Four stat cards: reports today, open on the line (open + in progress), high/emergency open, resolved today.
- Laptop: Aqua Line strip (16 stations as CSS dots, each showing open-issue count, coloured by highest urgency). Phone: scrolling station chips instead.
- Emergencies pinned at the top with a red banner.
- Open reports grouped by station, highest priority first (tie: oldest first). Each shows: priority label + number, reason line, category, English summary, original text, time, status, team, notes.
- Buttons per report: "Start work" (open → in_progress), "Add note", "Mark resolved", and "Reopen" on resolved ones.
- Auto-refresh every 3 seconds.

## Stack
- Backend: Node.js + Express, ES modules, plain JavaScript (no TypeScript)
- Storage: in-memory array (no database)
- Frontend: React + Vite, plain CSS, simple URL check for the two pages (no router library)
- AI: `openai` npm package, Responses API, all AI code in ONE file: server/ai.js
- Priority: plain rules in ONE file: server/priority.js

## API
- POST  /api/reports       { station, text } → classifies, saves, returns the report
- GET   /api/reports       → all reports
- PATCH /api/reports/:id   { status?, note? } → change status or add a note
- GET   /api/status        → { ai: true/false } for the badge
Report shape: { id, station, text, category, danger, vulnerable, crowded, emergency, summary, priority, label, reason, team, status: "open"|"in_progress"|"resolved", notes: [{text, at}], createdAt, resolvedAt }

## Step A — understanding (server/ai.js)
Returns ONLY: { category, danger, vulnerable, crowded, emergency, summary }. Never a priority.
- If OPENAI_API_KEY exists: call OpenAI with fixed instructions and JSON output; validate category is in the fixed list; on any error or timeout (8 s) use the keyword fallback.
- Keyword fallback (case-insensitive, English / Marathi / Hindi in English letters and Devanagari where easy):
  escalator_lift: escalator, lift, elevator, jinna, सरकता जिना, लिफ्ट
  safety: railing, fire, smoke, shock, wire, fight, theft, chor, aag, आग
  crowding: crowd, rush, bheed, gardi, dhakka, गर्दी, भीड़
  ticketing: ticket, upi, card, qr, machine, recharge, टिकट
  cleanliness: dirty, garbage, kachra, ganda, smell, spill, toilet, कचरा
  danger: stuck, trapped, adakle, fell, padla, injury, blood, fire, smoke, wet, slippery, broken, अडकले
  vulnerable: elderly, old, mhatare, buzurg, child, baby, bacha, wheelchair, pregnant, म्हातारे
  crowded: crowd, rush, bheed, gardi, packed, गर्दी, भीड़
  emergency: stuck, trapped, adakle, fire, smoke, aag, injury, blood, fell
  No category word → "other". Fallback summary = first 80 characters of the text.

## Step B — priority (server/priority.js)
priority = base[category] + (danger ? 25 : 0) + (vulnerable ? 10 : 0) + (crowded ? 10 : 0) + min(similarToday × 5, 15), capped at 100.
If emergency → priority = 100.
- base: safety 60, escalator_lift 50, crowding 45, ticketing 30, cleanliness 25, other 20
- similarToday = reports at the same station, same category, created today (excluding this one)
- label: 100 Emergency, 70–99 High, 40–69 Medium, 0–39 Low
- reason line, e.g. "Lift · someone stuck · elderly · 2 similar"
- team: escalator_lift → Maintenance, cleanliness → Housekeeping, crowding/safety → Station security, ticketing → Ticketing desk, other → Station manager

## Lifecycle and edge cases
- open → in_progress → resolved; Reopen sends it back to open.
- Multiple technician visits: stays in_progress, each visit is a note.
- Auto-reopen: a new similar report within 2 hours of resolving reopens that report and adds a note "Reopened: reported again".
- Duplicates raise priority through similarToday (max +15).
- The app flags and routes; it never calls 112 or dispatches anyone itself.

## Sample data
About 10 reports load when the server starts: mixed Marathi (Devanagari and English letters), Hindi, English; across Vanaz, Deccan Gymkhana, PMC Bhavan, District Court, Pune Railway Station, Ramwadi; include one emergency, one in_progress with a note, two resolved today.

## Style (government transit look, like punemetrorail.org — no logo)
- White background; page sections on very light grey #F4F5F7.
- Top nav/header band: purple #5A4E9C with white text. Thin dark-grey ticker/utility strip #3E4249 with white text.
- Primary buttons: magenta #C2539F, white text. Field labels: magenta #B4428F. Links: blue #1F5FA8. Headings: dark grey #2B2B2B. Body text #3A3A3A.
- Cards: white, 1px border #DADCE0, radius 8px, light shadow. Inputs: 1px border #3B5BA9-ish blue, radius 6px, 44px tall.
- Urgency only: Emergency/High red #C62828, Medium amber #B26A00, Low green #2E7D32, always with the word.
- Font: system stack "Segoe UI", "Nirmala UI", Roboto, Arial, sans-serif (Nirmala UI renders Devanagari on Windows). Uppercase nav labels with letter-spacing.
- Bilingual labels (Marathi · English). Dense, information-first layout. No gradients, no emoji, no 3D, no Maha-Metro/Pune Metro logo.

## Stations (Aqua Line, in order)
Vanaz, Anand Nagar, Paud Phata, SNDT College, Garware College, Deccan Gymkhana, Chhatrapati Sambhaji Udyan, PMC Bhavan, District Court, RTO, Pune Railway Station, Ruby Hall Clinic, Bund Garden, Yerwada, Kalyani Nagar, Ramwadi

## Rules
- One small task at a time. After each, tell me how to run/test it and remind me to commit.
- Never hardcode API keys. Read process.env.OPENAI_API_KEY from server/.env. .env and node_modules in .gitignore.
- Use `npm install --prefer-offline`.
- Warn me before anything slow or risky. If unsure, pick the simpler option.
- Out of scope: login, database, photo upload, WhatsApp, landing page, 3D, Tailwind, router library.

## Build plan
Tonight
1. git init + .gitignore, Express server running → commit
2. server/priority.js + keyword fallback in server/ai.js + all API routes + sample data → test with curl/Thunder Client → commit
3. React commuter page + result card → commit
4. React staff page: stat cards, grouped list, statuses, notes, reopen, 3-sec refresh → commit
5. Write the OpenAI path in server/ai.js (used only when a key exists; untested until tomorrow) → commit → push to GitHub
Metro sprint (12:00–1:15)
6. Aqua Line strip (laptop) / station chips (phone), utility bar, styling polish → commit
7. Add the key to server/.env, test the real AI with 3 sample complaints → commit
Metro Bhavan (3:00–4:30)
8. Deploy to Render, test both pages, record a backup video, push, submit before 4:30. No new features after 4:00.

## If we fall behind, cut in this order
1. Notes  2. Station chips on phone  3. Styling polish  4. Real OpenAI call (keywords still work)
Never cut: submit, priority formula, sorted staff list, status buttons, emergency banner.

## How I work
I use Claude as a second opinion. If you and Claude disagree, I pick the simpler, faster option. I make the final call.
