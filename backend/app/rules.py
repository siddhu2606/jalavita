from __future__ import annotations
import random
import math
from datetime import datetime, timezone, timedelta
from shapely.geometry import LineString, Point

from .models import Evidence, Confidence, AdvisoryAnswer, AdvisoryReadings, Verdict, PlanResponse

# Simulated maritime boundary line for demo purposes (NOT the real IMBL) — used to
# exercise the geofence / crisis-mode code path off the Maharashtra coast.
SIMULATED_BOUNDARY = LineString([(73.55, 15.85), (73.65, 16.35), (73.75, 16.95)])  # (lon, lat)

KM_PER_DEGREE = 111.32

# Approximate coordinates of the Konkan fishing harbours used as home ports.
# Used as a stand-in reference for "distance to coast" — there is no real
# coastline polygon in this prototype, so this is distance-to-nearest-known-harbour,
# labelled honestly as such wherever it's shown.
HOME_PORT_COORDS = {
    "Ratnagiri": (16.9902, 73.3120),
    "Malvan": (16.0667, 73.4667),
    "Devgad": (16.3763, 73.3803),
    "Sakhri Nate": (16.9333, 73.3167),
    "Achra": (16.1333, 73.4333),
    "Vengurla": (15.8667, 73.6333),
}
REGION_LABEL = "Konkan Coast, Maharashtra"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def distance_to_coast(lat: float, lon: float, home_port: str | None = None) -> dict:
    """Distance to the nearest known harbour — a practical stand-in for
    distance-to-shore given this prototype has no real coastline geometry."""
    best_name, best_km = None, None
    for name, (plat, plon) in HOME_PORT_COORDS.items():
        d = haversine_km(lat, lon, plat, plon)
        if best_km is None or d < best_km:
            best_name, best_km = name, d
    if home_port and home_port in HOME_PORT_COORDS:
        plat, plon = HOME_PORT_COORDS[home_port]
        home_km = haversine_km(lat, lon, plat, plon)
        return {"distance_km": round(home_km, 1), "nearest_port": home_port, "region": REGION_LABEL}
    return {"distance_km": round(best_km, 1), "nearest_port": best_name, "region": REGION_LABEL}


def distance_to_boundary_km(lat: float, lon: float) -> float:
    p = Point(lon, lat)
    deg = p.distance(SIMULATED_BOUNDARY)
    return round(deg * KM_PER_DEGREE, 2)


def _hour_bucket(now: datetime) -> int:
    return int(now.timestamp() // 3600)


def _stable_rng(vessel_id: str, now: datetime) -> random.Random:
    seed = f"{vessel_id}:{_hour_bucket(now)}"
    return random.Random(seed)


def synthetic_readings(vessel_id: str, now: datetime) -> AdvisoryReadings:
    rng = _stable_rng(vessel_id, now)
    sst_val = round(26.5 + rng.uniform(-0.6, 1.8), 1)
    swell_val = round(0.8 + rng.uniform(0, 2.0), 2)
    wind_val = round(6 + rng.uniform(0, 14), 1)
    return AdvisoryReadings(
        sst=Evidence(value=sst_val, unit="°C", source="MOSDAC_SST_L4", valid_time=now, confidence=Confidence.HIGH, sigma=0.3),
        swell=Evidence(value=swell_val, unit="m", source="INCOIS", valid_time=now, confidence=Confidence.HIGH, sigma=0.2),
        wind=Evidence(value=wind_val, unit="kt", source="Damini", valid_time=now, confidence=Confidence.MEDIUM, sigma=1.5),
    )


def compute_advisory(vessel_id: str, lat: float, lon: float, now: datetime | None = None) -> AdvisoryAnswer:
    now = now or datetime.now(timezone.utc)
    readings = synthetic_readings(vessel_id, now)
    dist_km = distance_to_boundary_km(lat, lon)

    reasons = []
    verdict = Verdict.SAFE
    if readings.swell.value is not None and readings.swell.value >= 2.2:
        verdict = Verdict.UNSAFE
        reasons.append(f"Swell {readings.swell.value}m exceeds safe threshold (2.2m)")
    elif dist_km < 4:
        verdict = Verdict.UNSAFE
        reasons.append(f"Vessel is {dist_km}km from the maritime boundary — inside exclusion margin")
    elif readings.swell.value is not None and readings.swell.value >= 1.6:
        verdict = Verdict.CAUTION
        reasons.append(f"Swell {readings.swell.value}m is elevated — monitor closely")
    elif dist_km < 10:
        verdict = Verdict.CAUTION
        reasons.append(f"Vessel is {dist_km}km from the maritime boundary — approaching margin")
    else:
        reasons.append(f"Swell {readings.swell.value}m and wind {readings.wind.value}kt within normal range")
        reasons.append(f"{dist_km}km clear of maritime boundary")

    if verdict == Verdict.SAFE:
        window_hours = 6
        headline = f"Clear to fish until {(now + timedelta(hours=window_hours)).strftime('%H:%M')} UTC"
    elif verdict == Verdict.CAUTION:
        window_hours = 3
        headline = f"Proceed with caution — return by {(now + timedelta(hours=window_hours)).strftime('%H:%M')} UTC"
    else:
        window_hours = 0
        headline = "Return to port — conditions unsafe"

    return AdvisoryAnswer(
        vessel_id=vessel_id,
        verdict=verdict,
        headline=headline,
        return_window_closes=(now + timedelta(hours=window_hours)) if window_hours else now,
        readings=readings,
        reasons=reasons,
        generated_at=now,
        distance_to_imbl_km=dist_km,
    )


def compute_plan(departure_hour: float, duration_hours: float, cruise_speed_kt: float, fuel_limit_l: float, now: datetime | None = None) -> PlanResponse:
    now = now or datetime.now(timezone.utc)
    rng = random.Random(f"plan:{departure_hour}:{duration_hours}:{cruise_speed_kt}")
    burn_rate = 1.6 + (cruise_speed_kt / 14.0) * 2.4  # L per hour, rises with speed
    fuel_estimate = round(burn_rate * duration_hours, 1)
    reasons = []
    verdict = Verdict.SAFE

    max_wave_val = round(1.0 + rng.uniform(0, 1.6), 2)
    wave_evidence = Evidence(value=max_wave_val, unit="m", source="INCOIS", valid_time=now, confidence=Confidence.MEDIUM, sigma=0.25)

    if fuel_estimate > fuel_limit_l:
        verdict = Verdict.UNSAFE
        reasons.append(f"Projected burn {fuel_estimate}L exceeds fuel limit {fuel_limit_l}L")
    elif fuel_estimate > fuel_limit_l * 0.85:
        verdict = Verdict.CAUTION
        reasons.append(f"Projected burn {fuel_estimate}L is close to the {fuel_limit_l}L limit")
    else:
        reasons.append(f"Projected burn {fuel_estimate}L is within the {fuel_limit_l}L limit")

    if max_wave_val >= 2.0:
        verdict = Verdict.UNSAFE if verdict != Verdict.UNSAFE else verdict
        reasons.append(f"Offshore wave height {max_wave_val}m exceeds safe margin")
    elif max_wave_val >= 1.6 and verdict == Verdict.SAFE:
        verdict = Verdict.CAUTION
        reasons.append(f"Offshore wave height {max_wave_val}m is elevated")

    return_margin_hours = max(0.5, duration_hours * 0.15)
    no_return_hour = (departure_hour + duration_hours - return_margin_hours) % 24
    h = int(no_return_hour)
    m = int(round((no_return_hour - h) * 60))
    point_of_no_return = f"{h:02d}:{m:02d}"

    return PlanResponse(
        verdict=verdict,
        fuel_estimate_l=fuel_estimate,
        point_of_no_return=point_of_no_return,
        max_offshore_wave_m=wave_evidence,
        reasons=reasons,
        generated_at=now,
    )
