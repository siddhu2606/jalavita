"""
Pydantic schemas for request validation and response serialization.
"""
from datetime import datetime
from pydantic import BaseModel


# --- Vessel Schemas ---
class VesselBase(BaseModel):
    mmsi: str
    name: str
    operator: str
    vessel_type: str = "Fishing"
    status: str = "normal"
    latitude: float = 14.2
    longitude: float = 71.6
    speed_kts: float = 0.0
    bearing_deg: float = 0.0
    registered: bool = True


class VesselCreate(VesselBase):
    pass


class VesselOut(VesselBase):
    id: int
    last_seen: datetime

    model_config = {"from_attributes": True}


# --- Sensor Schemas ---
class SensorOut(BaseModel):
    id: int
    name: str
    sensor_type: str
    uplink_pct: float
    power_pct: float
    is_hardline: bool
    status: str
    signal_dbm: float
    latency_ms: float
    packet_loss_pct: float
    temp_c: float

    model_config = {"from_attributes": True}


# --- Archive Log Schemas ---
class ArchiveLogOut(BaseModel):
    id: int
    timestamp: datetime
    vessel_id: str
    incident_type: str
    severity: str
    size_bytes: int
    latitude: float
    longitude: float
    notes: str
    source_node: str
    operator_id: str

    model_config = {"from_attributes": True}


# --- Weather Alert Schemas ---
class WeatherAlertOut(BaseModel):
    id: int
    timestamp: datetime
    severity: str
    event_type: str
    description: str
    sector: str
    probability_pct: float
    estimated_time: str
    is_active: bool

    model_config = {"from_attributes": True}


# --- Trip Planner Schemas ---
class TripPlanRequest(BaseModel):
    vessel_mmsi: str
    departure_time: str   # e.g. "06:30"
    cruise_speed_kts: float
    duration_hrs: float
    fuel_limit_l: float


class TripPlanOut(BaseModel):
    id: int
    created_at: datetime
    vessel_mmsi: str
    departure_time: str
    cruise_speed_kts: float
    duration_hrs: float
    fuel_limit_l: float
    estimated_fuel_l: float
    point_of_no_return: str
    status: str
    route_json: str

    model_config = {"from_attributes": True}


# --- Broadcast Schemas ---
class BroadcastRequest(BaseModel):
    target: str   # "all" or a specific MMSI
    language: str = "English"
    message: str


class BroadcastResponse(BaseModel):
    success: bool
    recipients: int
    message: str
