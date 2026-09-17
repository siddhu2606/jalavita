/**
 * Jalavita API client — connects to the FastAPI backend.
 */

const BASE_URL = "http://localhost:8000";

// ── REST helpers ──────────────────────────────────────────
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// ── Types ─────────────────────────────────────────────────
export interface Vessel {
  id: number;
  mmsi: string;
  name: string;
  operator: string;
  vessel_type: string;
  status: string;
  latitude: number;
  longitude: number;
  speed_kts: number;
  bearing_deg: number;
  last_seen: string;
  registered: boolean;
}

export interface SensorArray {
  id: number;
  name: string;
  sensor_type: string;
  uplink_pct: number;
  power_pct: number;
  is_hardline: boolean;
  status: string;
  signal_dbm: number;
  latency_ms: number;
  packet_loss_pct: number;
  temp_c: number;
}

export interface ArchiveLog {
  id: number;
  timestamp: string;
  vessel_id: string;
  incident_type: string;
  severity: string;
  size_bytes: number;
  latitude: number;
  longitude: number;
  notes: string;
  source_node: string;
  operator_id: string;
}

export interface WeatherAlert {
  id: number;
  timestamp: string;
  severity: string;
  event_type: string;
  description: string;
  sector: string;
  probability_pct: number;
  estimated_time: string;
  is_active: boolean;
}

export interface DashboardSummary {
  vessel_count: number;
  active_pfz: number;
  weather_alerts: number;
  critical_alerts: number;
  network_resilience: number;
  online_sensors: number;
  system_latency_ms: number;
}

export interface TripPlanRequest {
  vessel_mmsi: string;
  departure_time: string;
  cruise_speed_kts: number;
  duration_hrs: number;
  fuel_limit_l: number;
}

export interface TripPlanResult {
  id: number;
  departure_time: string;
  cruise_speed_kts: number;
  duration_hrs: number;
  fuel_limit_l: number;
  estimated_fuel_l: number;
  point_of_no_return: string;
  status: string;
  route_json: string;
}

// ── API functions ─────────────────────────────────────────
export const api = {
  summary: () => get<DashboardSummary>("/api/summary"),
  vessels: (status?: string) =>
    get<Vessel[]>(status ? `/api/vessels?status=${status}` : "/api/vessels"),
  vessel: (mmsi: string) => get<Vessel>(`/api/vessels/${mmsi}`),
  sensors: () => get<SensorArray[]>("/api/sensors"),
  archive: (severity?: string) =>
    get<ArchiveLog[]>(severity ? `/api/archive?severity=${severity}` : "/api/archive"),
  alerts: () => get<WeatherAlert[]>("/api/alerts"),
  calculateTrip: (data: TripPlanRequest) =>
    post<TripPlanResult>("/api/trip-planner/calculate", data),
  broadcast: (target: string, language: string, message: string) =>
    post("/api/broadcast", { target, language, message }),
};

// ── WebSocket hooks ───────────────────────────────────────
export function createWebSocket(
  channel: "telemetry" | "terminal" | "agents",
  onMessage: (data: unknown) => void
): WebSocket {
  const ws = new WebSocket(`ws://localhost:8000/ws/${channel}`);
  ws.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      /* ignore parse errors */
    }
  };
  ws.onerror = () => console.warn(`[WS] ${channel} error`);
  return ws;
}
