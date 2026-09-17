"""
Seed the SQLite database with sample data for Jalavita.
Run this once: python seed.py
"""
from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

# Skip if already seeded
if db.query(models.Vessel).count() > 0:
    print("Database already seeded. Skipping.")
    db.close()
    exit(0)


# --- Vessels ---
vessels = [
    models.Vessel(mmsi="ORCA-9", name="ORCA-9", operator="K. Naik", vessel_type="Fishing",
                  status="critical", latitude=14.5, longitude=71.9, speed_kts=14.0, bearing_deg=142.0),
    models.Vessel(mmsi="TFA-VANGUARD", name="TFA Vanguard", operator="R. Salvi", vessel_type="Patrol",
                  status="normal", latitude=13.8, longitude=72.3, speed_kts=10.0, bearing_deg=220.0),
    models.Vessel(mmsi="V-UNKN-882", name="V-UNKN-882", operator="Unregistered", vessel_type="Unknown",
                  status="warning", latitude=14.1, longitude=71.2, speed_kts=8.5, bearing_deg=95.0, registered=False),
    models.Vessel(mmsi="MMSI-112233", name="Convoy Bravo", operator="Coast Guard", vessel_type="Transport",
                  status="normal", latitude=13.5, longitude=70.8, speed_kts=12.0, bearing_deg=310.0),
    models.Vessel(mmsi="MMSI-556781", name="Sonar Sweep-4", operator="INCOIS", vessel_type="Research",
                  status="normal", latitude=15.2, longitude=72.1, speed_kts=6.0, bearing_deg=180.0),
]

# --- Sensor Arrays ---
sensors = [
    models.SensorArray(name="Oceansat-3", sensor_type="SAT-L3", uplink_pct=99.8, power_pct=85.0,
                       signal_dbm=-42.0, latency_ms=124.0, packet_loss_pct=0.02, temp_c=14.2),
    models.SensorArray(name="Wave Buoy #442", sensor_type="BUOY-S", uplink_pct=82.1, power_pct=35.0,
                       status="degraded", signal_dbm=-68.0, latency_ms=340.0, packet_loss_pct=1.2, temp_c=16.8),
    models.SensorArray(name="AIS Receiver Alpha", sensor_type="VHF-RX", uplink_pct=100.0, power_pct=100.0,
                       is_hardline=True, signal_dbm=-28.0, latency_ms=8.0, packet_loss_pct=0.0, temp_c=12.1),
]

# --- Archive Logs ---
logs = [
    models.ArchiveLog(vessel_id="MMSI-987654", incident_type="IMBL Breach (Zone 4)", severity="critical",
                      size_bytes=47185920, latitude=12.45, longitude=114.12, source_node="Sonar_Array_B", operator_id="CMD-04"),
    models.ArchiveLog(vessel_id="V-UNKN-882", incident_type="Severe Squall Detection", severity="warning",
                      size_bytes=1288490189, latitude=14.2, longitude=71.6, notes="Rapid pressure drop"),
    models.ArchiveLog(vessel_id="MMSI-112233", incident_type="Routine Patrol Log", severity="normal",
                      size_bytes=8388608, latitude=13.5, longitude=70.8, operator_id="CMD-02"),
    models.ArchiveLog(vessel_id="MMSI-556781", incident_type="Sonar Ping Sequence", severity="normal",
                      size_bytes=4096, latitude=15.2, longitude=72.1, source_node="AIS Alpha"),
]

# --- Weather Alerts ---
alerts = [
    models.WeatherAlert(severity="critical", event_type="Predicted Squall Onset",
                        description="Rapid pressure drop detected. 12 vessels notified.", sector="Alpha-9",
                        probability_pct=88.0, estimated_time="14:00Z"),
    models.WeatherAlert(severity="warning", event_type="Rogue Wave Probability Spike",
                        description="Anomalous wave heights predicted at 45.9N 12.4W.",
                        probability_pct=64.0),
    models.WeatherAlert(severity="normal", event_type="Thermal Layer Inversion",
                        description="Thermal layering expected at depth 150m-200m.",
                        probability_pct=12.0),
]

db.add_all(vessels)
db.add_all(sensors)
db.add_all(logs)
db.add_all(alerts)
db.commit()
db.close()

print("Database seeded successfully!")
