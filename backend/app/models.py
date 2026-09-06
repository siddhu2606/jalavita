from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator


class Confidence(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    UNKNOWN = "UNKNOWN"


class Evidence(BaseModel):
    """A measured quantity. Never a bare number — always carries provenance.
    If a value cannot be obtained, value=None and confidence=UNKNOWN, never a guess."""
    value: Optional[float] = None
    unit: str
    source: str
    valid_time: datetime
    confidence: Confidence
    sigma: Optional[float] = None

    @field_validator("source")
    @classmethod
    def source_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Evidence.source is required and cannot be blank")
        return v

    @field_validator("confidence")
    @classmethod
    def unknown_requires_null_value(cls, v: Confidence, info):
        value = info.data.get("value")
        if v == Confidence.UNKNOWN and value is not None:
            raise ValueError("Evidence with confidence=UNKNOWN must not carry a fabricated value")
        return v


def unknown(unit: str, source: str, now: datetime) -> Evidence:
    return Evidence(value=None, unit=unit, source=source, valid_time=now, confidence=Confidence.UNKNOWN, sigma=None)


class VesselClass(str, Enum):
    TRAWLER = "trawler"
    GILLNETTER = "gillnetter"
    PURSE_SEINER = "purse_seiner"
    DINGHY = "dinghy"
    LONGLINER = "longliner"


class VesselPositionIn(BaseModel):
    lat: float
    lon: float
    heading: float = Field(ge=0, le=360)
    speed: float = Field(ge=0)
    ts: Optional[datetime] = None


class VesselOut(BaseModel):
    id: str
    name: str
    vessel_class: VesselClass
    home_port: str
    operator_name: str
    preferred_language: str
    lat: float
    lon: float
    heading: float
    speed: float
    last_update: datetime
    status: str


class Verdict(str, Enum):
    SAFE = "SAFE"
    CAUTION = "CAUTION"
    UNSAFE = "UNSAFE"
    CANNOT_DETERMINE = "CANNOT_DETERMINE"


class AdvisoryReadings(BaseModel):
    sst: Evidence
    swell: Evidence
    wind: Evidence


class AdvisoryAnswer(BaseModel):
    vessel_id: str
    verdict: Verdict
    headline: str
    return_window_closes: Optional[datetime] = None
    readings: AdvisoryReadings
    reasons: List[str]
    generated_at: datetime
    distance_to_imbl_km: Optional[float] = None


class AlertSeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AlertIn(BaseModel):
    vessel_id: str
    severity: AlertSeverity
    message: str
    language: str = "en"


class AlertOut(BaseModel):
    id: str
    vessel_id: str
    severity: AlertSeverity
    message: str
    created_at: datetime
    status: str


class AckIn(BaseModel):
    receipt_id: str  # client-generated UUID, idempotency key
    vessel_id: str
    alert_id: str
    acknowledged_at: datetime  # device_time
    channel: str = "app"
    language: str = "en"
    packet_version: Optional[str] = None


class AckOut(BaseModel):
    receipt_id: str
    alert_id: str
    vessel_id: str
    status: str
    late: bool
    server_time: datetime


class PlanRequest(BaseModel):
    vessel_id: Optional[str] = None
    departure_hour: float = Field(ge=0, le=24)
    duration_hours: float = Field(ge=1, le=24)
    cruise_speed_kt: float = Field(ge=1, le=40)
    fuel_limit_l: float = Field(default=50, ge=1)


class PlanResponse(BaseModel):
    verdict: Verdict
    fuel_estimate_l: float
    point_of_no_return: str
    max_offshore_wave_m: Evidence
    reasons: List[str]
    generated_at: datetime


class SpeciesOut(BaseModel):
    vernacular_name: str
    language: str
    region: str
    scientific_name: str
    sst_min_c: float
    sst_max_c: float
    depth_min_m: float
    depth_max_m: float


class AuditEntry(BaseModel):
    id: int
    ts: datetime
    text: str
    kind: str
