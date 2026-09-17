"""
SQLAlchemy ORM models for Jalavita.
"""
from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Vessel(Base):
    __tablename__ = "vessels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    mmsi: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    operator: Mapped[str] = mapped_column(String(100))
    vessel_type: Mapped[str] = mapped_column(String(50), default="Fishing")
    status: Mapped[str] = mapped_column(String(20), default="normal")  # normal | warning | critical
    latitude: Mapped[float] = mapped_column(Float, default=14.2)
    longitude: Mapped[float] = mapped_column(Float, default=71.6)
    speed_kts: Mapped[float] = mapped_column(Float, default=0.0)
    bearing_deg: Mapped[float] = mapped_column(Float, default=0.0)
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    registered: Mapped[bool] = mapped_column(Boolean, default=True)


class SensorArray(Base):
    __tablename__ = "sensor_arrays"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    sensor_type: Mapped[str] = mapped_column(String(20))  # SAT-L3 | BUOY-S | VHF-RX
    uplink_pct: Mapped[float] = mapped_column(Float, default=100.0)
    power_pct: Mapped[float] = mapped_column(Float, default=100.0)
    is_hardline: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="online")  # online | degraded | offline
    signal_dbm: Mapped[float] = mapped_column(Float, default=-42.0)
    latency_ms: Mapped[float] = mapped_column(Float, default=124.0)
    packet_loss_pct: Mapped[float] = mapped_column(Float, default=0.02)
    temp_c: Mapped[float] = mapped_column(Float, default=14.2)


class ArchiveLog(Base):
    __tablename__ = "archive_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    vessel_id: Mapped[str] = mapped_column(String(30))
    incident_type: Mapped[str] = mapped_column(String(100))
    severity: Mapped[str] = mapped_column(String(20), default="normal")  # normal | warning | critical
    size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    latitude: Mapped[float] = mapped_column(Float, default=0.0)
    longitude: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str] = mapped_column(Text, default="")
    source_node: Mapped[str] = mapped_column(String(60), default="")
    operator_id: Mapped[str] = mapped_column(String(20), default="")


class WeatherAlert(Base):
    __tablename__ = "weather_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    severity: Mapped[str] = mapped_column(String(20))  # critical | warning | normal
    event_type: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    sector: Mapped[str] = mapped_column(String(30), default="")
    probability_pct: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_time: Mapped[str] = mapped_column(String(30), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class TripPlan(Base):
    __tablename__ = "trip_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    vessel_mmsi: Mapped[str] = mapped_column(String(20))
    departure_time: Mapped[str] = mapped_column(String(10))
    cruise_speed_kts: Mapped[float] = mapped_column(Float)
    duration_hrs: Mapped[float] = mapped_column(Float)
    fuel_limit_l: Mapped[float] = mapped_column(Float)
    estimated_fuel_l: Mapped[float] = mapped_column(Float, default=0.0)
    point_of_no_return: Mapped[str] = mapped_column(String(10), default="")
    status: Mapped[str] = mapped_column(String(20), default="calculated")
    route_json: Mapped[str] = mapped_column(Text, default="[]")
