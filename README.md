# Jalavita

<p align="left">
  <img alt="Python" src="https://img.shields.io/badge/python-3.12-2fe6c6?style=flat-square">
  <img alt="FastAPI" src="https://img.shields.io/badge/backend-FastAPI-0d1420?style=flat-square">
  <img alt="Offline-first" src="https://img.shields.io/badge/wayfinder-offline--first%20PWA-0d1420?style=flat-square">
  <img alt="Hackathon" src="https://img.shields.io/badge/SIH-26176-ffb547?style=flat-square">
</p>

Marine safety advisory system for Indian fishermen — a Command Deck for coastal operators
and an offline-first Wayfinder app for vessels, both backed by one FastAPI service, plus
a plain-SMS gateway for boats with no data plan at all.

**[→ Project site & live demo links](https://siddhu2606.github.io/jalavita/)**
Built for Smart India Hackathon SIH26176 — *"ORCA: Marine Ecosystem Reasoning with
Collaborative Agents"* — Team V/Slash, VIT Pune.

## Run it

Requires Python 3.10+.

```
run.bat        (Windows)
./run.sh       (macOS/Linux)
```

This creates a venv, installs dependencies, seeds a SQLite database with 12 vessels off
the Ratnagiri/Malvan coast, and starts one server.

- Command Deck (operator dashboard): http://localhost:8000
- Wayfinder (fisherman's app): http://localhost:8000/app
- Install Wayfinder via QR (works on any phone on the same network): http://localhost:8000/install
- Ocean Scenario Simulator + offline-SMS simulator: http://localhost:8000/simulator

The Command Deck requires signing in — demo credentials are **`ihalbe` / `Jalavita@251`**
(shown on the login page too). This is a hackathon-grade login (SHA-256 + an in-memory
session, no rate limiting or password reset) gating only the dashboard's page load — the
underlying API, the Wayfinder phone app, and the `/simulator` page are unaffected, since
none of them go through this login.

To try the Wayfinder on a phone on the same wifi, open `http://<your-computer-ip>:8000/app`
or scan the QR at `/install`. Note: the mic (catch report) and MediaRecorder need a secure
context, so most mobile browsers only allow this over `https://` or `localhost` — it will
work on the same machine, but may be blocked on a real phone unless you tunnel it through
https (e.g. `ngrok http 8000` or a Cloudflare quick tunnel).

<details>
<summary><b>Optional: enable real SMS (Twilio)</b></summary>

Everything above works with zero external accounts — SMS sends are logged as
`SIMULATED` and the pipeline is fully demoable via `/simulator`. To send/receive real
text messages:

1. Copy `backend/.env.example` to `backend/.env`.
2. Fill in `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` from
   [console.twilio.com](https://console.twilio.com).
3. On a trial account, add any phone you want to actually receive alerts on under
   **Phone Numbers → Manage → Verified Caller IDs**.
4. Restart the server — `GET /api/sms/status` should report `"configured": true`.

`backend/.env` is gitignored; credentials never need to touch git history or chat.
</details>

## What's built

- **Emergency Protocol** (left rail) sends a CRITICAL alert to every vessel in one click —
  takes over the Command Deck with a centered, blinking red modal, and fires a real SMS to
  any vessel with a phone number on file.
- **Ocean Scenario Simulator** (`/simulator`) lets you arm a hazard — High Tide, Rough
  Seas, Cyclone, Tsunami — which only becomes visible on the deck (as a centered modal,
  yellow for WARNING severity, red for CRITICAL) until an operator explicitly clicks
  **"Ensure Safety Protocols"** to broadcast it to the fleet. Crisis mode, separately,
  still only ever targets the one vessel it's built around.
- **Fisherman Tips** — a tip (rising tide, storm signs, tsunami signs) from the app *or*
  by SMS lands as an unverified report with three explicit review actions: **Verify**,
  **Ensure Safety Protocol**, **Clear**. The deck can't tell which channel a tip arrived
  on, because it doesn't need to.
- **SMS Gateway** (Twilio) — every fleet alert also attempts a real SMS to each vessel's
  registered number, logged `SENT`/`FAILED`/`SIMULATED` (never silently faked). Inbound
  SMS from an offline fisherman is parsed, matched to a vessel, keyword-classified, and
  fed into the same tip pipeline above.
- **Twin Trip Planner** — departure time, duration, and speed sync live between the
  Command Deck and the Wayfinder in either direction (SSE + polling fallback, with a
  short anti-flicker window so a live slider drag doesn't fight a same-moment refresh).
- **Field Assist → Captain KYC** holds a per-vessel captain record (name, ID type, a
  masked ID number — never a full one) with Verify/Reject actions and a proof-of-ID
  upload, viewable only while signed in. This is a demo of the verification *workflow*,
  not a real identity-verification integration — no real ID numbers should ever be
  entered here.
- **Install-by-QR** (`/install`) — scanning it opens the Wayfinder in the phone's own
  browser and prompts a standard PWA install (Add to Home Screen). No APK, no "allow
  unknown sources," works fully offline immediately after first load.
- **CSV export gated by a security code**, live toast notifications for new tips, and an
  honestly-labeled Analytics panel (real fleet telemetry vs. explicitly marked
  illustrative charts).

## Native Android app (Wayfinder)

`android/` holds the scripts used to package the Wayfinder PWA as an installable Android
app via a Trusted Web Activity (the same technique Twitter Lite/Starbucks use — no
rewrite, same offline code, just a native wrapper). The heavy generated pieces (a
portable JDK 17 and the built Gradle project, including the signing keystore) are
gitignored — rebuild them with:

```
node android/bw-init.js     # requires @bubblewrap/cli installed globally and a
                             # ~/.bubblewrap/config.json pointing at a JDK 17 + Android SDK
cd android/wayfinder-app
bubblewrap build             # produces app-release-signed.apk
adb install -r app-release-signed.apk
```

`bw-init.js` hardcodes the manifest URL it wraps — point it at wherever `/app/manifest.json`
is actually being served before rebuilding. For most demos, `/install`'s QR-to-PWA flow
above is the faster path — no APK signing, no `adb`, works on any phone that can scan a
code.

## Architecture

```
backend/app/
  models.py   — Pydantic contract: Evidence objects, AdvisoryAnswer, Alert, Ack, Plan…
  db.py       — SQLite schema + seed data (12 vessels, deterministic)
  rules.py    — advisory verdicts, trip-plan risk, geofence distance, distance-to-coast
  events.py   — in-process pub/sub used for the SSE stream
  main.py     — all API routes: advisory, alerts, tips, trip plans, KYC, SMS gateway

frontend/
  index.html    — Command Deck (dashboard, KYC, SMS gateway, analytics)
  login.html    — Command Deck sign-in
  install.html  — QR install page for the Wayfinder PWA
  simulator.html— Ocean Scenario Simulator + offline-SMS simulator
  app/          — Wayfinder PWA (manifest, service worker, IndexedDB, i18n)

docs/
  index.html  — public project site (GitHub Pages)

data/
  jalavita.db            — generated on first run
  species_lexicon.csv    — Konkan/Maharashtra vernacular fish names
```

## The data contract

Every measured quantity in the system is an **Evidence object** — never a bare number:

```json
{ "value": 1.4, "unit": "m", "source": "INCOIS", "valid_time": "...", "confidence": "HIGH", "sigma": 0.2 }
```

`Evidence` is a Pydantic model (`backend/app/models.py`) that rejects an object missing
`source` or `valid_time`, and rejects a fabricated value paired with `confidence: UNKNOWN`.
If a reading is unavailable, the API returns `value: null, confidence: "UNKNOWN"` — it
never guesses.

## Why offline is the core feature

Cellular coverage ends 10–20km offshore — exactly where the advisory matters most. The
Wayfinder downloads a **briefing packet** (`GET /api/packet/{vessel_id}`) at harbour while
it still has signal, caches it in IndexedDB, and a Service Worker caches the app shell.
A deterministic, on-device rules engine (`frontend/app/app.js`, no network, no LLM)
re-evaluates the cached packet locally and walks a five-state degradation ladder:

| State | Condition | What's shown |
|---|---|---|
| LIVE | online, packet fresh | normal advisory |
| DEGRADED | online, a reading is >3h old | "provisional" banner, hedge kept |
| CACHED | offline, packet still valid | "working from your HH:MM packet, valid until HH:MM" |
| EXPIRED | offline, packet past `valid_until` | "I can't verify current conditions" |
| NO DATA | no packet ever cached | "I cannot advise. Contact your harbour officer." |

**The rule that matters:** absence of a signal is never treated as safety. Missing or
expired data always degrades toward a warning, never toward "all clear" — enforced in
`evaluateOffline()` in `app.js`. The SMS gateway extends this same principle to boats with
no app at all: a fleet alert reaches a bare phone over plain cellular signal, no data
connection required.

## Manual test checklist

<details>
<summary>9 steps to verify the whole system end-to-end</summary>

1. **Basic run** — `run.bat`, open both URLs, confirm the dashboard telemetry (`Signal`,
   `Packet Loss`, `Latency`, active vessel count) changes every ~3s and comes from
   `GET /api/state`, not `Math.random()`.
2. **Disconnected state** — stop the backend (Ctrl+C) with the dashboard open; the top
   pill should flip to "DISCONNECTED — showing last known values" within ~3s.
3. **Trip planner sync** — move the sliders on the Command Deck; open the Wayfinder's
   Chart tab for the same vessel and confirm the mini sliders update within a few seconds,
   and vice versa.
4. **Offline Wayfinder** — open `/app`, then in DevTools → Network, switch to *Offline*.
   Reload: the app still opens (service worker shell) and shows **CACHED** with the
   packet's actual `valid_until` time.
5. **Fisherman tip → deck → back** — submit a tip from the Wayfinder (or via
   `/simulator`'s SMS panel); confirm it appears under Field Assist → Fisherman Tips with
   Verify/Ensure Safety Protocol/Clear actions, and that Verify arms the scenario modal.
6. **Emergency Protocol** — click it on the deck; confirm every vessel gets a CRITICAL
   alert, the centered red modal appears, and (if Twilio is configured) a real SMS lands
   on any vessel with a real phone number attached.
7. **Crisis round-trip** — Command Deck Crisis panel → *Escalate to Coast Guard* (targets
   `MH-RTN-408` by default). If the Wayfinder is open as that vessel and online, it jumps
   to the Crisis view and speaks the alert aloud; tapping *Acknowledge* shows up in the
   deck's Delivery Ledger within a few seconds.
8. **Language** — use the language dropdown in the Wayfinder status strip; all visible
   strings switch, including offline (no network call — the three locale files are
   precached by the service worker).
9. **Install by QR** — open `/install` on a laptop, scan it with a phone, confirm Chrome
   offers to install as a home-screen app, and that it still opens after switching the
   phone to airplane mode.

</details>

## Known scope cuts (being upfront about them)

- The "maritime boundary" used for the crisis/geofence demo is a **simulated** line off
  the Konkan coast for demo purposes — not the real IMBL.
- Catch-report audio is queued whole in IndexedDB and retried as a whole file when back
  online; true chunked/resumable upload for large recordings was not built.
- Devanagari rendering relies on the OS's installed fonts (Windows/Android/iOS all ship
  one) plus a Google Fonts `@import` for polish when online — no font file is bundled,
  so a machine with zero Devanagari font support would show tofu boxes when fully
  offline on first-ever load. This is a reasonable bet for a hackathon demo, not a
  guarantee.
- `POST /api/vessel/{id}/position` and vessel telemetry endpoints are open (no auth) —
  fine for a demo on a local network, not for production.
- Twilio SMS to Indian numbers is outbound-only by carrier design (the sender ID gets
  stripped in transit), so a real inbound text can't round-trip on a trial account — the
  `/simulator` SMS panel exercises the identical backend code path a real carrier webhook
  would hit, so the pipeline is provably real without needing that round-trip.
- **Sagar Sentinel** (the radio-beacon concept on the [project site](https://siddhu2606.github.io/jalavita/))
  is a Phase 2 roadmap visualization — no hardware has been built or tested.
