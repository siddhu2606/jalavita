from __future__ import annotations
import asyncio
import csv
import os
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

from .db import db
from .events import broadcaster
from .rules import compute_advisory, compute_plan
from .models import (
    Evidence, Confidence, VesselOut, AlertIn, AlertOut, AckIn, AckOut,
    PlanRequest, SpeciesOut,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FRONTEND_DIR = os.path.join(ROOT, "frontend")
SPECIES_CSV = os.path.join(ROOT, "data", "species_lexicon.csv")

app = FastAPI(title="Jalavita API")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def audit(text: str, kind: str = "info") -> None:
    conn = db()
    ts = now_utc().isoformat()
    conn.execute("INSERT INTO audit_log (ts, text, kind) VALUES (?,?,?)", (ts, text, kind))
    conn.commit()
    broadcaster.publish("audit", {"ts": ts, "text": text, "kind": kind})


def vessel_row_to_out(row) -> VesselOut:
    return VesselOut(
        id=row["id"], name=row["name"], vessel_class=row["vessel_class"],
        home_port=row["home_port"], operator_name=row["operator_name"],
        preferred_language=row["preferred_language"], lat=row["lat"], lon=row["lon"],
        heading=row["heading"], speed=row["speed"], last_update=row["last_update"],
        status=row["status"],
    )


@app.get("/api/health")
def health():
    return {"status": "ok", "time": now_utc().isoformat()}


@app.get("/api/state")
def get_state():
    conn = db()
    n = conn.execute("SELECT COUNT(*) AS n FROM vessels").fetchone()["n"]
    severe = conn.execute(
        "SELECT COUNT(*) AS n FROM alerts WHERE severity='CRITICAL' AND created_at > ?",
        ((now_utc() - timedelta(hours=24)).isoformat(),),
    ).fetchone()["n"]
    now = now_utc()
    import random
    rng = random.Random(int(now.timestamp() // 5))
    return {
        "active_vessels": Evidence(value=n, unit="count", source="jalavita.vessels", valid_time=now, confidence=Confidence.HIGH).model_dump(mode="json"),
        "severe_alerts": Evidence(value=severe, unit="count", source="jalavita.alerts", valid_time=now, confidence=Confidence.HIGH).model_dump(mode="json"),
        "signal_dbm": Evidence(value=round(-40 - rng.uniform(0, 6), 0), unit="dBm", source="uplink.telemetry", valid_time=now, confidence=Confidence.MEDIUM).model_dump(mode="json"),
        "packet_loss_pct": Evidence(value=round(rng.uniform(0, 0.06), 2), unit="%", source="uplink.telemetry", valid_time=now, confidence=Confidence.MEDIUM).model_dump(mode="json"),
        "latency_ms": Evidence(value=round(110 + rng.uniform(0, 30)), unit="ms", source="uplink.telemetry", valid_time=now, confidence=Confidence.MEDIUM).model_dump(mode="json"),
        "internal_temp_c": Evidence(value=round(13.5 + rng.uniform(0, 1.4), 1), unit="°C", source="rack.sensor", valid_time=now, confidence=Confidence.LOW).model_dump(mode="json"),
        "network_resilience": Evidence(value=94, unit="/100", source="jalavita.mesh", valid_time=now, confidence=Confidence.HIGH).model_dump(mode="json"),
        "updated_at": now.isoformat(),
    }


@app.get("/api/vessels")
def list_vessels():
    conn = db()
    rows = conn.execute("SELECT * FROM vessels ORDER BY id").fetchall()
    return [vessel_row_to_out(r).model_dump(mode="json") for r in rows]


@app.get("/api/vessel/{vessel_id}")
def get_vessel(vessel_id: str):
    conn = db()
    row = conn.execute("SELECT * FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "vessel not found")
    return vessel_row_to_out(row).model_dump(mode="json")


@app.post("/api/vessel/{vessel_id}/position")
async def post_position(vessel_id: str, request: Request):
    body = await request.json()
    conn = db()
    row = conn.execute("SELECT * FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "vessel not found")
    ts = body.get("ts") or now_utc().isoformat()
    conn.execute(
        "UPDATE vessels SET lat=?, lon=?, heading=?, speed=?, last_update=? WHERE id=?",
        (body["lat"], body["lon"], body.get("heading", row["heading"]), body.get("speed", row["speed"]), ts, vessel_id),
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    payload = vessel_row_to_out(updated).model_dump(mode="json")
    broadcaster.publish("vessel_position", payload)
    audit(f"Position update from {vessel_id}: {body['lat']:.3f},{body['lon']:.3f}")
    return payload


@app.get("/api/advisory/{vessel_id}")
def get_advisory(vessel_id: str):
    conn = db()
    row = conn.execute("SELECT * FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "vessel not found")
    answer = compute_advisory(vessel_id, row["lat"], row["lon"])
    return answer.model_dump(mode="json")


@app.get("/api/audit")
def get_audit(limit: int = 50):
    conn = db()
    rows = conn.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [{"id": r["id"], "ts": r["ts"], "text": r["text"], "kind": r["kind"]} for r in rows]


@app.post("/api/alert")
def post_alert(alert: AlertIn):
    conn = db()
    vessel = conn.execute("SELECT * FROM vessels WHERE id=?", (alert.vessel_id,)).fetchone()
    if not vessel:
        raise HTTPException(404, "vessel not found")
    alert_id = str(uuid.uuid4())
    ts = now_utc().isoformat()
    conn.execute(
        "INSERT INTO alerts (id, vessel_id, severity, message, language, created_at, status) VALUES (?,?,?,?,?,?,?)",
        (alert_id, alert.vessel_id, alert.severity.value, alert.message, alert.language, ts, "SENT"),
    )
    ledger_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO ack_ledger (id, alert_id, vessel_id, sent_at, channel, language, delivered_at) VALUES (?,?,?,?,?,?,?)",
        (ledger_id, alert_id, alert.vessel_id, ts, "app", alert.language, ts),
    )
    conn.commit()
    payload = AlertOut(id=alert_id, vessel_id=alert.vessel_id, severity=alert.severity, message=alert.message, created_at=ts, status="SENT").model_dump(mode="json")
    broadcaster.publish("alert", payload)
    audit(f"Alert issued to {alert.vessel_id}: {alert.message}", kind="warn" if alert.severity.value != "CRITICAL" else "bad")
    return payload


@app.get("/api/ledger")
def get_ledger(limit: int = 100):
    conn = db()
    rows = conn.execute(
        "SELECT l.*, a.message, a.severity FROM ack_ledger l LEFT JOIN alerts a ON a.id = l.alert_id "
        "ORDER BY l.sent_at DESC LIMIT ?", (limit,),
    ).fetchall()
    out = []
    for r in rows:
        status = "ACKNOWLEDGED" if r["acknowledged_at"] else ("DELIVERED" if r["delivered_at"] else "SENT")
        out.append({
            "id": r["id"], "alert_id": r["alert_id"], "vessel_id": r["vessel_id"],
            "sent_at": r["sent_at"], "delivered_at": r["delivered_at"], "acknowledged_at": r["acknowledged_at"],
            "channel": r["channel"], "language": r["language"], "late": bool(r["late"]),
            "message": r["message"], "severity": r["severity"], "status": status,
        })
    return out


@app.get("/api/stats/ack-rate")
def ack_rate():
    conn = db()
    since = (now_utc() - timedelta(hours=24)).isoformat()
    total = conn.execute("SELECT COUNT(*) AS n FROM ack_ledger WHERE sent_at > ?", (since,)).fetchone()["n"]
    acked = conn.execute("SELECT COUNT(*) AS n FROM ack_ledger WHERE sent_at > ? AND acknowledged_at IS NOT NULL", (since,)).fetchone()["n"]
    rate = round(100 * acked / total, 1) if total else None
    return {"total": total, "acknowledged": acked, "rate_pct": rate, "window_hours": 24}


@app.post("/api/ack")
def post_ack(ack: AckIn):
    conn = db()
    server_time = now_utc()
    existing = conn.execute("SELECT * FROM ack_ledger WHERE id=?", (ack.receipt_id,)).fetchone()
    if existing:
        return AckOut(receipt_id=ack.receipt_id, alert_id=ack.alert_id, vessel_id=ack.vessel_id,
                       status="ALREADY_RECORDED", late=bool(existing["late"]), server_time=server_time).model_dump(mode="json")

    alert = conn.execute("SELECT * FROM alerts WHERE id=?", (ack.alert_id,)).fetchone()
    late = False
    if alert:
        newer = conn.execute(
            "SELECT COUNT(*) AS n FROM alerts WHERE vessel_id=? AND created_at > ?",
            (ack.vessel_id, alert["created_at"]),
        ).fetchone()["n"]
        late = newer > 0

    row = conn.execute("SELECT * FROM ack_ledger WHERE alert_id=? AND vessel_id=?", (ack.alert_id, ack.vessel_id)).fetchone()
    if row:
        conn.execute(
            "UPDATE ack_ledger SET id=?, acknowledged_at=?, device_time=?, server_time=?, packet_version=?, late=? WHERE alert_id=? AND vessel_id=?",
            (ack.receipt_id, ack.acknowledged_at.isoformat(), ack.acknowledged_at.isoformat(), server_time.isoformat(),
             ack.packet_version, int(late), ack.alert_id, ack.vessel_id),
        )
    else:
        conn.execute(
            "INSERT INTO ack_ledger (id, alert_id, vessel_id, sent_at, channel, language, delivered_at, acknowledged_at, device_time, server_time, packet_version, late) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (ack.receipt_id, ack.alert_id, ack.vessel_id, server_time.isoformat(), ack.channel, ack.language,
             server_time.isoformat(), ack.acknowledged_at.isoformat(), ack.acknowledged_at.isoformat(),
             server_time.isoformat(), ack.packet_version, int(late)),
        )
    conn.execute("UPDATE alerts SET status='ACKNOWLEDGED' WHERE id=?", (ack.alert_id,))
    conn.commit()

    payload = AckOut(receipt_id=ack.receipt_id, alert_id=ack.alert_id, vessel_id=ack.vessel_id,
                      status="ACKNOWLEDGED", late=late, server_time=server_time).model_dump(mode="json")
    broadcaster.publish("ack", payload)
    audit(f"Acknowledgement received from {ack.vessel_id} for alert {ack.alert_id[:8]}" + (" (LATE)" if late else ""), kind="info")
    return payload


@app.post("/api/catch")
async def post_catch(request: Request):
    body = await request.json()
    conn = db()
    rid = body.get("id") or str(uuid.uuid4())
    existing = conn.execute("SELECT id FROM catch_reports WHERE id=?", (rid,)).fetchone()
    if not existing:
        conn.execute(
            "INSERT INTO catch_reports (id, vessel_id, ts, lat, lon, note, synced) VALUES (?,?,?,?,?,?,1)",
            (rid, body.get("vessel_id"), body.get("ts", now_utc().isoformat()), body.get("lat"), body.get("lon"), body.get("note", "")),
        )
        conn.commit()
        audit(f"Catch report received from {body.get('vessel_id')}", kind="info")
    return {"id": rid, "status": "STORED"}


@app.post("/api/plan")
def post_plan(plan: PlanRequest):
    result = compute_plan(plan.departure_hour, plan.duration_hours, plan.cruise_speed_kt, plan.fuel_limit_l)
    return result.model_dump(mode="json")


@app.get("/api/packet/{vessel_id}")
def get_packet(vessel_id: str):
    conn = db()
    row = conn.execute("SELECT * FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "vessel not found")
    now = now_utc()
    advisory = compute_advisory(vessel_id, row["lat"], row["lon"], now)
    hourly = []
    import random
    rng = random.Random(f"packet:{vessel_id}:{int(now.timestamp()//3600)}")
    for h in range(12):
        t = now + timedelta(hours=h)
        hourly.append({
            "hour": t.strftime("%H:%M"),
            "swell_m": round(0.8 + rng.uniform(0, 2.0), 2),
            "wind_kt": round(6 + rng.uniform(0, 14), 1),
        })
    geofence = {
        "type": "boundary_line",
        "name": "Simulated Maritime Boundary (demo)",
        "points": [{"lat": 15.85, "lon": 73.55}, {"lat": 16.35, "lon": 73.65}, {"lat": 16.95, "lon": 73.75}],
        "buffer_km": 8,
    }
    valid_until = (now + timedelta(hours=8)).isoformat()
    return {
        "vessel_id": vessel_id,
        "generated_at": now.isoformat(),
        "valid_until": valid_until,
        "position": {"lat": row["lat"], "lon": row["lon"]},
        "advisory": advisory.model_dump(mode="json"),
        "hourly_forecast": hourly,
        "geofences": [geofence],
        "species_lexicon": _load_species(),
        "packet_version": now.strftime("%Y%m%d%H"),
    }


def _load_species():
    rows = []
    with open(SPECIES_CSV, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            rows.append(r)
    return rows


@app.get("/api/species/resolve")
def resolve_species(q: str, lang: str | None = None):
    q_norm = q.strip().lower()
    matches = []
    for r in _load_species():
        if r["vernacular_name"].lower() == q_norm and (lang is None or r["language"] == lang):
            matches.append(r)
    if not matches:
        for r in _load_species():
            if q_norm in r["vernacular_name"].lower():
                matches.append(r)
    if not matches:
        raise HTTPException(404, "species not found")
    r = matches[0]
    return SpeciesOut(
        vernacular_name=r["vernacular_name"], language=r["language"], region=r["region"],
        scientific_name=r["scientific_name"], sst_min_c=float(r["sst_min_c"]), sst_max_c=float(r["sst_max_c"]),
        depth_min_m=float(r["depth_min_m"]), depth_max_m=float(r["depth_max_m"]),
    ).model_dump(mode="json")


@app.get("/api/species")
def list_species():
    return _load_species()


@app.get("/api/events")
async def sse_events():
    q = broadcaster.subscribe()

    async def gen():
        try:
            yield "event: connected\ndata: {}\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(q.get(), timeout=15)
                    yield payload
                except asyncio.TimeoutError:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            broadcaster.unsubscribe(q)

    return StreamingResponse(gen(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no",
    })


app.mount("/app", StaticFiles(directory=os.path.join(FRONTEND_DIR, "app"), html=True), name="wayfinder")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="deck")
