from __future__ import annotations
import asyncio
import csv
import os
import secrets
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .db import db, hash_password
from .events import broadcaster
from .rules import compute_advisory, compute_plan, distance_to_coast
from .models import (
    Evidence, Confidence, VesselOut, AlertIn, AlertOut, AckIn, AckOut,
    PlanRequest, SpeciesOut,
)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
FRONTEND_DIR = os.path.join(ROOT, "frontend")
SPECIES_CSV = os.path.join(ROOT, "data", "species_lexicon.csv")
KYC_UPLOAD_DIR = os.path.join(ROOT, "data", "kyc_uploads")

app = FastAPI(title="Jalavita API")

# In-memory session store — fine for a single-process demo, not for production.
SESSIONS: dict[str, dict] = {}
SESSION_COOKIE = "jalavita_session"


def get_current_operator(request: Request) -> dict | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    return SESSIONS.get(token)


def require_operator(request: Request) -> dict:
    op = get_current_operator(request)
    if not op:
        raise HTTPException(401, "login required")
    return op

REQUEST_COUNTS = {"position": 0, "telemetry": 0, "background": 0}
ORCA9_ID = "MH-RTN-408"

# Fleet-wide situation state (Emergency Protocol / Scenario Simulator).
# Emergency Protocol alerts every vessel immediately, in one action.
# A scenario only becomes visible on the dashboard until an operator explicitly
# broadcasts it via "Ensure Safety Protocols" — it never reaches a vessel on its own.
SITUATION = {
    "active": False, "source": None, "type": None, "label": None,
    "message": None, "severity": None, "set_at": None, "sent_at": None, "sent_count": 0,
}

SCENARIO_TEMPLATES = {
    "high_tide": {
        "label": "High Tide Warning", "severity": "WARNING",
        "message": "उधाणाची भरती अपेक्षित आहे — किनाऱ्याजवळ सावधगिरी बाळगा. (High tide expected — exercise caution near shore.)",
    },
    "rough_seas": {
        "label": "Rough Seas", "severity": "WARNING",
        "message": "समुद्र खवळलेला आहे — सावधगिरीने प्रवास करा. (Rough seas — proceed with caution.)",
    },
    "cyclone": {
        "label": "Cyclone Warning", "severity": "CRITICAL",
        "message": "चक्रीवादळाचा इशारा — सर्व बोटींनी त्वरित बंदराकडे परत जावे. (Cyclone warning — all vessels return to port immediately.)",
    },
    "tsunami": {
        "label": "Tsunami Warning", "severity": "CRITICAL",
        "message": "त्सुनामीचा इशारा — त्वरित सुरक्षित उंच जागी जा किंवा बंदरात परत या. (Tsunami warning — move to safe high ground or return to port immediately.)",
    },
}
EMERGENCY_MESSAGE = "आणीबाणी — सर्व बोटींनी त्वरित बंदराकडे परत जावे. (EMERGENCY — all vessels return to port immediately.)"


@app.middleware("http")
async def count_requests(request: Request, call_next):
    path = request.url.path
    if path.endswith("/position"):
        REQUEST_COUNTS["position"] += 1
    elif path in ("/api/state", "/api/audit", "/api/vessels") or path.startswith("/api/vessel/"):
        REQUEST_COUNTS["telemetry"] += 1
    elif path in ("/api/events", "/api/ledger", "/api/stats/ack-rate"):
        REQUEST_COUNTS["background"] += 1
    return await call_next(request)


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


@app.post("/api/auth/login")
async def login(request: Request):
    body = await request.json()
    username = (body.get("username") or "").strip().lower()
    password = body.get("password") or ""
    conn = db()
    row = conn.execute("SELECT * FROM operators WHERE username=?", (username,)).fetchone()
    if not row or row["password_hash"] != hash_password(password):
        raise HTTPException(401, "invalid username or password")
    token = secrets.token_urlsafe(24)
    SESSIONS[token] = {"username": row["username"], "display_name": row["display_name"], "role": row["role"]}
    resp = JSONResponse(SESSIONS[token])
    resp.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="lax", max_age=60 * 60 * 12)
    audit(f"Operator {row['display_name']} logged in", kind="info")
    return resp


@app.post("/api/auth/logout")
def logout(request: Request):
    token = request.cookies.get(SESSION_COOKIE)
    op = SESSIONS.pop(token, None) if token else None
    resp = JSONResponse({"status": "ok"})
    resp.delete_cookie(SESSION_COOKIE)
    if op:
        audit(f"Operator {op['display_name']} logged out", kind="info")
    return resp


@app.get("/api/auth/me")
def auth_me(request: Request):
    return require_operator(request)


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


def _kyc_row_to_dict(r) -> dict:
    return {
        "vessel_id": r["vessel_id"], "captain_name": r["captain_name"], "id_type": r["id_type"],
        "id_number_masked": r["id_number_masked"], "has_document": bool(r["id_document_filename"]),
        "status": r["status"], "submitted_at": r["submitted_at"],
        "reviewed_at": r["reviewed_at"], "reviewed_by": r["reviewed_by"],
    }


@app.get("/api/kyc")
def list_kyc(request: Request):
    require_operator(request)
    conn = db()
    rows = conn.execute(
        "SELECT k.*, v.name AS vessel_name FROM captain_kyc k JOIN vessels v ON v.id = k.vessel_id ORDER BY v.id"
    ).fetchall()
    out = []
    for r in rows:
        d = _kyc_row_to_dict(r)
        d["vessel_name"] = r["vessel_name"]
        out.append(d)
    return out


@app.get("/api/kyc/{vessel_id}")
def get_kyc(vessel_id: str, request: Request):
    require_operator(request)
    conn = db()
    row = conn.execute("SELECT * FROM captain_kyc WHERE vessel_id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "no KYC record for this vessel")
    return _kyc_row_to_dict(row)


@app.post("/api/kyc/{vessel_id}/verify")
def verify_kyc(vessel_id: str, request: Request):
    op = require_operator(request)
    conn = db()
    now = now_utc().isoformat()
    cur = conn.execute(
        "UPDATE captain_kyc SET status='VERIFIED', reviewed_at=?, reviewed_by=? WHERE vessel_id=?",
        (now, op["display_name"], vessel_id),
    )
    if cur.rowcount == 0:
        raise HTTPException(404, "no KYC record for this vessel")
    conn.commit()
    audit(f"KYC verified for {vessel_id} by {op['display_name']}", kind="info")
    return get_kyc(vessel_id, request)


@app.post("/api/kyc/{vessel_id}/reject")
def reject_kyc(vessel_id: str, request: Request):
    op = require_operator(request)
    conn = db()
    now = now_utc().isoformat()
    cur = conn.execute(
        "UPDATE captain_kyc SET status='REJECTED', reviewed_at=?, reviewed_by=? WHERE vessel_id=?",
        (now, op["display_name"], vessel_id),
    )
    if cur.rowcount == 0:
        raise HTTPException(404, "no KYC record for this vessel")
    conn.commit()
    audit(f"KYC rejected for {vessel_id} by {op['display_name']}", kind="warn")
    return get_kyc(vessel_id, request)


@app.post("/api/kyc/{vessel_id}/document")
async def upload_kyc_document(vessel_id: str, request: Request, file: UploadFile = File(...)):
    op = require_operator(request)
    conn = db()
    row = conn.execute("SELECT * FROM captain_kyc WHERE vessel_id=?", (vessel_id,)).fetchone()
    if not row:
        raise HTTPException(404, "no KYC record for this vessel")
    if not (file.content_type or "").startswith("image/") and (file.content_type or "") != "application/pdf":
        raise HTTPException(400, "only image or PDF files are accepted")
    os.makedirs(KYC_UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    filename = f"{vessel_id}_{uuid.uuid4().hex[:8]}{ext}"
    data = await file.read()
    with open(os.path.join(KYC_UPLOAD_DIR, filename), "wb") as f:
        f.write(data)
    conn.execute("UPDATE captain_kyc SET id_document_filename=? WHERE vessel_id=?", (filename, vessel_id))
    conn.commit()
    audit(f"Proof-of-ID document uploaded for {vessel_id} by {op['display_name']}", kind="info")
    return get_kyc(vessel_id, request)


@app.get("/api/kyc/{vessel_id}/document")
def download_kyc_document(vessel_id: str, request: Request):
    require_operator(request)
    conn = db()
    row = conn.execute("SELECT id_document_filename FROM captain_kyc WHERE vessel_id=?", (vessel_id,)).fetchone()
    if not row or not row["id_document_filename"]:
        raise HTTPException(404, "no document on file")
    path = os.path.join(KYC_UPLOAD_DIR, row["id_document_filename"])
    if not os.path.exists(path):
        raise HTTPException(404, "document file missing on disk")
    return FileResponse(path)


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
    return _create_alert(alert.vessel_id, alert.severity.value, alert.message, alert.language)


def _create_alert(vessel_id: str, severity: str, message: str, language: str) -> dict:
    conn = db()
    alert_id = str(uuid.uuid4())
    ts = now_utc().isoformat()
    conn.execute(
        "INSERT INTO alerts (id, vessel_id, severity, message, language, created_at, status) VALUES (?,?,?,?,?,?,?)",
        (alert_id, vessel_id, severity, message, language, ts, "SENT"),
    )
    ledger_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO ack_ledger (id, alert_id, vessel_id, sent_at, channel, language, delivered_at) VALUES (?,?,?,?,?,?,?)",
        (ledger_id, alert_id, vessel_id, ts, "app", language, ts),
    )
    conn.commit()
    payload = {"id": alert_id, "vessel_id": vessel_id, "severity": severity, "message": message, "created_at": ts, "status": "SENT"}
    broadcaster.publish("alert", payload)
    audit(f"Alert issued to {vessel_id}: {message}", kind="warn" if severity != "CRITICAL" else "bad")
    return payload


def _all_vessel_ids() -> list[str]:
    conn = db()
    return [r["id"] for r in conn.execute("SELECT id FROM vessels").fetchall()]


@app.get("/api/situation")
def get_situation():
    return SITUATION


@app.post("/api/emergency")
def trigger_emergency():
    vessel_ids = _all_vessel_ids()
    now = now_utc()
    for vid in vessel_ids:
        _create_alert(vid, "CRITICAL", EMERGENCY_MESSAGE, "mr")
    SITUATION.update({
        "active": True, "source": "emergency", "type": "emergency", "label": "EMERGENCY",
        "message": EMERGENCY_MESSAGE, "severity": "CRITICAL",
        "set_at": now.isoformat(), "sent_at": now.isoformat(), "sent_count": len(vessel_ids),
    })
    broadcaster.publish("situation", SITUATION)
    audit(f"EMERGENCY PROTOCOL activated — alert sent to all {len(vessel_ids)} vessels", kind="bad")
    return SITUATION


def _arm_scenario(stype: str, label: str, message: str, severity: str, origin_note: str) -> dict:
    now = now_utc()
    SITUATION.update({
        "active": True, "source": "scenario", "type": stype, "label": label,
        "message": message, "severity": severity,
        "set_at": now.isoformat(), "sent_at": None, "sent_count": 0,
    })
    broadcaster.publish("situation", SITUATION)
    audit(f"{origin_note} set conditions to '{label}' — not yet sent to fleet", kind="warn")
    return SITUATION


@app.post("/api/scenario")
async def set_scenario(request: Request):
    body = await request.json()
    stype = body.get("type")
    tmpl = SCENARIO_TEMPLATES.get(stype)
    if not tmpl:
        raise HTTPException(400, f"unknown scenario type '{stype}'")
    return _arm_scenario(stype, tmpl["label"], tmpl["message"], tmpl["severity"], "Scenario simulator")


@app.post("/api/scenario/broadcast")
def broadcast_scenario():
    if not SITUATION["active"] or SITUATION["source"] != "scenario":
        raise HTTPException(400, "no active scenario to broadcast")
    vessel_ids = _all_vessel_ids()
    for vid in vessel_ids:
        _create_alert(vid, SITUATION["severity"], SITUATION["message"], "mr")
    SITUATION["sent_at"] = now_utc().isoformat()
    SITUATION["sent_count"] = len(vessel_ids)
    broadcaster.publish("situation", SITUATION)
    audit(f"Safety protocols ensured — '{SITUATION['label']}' alert sent to all {len(vessel_ids)} vessels", kind="bad")
    return SITUATION


@app.post("/api/situation/clear")
def clear_situation():
    SITUATION.update({
        "active": False, "source": None, "type": None, "label": None,
        "message": None, "severity": None, "set_at": None, "sent_at": None, "sent_count": 0,
    })
    broadcaster.publish("situation", SITUATION)
    audit("Situation cleared", kind="info")
    return SITUATION


# Climate tips: a fisherman flags something they observed (e.g. unusual waves,
# tsunami signs). This is a raw, UNVERIFIED report — it never becomes an alert
# by itself. An operator must review it and explicitly escalate it into an
# armed scenario, then separately click "Ensure Safety Protocols" to actually
# notify the fleet, exactly like the scenario simulator's flow.
TIP_TYPE_LABELS = {
    "tsunami": "Tsunami Signs", "cyclone": "Storm / Cyclone Signs",
    "rough_seas": "Rough Waves", "high_tide": "Rising Tide", "other": "Other",
}


@app.post("/api/tips")
async def submit_tip(request: Request):
    body = await request.json()
    vessel_id = body.get("vessel_id")
    tip_type = body.get("tip_type")
    if tip_type not in TIP_TYPE_LABELS:
        raise HTTPException(400, f"unknown tip_type '{tip_type}'")
    conn = db()
    vessel = conn.execute("SELECT id FROM vessels WHERE id=?", (vessel_id,)).fetchone()
    if not vessel:
        raise HTTPException(404, "vessel not found")
    tip_id = str(uuid.uuid4())
    now = now_utc().isoformat()
    conn.execute(
        "INSERT INTO climate_tips (id, vessel_id, tip_type, note, lat, lon, submitted_at, status) VALUES (?,?,?,?,?,?,?,?)",
        (tip_id, vessel_id, tip_type, body.get("note"), body.get("lat"), body.get("lon"), now, "PENDING"),
    )
    conn.commit()
    broadcaster.publish("tip", {"id": tip_id, "vessel_id": vessel_id})
    audit(f"Climate tip received from {vessel_id}: {TIP_TYPE_LABELS[tip_type]} (unverified)", kind="warn")
    return {"id": tip_id, "status": "PENDING"}


def _tip_row_to_dict(r) -> dict:
    return {
        "id": r["id"], "vessel_id": r["vessel_id"], "vessel_name": r["vessel_name"],
        "tip_type": r["tip_type"], "tip_label": TIP_TYPE_LABELS.get(r["tip_type"], r["tip_type"]),
        "note": r["note"], "lat": r["lat"], "lon": r["lon"], "submitted_at": r["submitted_at"],
        "status": r["status"], "reviewed_at": r["reviewed_at"], "reviewed_by": r["reviewed_by"],
    }


@app.get("/api/tips")
def list_tips(request: Request, status: str | None = None):
    require_operator(request)
    conn = db()
    q = "SELECT t.*, v.name AS vessel_name FROM climate_tips t JOIN vessels v ON v.id = t.vessel_id"
    params: tuple = ()
    if status:
        q += " WHERE t.status = ?"
        params = (status,)
    q += " ORDER BY t.submitted_at DESC"
    rows = conn.execute(q, params).fetchall()
    return [_tip_row_to_dict(r) for r in rows]


@app.post("/api/tips/{tip_id}/dismiss")
def dismiss_tip(tip_id: str, request: Request):
    op = require_operator(request)
    conn = db()
    now = now_utc().isoformat()
    cur = conn.execute(
        "UPDATE climate_tips SET status='DISMISSED', reviewed_at=?, reviewed_by=? WHERE id=?",
        (now, op["display_name"], tip_id),
    )
    if cur.rowcount == 0:
        raise HTTPException(404, "tip not found")
    conn.commit()
    audit(f"Climate tip {tip_id[:8]} dismissed by {op['display_name']}", kind="info")
    return {"id": tip_id, "status": "DISMISSED"}


@app.post("/api/tips/{tip_id}/escalate")
def escalate_tip(tip_id: str, request: Request):
    op = require_operator(request)
    conn = db()
    row = conn.execute("SELECT * FROM climate_tips WHERE id=?", (tip_id,)).fetchone()
    if not row:
        raise HTTPException(404, "tip not found")
    tmpl = SCENARIO_TEMPLATES.get(row["tip_type"])
    if tmpl:
        situation = _arm_scenario(row["tip_type"], tmpl["label"], tmpl["message"], tmpl["severity"],
                                   f"Fisherman tip from {row['vessel_id']} (reviewed by {op['display_name']})")
    else:
        label = TIP_TYPE_LABELS.get(row["tip_type"], "Reported Condition")
        note = f" — \"{row['note']}\"" if row["note"] else ""
        situation = _arm_scenario(
            "tip_other", label,
            f"रिपोर्ट केलेली स्थिती: {label}{note} — त्वरित सावधगिरी बाळगा. (Reported condition: {label}{note} — exercise caution.)",
            "WARNING", f"Fisherman tip from {row['vessel_id']} (reviewed by {op['display_name']})",
        )
    now = now_utc().isoformat()
    conn.execute(
        "UPDATE climate_tips SET status='ESCALATED', reviewed_at=?, reviewed_by=? WHERE id=?",
        (now, op["display_name"], tip_id),
    )
    conn.commit()
    return situation


@app.get("/api/alerts/latest")
def latest_alert(vessel_id: str):
    conn = db()
    row = conn.execute(
        "SELECT * FROM alerts WHERE vessel_id=? ORDER BY created_at DESC LIMIT 1", (vessel_id,)
    ).fetchone()
    if not row:
        return None
    return {
        "id": row["id"], "vessel_id": row["vessel_id"], "severity": row["severity"],
        "message": row["message"], "language": row["language"], "created_at": row["created_at"],
        "status": row["status"],
    }


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


def _fleet_advisories():
    conn = db()
    rows = conn.execute("SELECT * FROM vessels ORDER BY id").fetchall()
    now = now_utc()
    out = []
    for r in rows:
        adv = compute_advisory(r["id"], r["lat"], r["lon"], now)
        out.append((r, adv))
    return out


@app.get("/api/dashboard/extended")
def dashboard_extended():
    import random
    now = now_utc()
    minute_rng = random.Random(int(now.timestamp() // 60))
    hour_rng = random.Random(int(now.timestamp() // 3600))
    fleet = _fleet_advisories()

    agent_defs = [
        ("Planner", "route"), ("Ocean Analytics", "wave"), ("Weather & Hazard", "alert"),
        ("Geospatial Risk", "compass"), ("Trip Twin", "hub"), ("Causal & Trend", "chev-up"),
    ]
    hazard_present = any(adv.verdict.value != "SAFE" for _, adv in fleet)
    agents = []
    for i, (name, icon) in enumerate(agent_defs):
        r = random.Random(f"agent:{name}:{int(now.timestamp() // 20)}")
        active = True
        if name == "Geospatial Risk":
            active = hazard_present
        agents.append({
            "name": name, "icon": icon, "active": active,
            "latency_ms": round(100 + r.uniform(0, 320)) if active else None,
            "brier": round(0.04 + r.uniform(0, 0.15), 2) if active else None,
        })

    arrays = []
    for name, code, base_uplink, base_power in [
        ("Oceansat-3", "SAT-L3", 99.5, 85), ("Wave Buoy #442", "BUOY-S", 82, 35), ("AIS Receiver Alpha", "VHF-RX", 100, None),
    ]:
        r = random.Random(f"array:{name}:{int(now.timestamp() // 300)}")
        uplink = round(min(100, max(0, base_uplink + r.uniform(-3, 1.5))), 1)
        power = round(min(100, max(0, base_power + r.uniform(-5, 5))), 1) if base_power is not None else None
        arrays.append({"name": name, "code": code, "uplink_pct": uplink, "power_pct": power, "status": "online" if uplink > 90 else "degraded"})

    snr_history = []
    for h in range(7):
        r = random.Random(f"snr:{h}:{int(now.timestamp() // 3600)}")
        snr_history.append({"t": f"T-{(6 - h) * 4}h" if h < 6 else "NOW", "value": round(20 + h * 8 + r.uniform(-8, 8), 1)})

    conn = db()
    active_alerts_1h = conn.execute(
        "SELECT COUNT(*) AS n FROM alerts WHERE created_at > ?", ((now - timedelta(hours=1)).isoformat(),)
    ).fetchone()["n"]
    tunnels = broadcaster.connections()
    total_req = sum(REQUEST_COUNTS.values()) or 1
    bandwidth = {
        "tactical_pct": round(100 * REQUEST_COUNTS["position"] / total_req),
        "telemetry_pct": round(100 * REQUEST_COUNTS["telemetry"] / total_req),
        "background_pct": round(100 * REQUEST_COUNTS["background"] / total_req),
    }

    kinematics = {}
    for series, base, amp in [("sst", 27, 1.5), ("wave", 1.3, 0.9), ("wind", 9, 5)]:
        pts = []
        for h in range(0, 49, 4):
            r = random.Random(f"kin:{series}:{h}:{int(now.timestamp() // 3600)}")
            pts.append(round(base + amp * ((h / 48) - 0.3) + r.uniform(-0.3, 0.3), 2))
        kinematics[series] = pts

    causal_entries = []
    for r, adv in fleet:
        if adv.verdict.value in ("UNSAFE", "CAUTION"):
            causal_entries.append({
                "vessel_id": r["id"], "vessel_name": r["name"], "severity": adv.verdict.value,
                "reason": adv.reasons[0] if adv.reasons else "", "confidence_pct": 88 if adv.verdict.value == "UNSAFE" else 64,
            })
    causal_entries = causal_entries[:5]

    all_readings = []
    for _, adv in fleet:
        all_readings += [adv.readings.sst, adv.readings.swell, adv.readings.wind]
    high_conf = sum(1 for e in all_readings if e.confidence.value == "HIGH")
    model_confidence_pct = round(100 * high_conf / len(all_readings)) if all_readings else None
    avg_sst = round(sum(e.value for e in (a.readings.sst for _, a in fleet) if e is not None) / len(fleet), 2) if fleet else None
    thermal_anomaly = round(avg_sst - 26.5, 2) if avg_sst is not None else None

    incidents = []
    for row in conn.execute("SELECT * FROM alerts ORDER BY created_at DESC LIMIT 6").fetchall():
        incidents.append({"ts": row["created_at"], "vessel_id": row["vessel_id"], "type": row["severity"] + " alert: " + row["message"][:40], "severity": row["severity"], "status": row["status"]})
    for row in conn.execute("SELECT * FROM catch_reports ORDER BY ts DESC LIMIT 4").fetchall():
        incidents.append({"ts": row["ts"], "vessel_id": row["vessel_id"], "type": "Catch report logged", "severity": "INFO", "status": "LOGGED"})
    incidents.sort(key=lambda x: x["ts"], reverse=True)
    incidents = incidents[:8]

    roster = [{
        "id": r["id"], "name": r["name"], "operator": r["operator_name"],
        "verdict": adv.verdict.value,
    } for r, adv in fleet]

    orca_row = conn.execute("SELECT * FROM vessels WHERE id=?", (ORCA9_ID,)).fetchone()
    crisis = None
    if orca_row:
        orca_adv = compute_advisory(ORCA9_ID, orca_row["lat"], orca_row["lon"], now)
        crisis = {
            "vessel_id": ORCA9_ID, "vessel_name": orca_row["name"],
            "distance_km": orca_adv.distance_to_imbl_km, "verdict": orca_adv.verdict.value,
            "heading": orca_row["heading"], "speed": orca_row["speed"],
        }

    return {
        "agents": agents,
        "sensors": {"arrays": arrays, "snr_history": snr_history, "active_nodes": 1248 + len(tunnels), "coverage_km2": 84000},
        "network": {"tunnels": tunnels, "bandwidth": bandwidth, "active_alerts_1h": active_alerts_1h},
        "analytics": {
            "kinematics": kinematics, "causal_entries": causal_entries,
            "model_confidence_pct": model_confidence_pct, "thermal_anomaly_c": thermal_anomaly,
        },
        "incidents": incidents,
        "field_roster": roster,
        "crisis": crisis,
        "generated_at": now.isoformat(),
    }


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
    coast = distance_to_coast(row["lat"], row["lon"], row["home_port"])
    return {
        "vessel_id": vessel_id,
        "generated_at": now.isoformat(),
        "valid_until": valid_until,
        "position": {"lat": row["lat"], "lon": row["lon"], **coast},
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
    # A caller-supplied lang is a real filter: a fisherman who selects "Marathi" should
    # never get an English scientific-name row back just because it matched textually.
    pool = [r for r in _load_species() if lang is None or r["language"] == lang]
    matches = [r for r in pool if r["vernacular_name"].lower() == q_norm]
    if not matches:
        matches = [r for r in pool if q_norm in r["vernacular_name"].lower() or r["vernacular_name"].lower() in q_norm]
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


@app.get("/simulator")
def simulator_redirect():
    return RedirectResponse(url="/simulator.html")


@app.get("/")
def deck_root(request: Request):
    # This gates only the dashboard's initial page load — the JSON API underneath
    # stays open so the Wayfinder phone app and the simulator (neither of which
    # go through this login) keep working exactly as before.
    if not get_current_operator(request):
        return RedirectResponse(url="/login.html")
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


app.mount("/app", StaticFiles(directory=os.path.join(FRONTEND_DIR, "app"), html=True), name="wayfinder")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="deck")
