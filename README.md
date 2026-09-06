# Jalavita

Marine safety advisory system for Indian fishermen — a Command Deck for operators and
an offline-first Wayfinder mobile app for vessels, backed by one FastAPI service.

Built for a hackathon in four passes: a real backend behind the Command Deck, an
offline-first PWA for the Wayfinder, live two-way sync between them, and Hindi/Marathi
localization.

## Run it

Requires Python 3.10+.

```
run.bat        (Windows)
./run.sh       (macOS/Linux)
```

This creates a venv, installs dependencies, seeds a SQLite database with 12 vessels off
the Ratnagiri/Malvan coast, and starts one server.

The Command Deck itself now requires signing in — demo credentials are
**`ihalbe` / `Jalavita@251`** (shown on the login page too). This is a hackathon-grade
login (SHA-256 + an in-memory session, no rate limiting or password reset) gating only
the dashboard's page load — the underlying API, the Wayfinder phone app, and the
`/simulator` page are unaffected, since none of them go through this login.

## Fleet-wide alerts and Captain KYC

- **Emergency Protocol** (left rail) sends a CRITICAL alert to every vessel in one click
  and takes over the Command Deck with a centered, blinking red modal.
- **Ocean Scenario Simulator** (`/simulator`) lets you arm a hazard — High Tide, Rough
  Seas, Cyclone, Tsunami — which only becomes visible on the deck (as a centered modal,
  yellow for WARNING severity, red for CRITICAL) until an operator explicitly clicks
  **"Ensure Safety Protocols"** to broadcast it to the fleet. Crisis mode, separately,
  still only ever targets the one vessel it's built around.
- **Field Assist → Captain KYC Verification** holds a per-vessel captain record (name,
  ID type, a masked ID number — never a full one) with Verify/Reject actions and a
  proof-of-ID upload, viewable only while signed in. This is a demo of the verification
  *workflow*, not a real identity-verification integration — no real ID numbers should
  ever be entered here.

## Native Android app (Wayfinder)

`android/` holds the scripts used to package the Wayfinder PWA as an installable
Android app via a Trusted Web Activity (the same technique Twitter Lite/Starbucks use —
no rewrite, same offline code, just a native wrapper). The heavy generated pieces
(a portable JDK 17 and the built Gradle project, including the signing keystore) are
gitignored — rebuild them with:

```
node android/bw-init.js     # requires @bubblewrap/cli installed globally and a
                             # ~/.bubblewrap/config.json pointing at a JDK 17 + Android SDK
cd android/wayfinder-app
bubblewrap build             # produces app-release-signed.apk
adb install -r app-release-signed.apk
```

`bw-init.js` hardcodes the manifest URL it wraps — point it at wherever `/app/manifest.json`
is actually being served before rebuilding.

- Command Deck (operator dashboard): http://localhost:8000
- Wayfinder (fisherman's app):        http://localhost:8000/app

To try the Wayfinder on a phone on the same wifi, open `http://<your-computer-ip>:8000/app`.
Note: the mic (catch report) and MediaRecorder need a secure context, so most mobile
browsers only allow this over `https://` or `localhost` — it will work on the same
machine, but may be blocked on a real phone unless you tunnel it through https (e.g.
`ngrok http 8000`).

## Architecture

```
backend/app/
  models.py   — Pydantic contract: Evidence objects, AdvisoryAnswer, Alert, Ack, Plan…
  db.py       — SQLite schema + seed data (12 vessels, deterministic)
  rules.py    — advisory verdicts, trip-plan risk, geofence distance (shapely)
  events.py   — in-process pub/sub used for the SSE stream
  main.py     — all API routes, static file mounts

frontend/
  index.html  — Command Deck (unchanged visual design, now wired to the API)
  app/        — Wayfinder PWA (manifest, service worker, IndexedDB, i18n)

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
`evaluateOffline()` in `app.js`.

## Manual test checklist

1. **Basic run** — `run.bat`, open both URLs, confirm the dashboard telemetry (`Signal`,
   `Packet Loss`, `Latency`, active vessel count) changes every ~3s and comes from
   `GET /api/state`, not `Math.random()`.
2. **Disconnected state** — stop the backend (Ctrl+C) with the dashboard open; the top
   pill should flip to "DISCONNECTED — showing last known values" within ~3s.
3. **Trip planner** — on the Command Deck, move the sliders and click *Recalculate*;
   fuel/point-of-no-return/wave-margin values should update from a real `POST /api/plan`.
4. **Offline Wayfinder** — open `/app`, then in DevTools → Network, switch to *Offline*.
   Reload: the app still opens (service worker shell) and shows **CACHED** with the
   packet's actual `valid_until` time.
5. **Expired packet** — in DevTools console: `window.__jalavita_debug` exposes
   `render()`/`evaluateOffline()` for manual testing; or just wait past the packet's
   `valid_until` (8h) — the banner moves to **EXPIRED** and the headline refuses to say
   "safe".
6. **Crisis round-trip** — on the Command Deck, Crisis panel → *Escalate to Coast Guard*
   (targets vessel `MH-RTN-408`) or Field Assist → *Send Broadcast* to any vessel. If the
   Wayfinder is open (as `MH-RTN-400` by default — change `DEMO_VESSEL_ID` in `app.js` to
   match) and online, it jumps to the Crisis view and speaks the alert aloud.
   Tap *Acknowledge* — the Command Deck's Archive → Delivery Ledger shows
   `ACKNOWLEDGED` within a few seconds.
7. **Offline ack** — put the Wayfinder offline, tap *Acknowledge* (it queues locally in
   IndexedDB), go back online — the receipt flushes automatically within 20s and appears
   in the ledger exactly once (idempotent via a client-generated UUID).
8. **Language** — tap the `EN`/`हि`/`मर` pill in the Wayfinder status strip; all visible
   strings switch, including offline (no network call is made for translation — the three
   locale files are precached by the service worker).
9. **Species lookup** — type `bangda` in the Advisory view's species box; it resolves to
   Indian mackerel with its thermal/depth range, online or offline (the lexicon ships
   inside the packet).

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
- `POST /api/vessel/{id}/position`, alerts, and ack are open (no auth) — fine for a demo
  on a local network, not for production.
