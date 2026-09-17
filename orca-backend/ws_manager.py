"""
WebSocket connection manager for broadcasting live telemetry.
"""
import asyncio
import json
import math
import random
from datetime import datetime, timezone
from fastapi import WebSocket


class ConnectionManager:
    """Manages a pool of active WebSocket clients."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {
            "telemetry": [],
            "terminal": [],
            "agents": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if websocket in self.active_connections[channel]:
            self.active_connections[channel].remove(websocket)

    async def broadcast(self, data: dict, channel: str):
        dead = []
        for ws in self.active_connections[channel]:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, channel)


manager = ConnectionManager()


# ---------- Live data generators ----------

def _telemetry_tick() -> dict:
    """Generates one tick of randomised sensor telemetry."""
    return {
        "type": "telemetry",
        "ts": datetime.now(timezone.utc).isoformat(),
        "sensors": [
            {
                "name": "Oceansat-3",
                "signal_dbm": round(-40 - random.random() * 6, 1),
                "latency_ms": round(110 + random.random() * 30),
                "packet_loss_pct": round(random.random() * 0.06, 3),
                "temp_c": round(13.5 + random.random() * 1.4, 1),
                "uplink_pct": round(99 + random.random() * 0.9, 1),
            },
            {
                "name": "Wave Buoy #442",
                "signal_dbm": round(-65 - random.random() * 8, 1),
                "latency_ms": round(320 + random.random() * 40),
                "packet_loss_pct": round(0.8 + random.random() * 0.8, 3),
                "temp_c": round(15.5 + random.random() * 2, 1),
                "uplink_pct": round(78 + random.random() * 8, 1),
            },
            {
                "name": "AIS Receiver Alpha",
                "signal_dbm": round(-28 - random.random() * 3, 1),
                "latency_ms": round(6 + random.random() * 4),
                "packet_loss_pct": 0.0,
                "temp_c": round(11.5 + random.random() * 1.2, 1),
                "uplink_pct": 100.0,
            },
        ],
        "vessel_count": 3492 + round(random.random() * 20 - 10),
        "active_pfz": 148 + round(random.random() * 4 - 2),
        "network_resilience": round(92 + random.random() * 4, 1),
    }


_TERMINAL_LINES = [
    "sys.connect() OK",
    "stream_uplink_established",
    "[WARN] T9_guardrail_timeout",
    "recalculating_DAG...",
    "pipeline.flush() -> success",
    "pkt_rx: 0x48A9...",
    "[OK] Checksum valid",
    "demodulator_sync: LCK",
    "reading_buffer_size: 14.2KB",
    "stream_alive",
    "INCOIS_payload received",
    "buoy_telemetry_CRC OK",
    "sat_link handshake complete",
]


def _terminal_tick() -> dict:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    line = random.choice(_TERMINAL_LINES)
    return {"type": "terminal", "ts": ts, "line": f"[{ts}] > {line}"}


_AGENTS = [
    {"name": "Planner", "base_ms": 120, "base_brier": 0.05},
    {"name": "Ocean Analytics", "base_ms": 210, "base_brier": 0.12},
    {"name": "Weather & Hazard", "base_ms": 340, "base_brier": 0.45},
    {"name": "Trip Twin", "base_ms": 180, "base_brier": 0.08},
    {"name": "Causal & Trend", "base_ms": 410, "base_brier": 0.15},
    {"name": "Guardrail", "base_ms": 50, "base_brier": 0.0},
]


def _agents_tick() -> dict:
    return {
        "type": "agents",
        "ts": datetime.now(timezone.utc).isoformat(),
        "agents": [
            {
                "name": a["name"],
                "latency_ms": round(a["base_ms"] * (0.85 + random.random() * 0.3)),
                "brier_score": round(a["base_brier"] * (0.9 + random.random() * 0.2), 3),
                "status": "online",
            }
            for a in _AGENTS
        ],
    }


async def telemetry_broadcast_loop():
    """Broadcast telemetry to all connected clients every 2s."""
    while True:
        await asyncio.sleep(2)
        if manager.active_connections["telemetry"]:
            await manager.broadcast(_telemetry_tick(), "telemetry")


async def terminal_broadcast_loop():
    """Broadcast terminal lines every 1.5s."""
    while True:
        await asyncio.sleep(1.5)
        if manager.active_connections["terminal"]:
            await manager.broadcast(_terminal_tick(), "terminal")


async def agents_broadcast_loop():
    """Broadcast agent stats every 3s."""
    while True:
        await asyncio.sleep(3)
        if manager.active_connections["agents"]:
            await manager.broadcast(_agents_tick(), "agents")
