import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatUTCTime(date: Date = new Date()): string {
  return date.toISOString().slice(11, 19)
}

export function formatCoordinate(value: number, type: 'lat' | 'lon'): string {
  const dir = type === 'lat' ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W')
  return `${Math.abs(value).toFixed(2)}°${dir}`
}
