from __future__ import annotations
import sqlite3
import os
import random
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "jalavita.db")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS vessels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vessel_class TEXT NOT NULL,
    home_port TEXT NOT NULL,
    operator_name TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    heading REAL NOT NULL,
    speed REAL NOT NULL,
    last_update TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NORMAL'
);

CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    vessel_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    message TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT'
);

CREATE TABLE IF NOT EXISTS ack_ledger (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    vessel_id TEXT NOT NULL,
    sent_at TEXT NOT NULL,
    channel TEXT NOT NULL,
    language TEXT NOT NULL,
    delivered_at TEXT,
    acknowledged_at TEXT,
    device_time TEXT,
    server_time TEXT,
    packet_version TEXT,
    late INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    text TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'info'
);

CREATE TABLE IF NOT EXISTS catch_reports (
    id TEXT PRIMARY KEY,
    vessel_id TEXT NOT NULL,
    ts TEXT NOT NULL,
    lat REAL,
    lon REAL,
    note TEXT,
    synced INTEGER NOT NULL DEFAULT 1
);
"""

VESSEL_CLASSES = ["trawler", "gillnetter", "purse_seiner", "dinghy", "longliner"]
NAMES = [
    "Sagar Kanya", "Matsyagandha", "ORCA-9", "TFA Vanguard", "Ratnadeep",
    "Malvan Pride", "Konkan Star", "Vijay Lakshmi", "Devi Ratnamala", "Sindhu Bhairavi",
    "Ganga Bhavani", "Jaladurga",
]
OPERATORS = [
    "K. Naik", "R. Salvi", "D. Vaity", "S. Bandekar", "A. Rangan", "P. Tandel",
    "M. Koli", "V. Gaonkar", "S. Parab", "N. Wagh", "T. Sawant", "J. Mestry",
]
HOME_PORTS = ["Ratnagiri", "Malvan", "Devgad", "Sakhri Nate", "Achra", "Vengurla"]
LANGS = ["mr", "hi", "en"]


def get_conn() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


_conn: sqlite3.Connection | None = None


def db() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _conn = get_conn()
        _conn.executescript(_SCHEMA)
        _conn.commit()
        _seed_if_empty(_conn)
    return _conn


def _seed_if_empty(conn: sqlite3.Connection) -> None:
    row = conn.execute("SELECT COUNT(*) AS n FROM vessels").fetchone()
    if row["n"] > 0:
        return
    rng = random.Random(42)
    now = datetime.now(timezone.utc).isoformat()
    for i in range(12):
        vid = f"MH-RTN-{400 + i * 4}"
        lat = round(rng.uniform(15.9, 17.0), 4)
        lon = round(rng.uniform(73.0, 73.6), 4)
        heading = round(rng.uniform(0, 360), 1)
        speed = round(rng.uniform(4, 15), 1)
        vclass = VESSEL_CLASSES[i % len(VESSEL_CLASSES)]
        conn.execute(
            "INSERT INTO vessels (id, name, vessel_class, home_port, operator_name, preferred_language, "
            "lat, lon, heading, speed, last_update, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (vid, NAMES[i], vclass, HOME_PORTS[i % len(HOME_PORTS)], OPERATORS[i], LANGS[i % len(LANGS)],
             lat, lon, heading, speed, now, "NORMAL"),
        )
    conn.execute(
        "INSERT INTO audit_log (ts, text, kind) VALUES (?,?,?)",
        (now, "Jalavita backend initialized. 12 vessels seeded off Ratnagiri/Malvan.", "info"),
    )
    conn.commit()
