"""
Main FastAPI application — ORCA Command Deck Backend
"""
import asyncio
import json
import math
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db
from ws_manager import (
    manager,
    telemetry_broadcast_loop,
    terminal_broadcast_loop,
    agents_broadcast_loop,
)

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ORCA API",
    description="Backend for the ORCA Command Deck dashboard",
    version="1.0.0",
)

# Allow requests from the Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Start all background WebSocket broadcast loops."""
    asyncio.create_task(telemetry_broadcast_loop())
    asyncio.create_task(terminal_broadcast_loop())
    asyncio.create_task(agents_broadcast_loop())


# ============================================================
# REST — Vessels
# ============================================================

@app.get("/api/vessels", response_model=list[schemas.VesselOut])
def get_vessels(status: Optional[str] = None, db: Session = Depends(get_db)):
    """Return all vessels, optionally filtered by status."""
    q = db.query(models.Vessel)
    if status:
        q = q.filter(models.Vessel.status == status)
    return q.all()


@app.get("/api/vessels/{mmsi}", response_model=schemas.VesselOut)
def get_vessel(mmsi: str, db: Session = Depends(get_db)):
    vessel = db.query(models.Vessel).filter(models.Vessel.mmsi == mmsi).first()
    if not vessel:
        raise HTTPException(status_code=404, detail="Vessel not found")
    return vessel


@app.post("/api/vessels", response_model=schemas.VesselOut, status_code=201)
def create_vessel(payload: schemas.VesselCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Vessel).filter(models.Vessel.mmsi == payload.mmsi).first()
    if existing:
        raise HTTPException(status_code=409, detail="MMSI already registered")
    vessel = models.Vessel(**payload.model_dump())
    db.add(vessel)
    db.commit()
    db.refresh(vessel)
    return vessel


# ============================================================
# REST — Sensors
# ============================================================

@app.get("/api/sensors", response_model=list[schemas.SensorOut])
def get_sensors(db: Session = Depends(get_db)):
    """Return all sensor arrays and their current status."""
    return db.query(models.SensorArray).all()


@app.get("/api/sensors/{sensor_id}", response_model=schemas.SensorOut)
def get_sensor(sensor_id: int, db: Session = Depends(get_db)):
    sensor = db.query(models.SensorArray).filter(models.SensorArray.id == sensor_id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    return sensor


# ============================================================
# REST — Archive Logs
# ============================================================

@app.get("/api/archive", response_model=list[schemas.ArchiveLogOut])
def get_archive(
    severity: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    q = db.query(models.ArchiveLog).order_by(models.ArchiveLog.timestamp.desc())
    if severity:
        q = q.filter(models.ArchiveLog.severity == severity)
    return q.offset(offset).limit(limit).all()


@app.get("/api/archive/{log_id}", response_model=schemas.ArchiveLogOut)
def get_log(log_id: int, db: Session = Depends(get_db)):
    log = db.query(models.ArchiveLog).filter(models.ArchiveLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    return log


# ============================================================
# REST — Weather Alerts
# ============================================================

@app.get("/api/alerts", response_model=list[schemas.WeatherAlertOut])
def get_alerts(active_only: bool = True, db: Session = Depends(get_db)):
    q = db.query(models.WeatherAlert)
    if active_only:
        q = q.filter(models.WeatherAlert.is_active == True)
    return q.order_by(models.WeatherAlert.probability_pct.desc()).all()


# ============================================================
# REST — Trip Planner
# ============================================================

@app.post("/api/trip-planner/calculate", response_model=schemas.TripPlanOut)
def calculate_trip(payload: schemas.TripPlanRequest, db: Session = Depends(get_db)):
    """
    Simple trip calculation engine:
    - Fuel estimate = speed * duration * 0.6  (litres per hour per knot factor)
    - Point of no return = departure + duration/2
    - Reject if fuel_estimate > fuel_limit
    """
    fuel_estimate = round(payload.cruise_speed_kts * payload.duration_hrs * 0.6, 1)
    
    # Parse departure time and calculate PONR
    try:
        h, m = map(int, payload.departure_time.split(":"))
        dep_minutes = h * 60 + m
        ponr_minutes = dep_minutes + int(payload.duration_hrs * 30)  # halfway
        ponr_h = (ponr_minutes // 60) % 24
        ponr_m = ponr_minutes % 60
        ponr = f"{ponr_h:02d}:{ponr_m:02d}"
    except Exception:
        ponr = "N/A"

    status = "feasible" if fuel_estimate <= payload.fuel_limit_l else "rejected"

    # Simple mock route waypoints
    route = [
        {"lat": 14.2 + i * 0.05, "lon": 71.6 + i * 0.05, "time_offset_hrs": i * 0.5}
        for i in range(int(payload.duration_hrs * 2) + 1)
    ]

    plan = models.TripPlan(
        vessel_mmsi=payload.vessel_mmsi,
        departure_time=payload.departure_time,
        cruise_speed_kts=payload.cruise_speed_kts,
        duration_hrs=payload.duration_hrs,
        fuel_limit_l=payload.fuel_limit_l,
        estimated_fuel_l=fuel_estimate,
        point_of_no_return=ponr,
        status=status,
        route_json=json.dumps(route),
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


# ============================================================
# REST — Broadcast Advisory
# ============================================================

@app.post("/api/broadcast", response_model=schemas.BroadcastResponse)
def send_broadcast(payload: schemas.BroadcastRequest, db: Session = Depends(get_db)):
    if payload.target == "all":
        count = db.query(models.Vessel).count()
    else:
        vessel = db.query(models.Vessel).filter(models.Vessel.mmsi == payload.target).first()
        if not vessel:
            raise HTTPException(status_code=404, detail="Target vessel not found")
        count = 1

    return schemas.BroadcastResponse(
        success=True,
        recipients=count,
        message=f"Broadcast dispatched to {count} vessel(s): \"{payload.message}\"",
    )


# ============================================================
# REST — Dashboard Summary
# ============================================================

@app.get("/api/summary")
def get_summary(db: Session = Depends(get_db)):
    """Returns a single summary object powering the Command page metric cards."""
    vessel_count = db.query(models.Vessel).count()
    alert_count = db.query(models.WeatherAlert).filter(models.WeatherAlert.is_active == True).count()
    critical_count = db.query(models.WeatherAlert).filter(
        models.WeatherAlert.is_active == True,
        models.WeatherAlert.severity == "critical"
    ).count()
    sensor_count = db.query(models.SensorArray).filter(models.SensorArray.status == "online").count()

    return {
        "vessel_count": vessel_count,
        "active_pfz": 148,
        "weather_alerts": alert_count,
        "critical_alerts": critical_count,
        "network_resilience": 94,
        "online_sensors": sensor_count,
        "system_latency_ms": 12,
    }


# ============================================================
# WebSocket Endpoints
# ============================================================

@app.websocket("/ws/telemetry")
async def ws_telemetry(websocket: WebSocket):
    await manager.connect(websocket, "telemetry")
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(websocket, "telemetry")


@app.websocket("/ws/terminal")
async def ws_terminal(websocket: WebSocket):
    await manager.connect(websocket, "terminal")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "terminal")


@app.websocket("/ws/agents")
async def ws_agents(websocket: WebSocket):
    await manager.connect(websocket, "agents")
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, "agents")


# ============================================================
# Health Check
# ============================================================

@app.get("/health")
def health():
    return {"status": "ok", "service": "ORCA API", "version": "1.0.0"}
