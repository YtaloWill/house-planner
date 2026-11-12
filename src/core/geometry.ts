import type { Vec2 } from '../types/house'

export const EPS = 1e-9

export function v2(x: number, y: number): Vec2 {
  return { x, y }
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(a: Vec2, k: number): Vec2 {
  return { x: a.x * k, y: a.y * k }
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

export function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

export function length(a: Vec2): number {
  return Math.hypot(a.x, a.y)
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function normalize(a: Vec2): Vec2 {
  const l = length(a)
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }
}

/** Counter-clockwise perpendicular. */
export function perp(a: Vec2): Vec2 {
  return { x: -a.y, y: a.x }
}

export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

export function angleOf(a: Vec2): number {
  return Math.atan2(a.y, a.x)
}

export function roundTo(value: number, step: number): number {
  return step <= 0 ? value : Math.round(value / step) * step
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function nearlyEqual(a: Vec2, b: Vec2, tol = 1e-6): boolean {
  return Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol
}

/** Parameter of the projection of p onto segment ab, clamped to [0, 1]. */
export function projectOnSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = sub(b, a)
  const len2 = dot(ab, ab)
  if (len2 < EPS) return 0
  return clamp(dot(sub(p, a), ab) / len2, 0, 1)
}

export function closestPointOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  return lerp(a, b, projectOnSegment(p, a, b))
}

export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  return dist(p, closestPointOnSegment(p, a, b))
}

/**
 * Intersection of segments p1p2 and p3p4.
 * Returns the parameters along each segment, or null when parallel.
 */
export function segmentIntersection(
  p1: Vec2,
  p2: Vec2,
  p3: Vec2,
  p4: Vec2,
): { t: number; u: number; point: Vec2 } | null {
  const r = sub(p2, p1)
  const s = sub(p4, p3)
  const denom = cross(r, s)
  if (Math.abs(denom) < 1e-12) return null
  const qp = sub(p3, p1)
  const t = cross(qp, s) / denom
  const u = cross(qp, r) / denom
  return { t, u, point: lerp(p1, p2, t) }
}

/** Shoelace signed area. Positive when the polygon winds counter-clockwise. */
export function signedArea(poly: Vec2[]): number {
  let sum = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    sum += a.x * b.y - b.x * a.y
  }
  return sum / 2
}

export function polygonArea(poly: Vec2[]): number {
  return Math.abs(signedArea(poly))
}

export function polygonCentroid(poly: Vec2[]): Vec2 {
  const a = signedArea(poly)
  if (Math.abs(a) < 1e-9) {
    // Degenerate: fall back to the average of the vertices.
    const sum = poly.reduce((acc, p) => add(acc, p), v2(0, 0))
    return scale(sum, 1 / Math.max(1, poly.length))
  }
  let cx = 0
  let cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

export function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    const intersects =
      a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    if (intersects) inside = !inside
  }
  return inside
}

export interface Bounds {
  min: Vec2
  max: Vec2
}

export function boundsOf(points: Vec2[]): Bounds | null {
  if (points.length === 0) return null
  const min = { x: Infinity, y: Infinity }
  const max = { x: -Infinity, y: -Infinity }
  for (const p of points) {
    min.x = Math.min(min.x, p.x)
    min.y = Math.min(min.y, p.y)
    max.x = Math.max(max.x, p.x)
    max.y = Math.max(max.y, p.y)
  }
  return { min, max }
}

/** Axis-aligned overlap test for two rotated rectangles, using their SAT projections. */
export function rectsOverlap(
  a: { cx: number; cy: number; w: number; d: number; rot: number },
  b: { cx: number; cy: number; w: number; d: number; rot: number },
  slack = 0,
): boolean {
  const cornersOf = (r: typeof a): Vec2[] => {
    const c = Math.cos(r.rot)
    const s = Math.sin(r.rot)
    const hw = Math.max(0, r.w / 2 - slack)
    const hd = Math.max(0, r.d / 2 - slack)
    return [
      { x: -hw, y: -hd },
      { x: hw, y: -hd },
      { x: hw, y: hd },
      { x: -hw, y: hd },
    ].map((p) => ({ x: r.cx + p.x * c - p.y * s, y: r.cy + p.x * s + p.y * c }))
  }
  const ca = cornersOf(a)
  const cb = cornersOf(b)
  const axes = [
    { x: Math.cos(a.rot), y: Math.sin(a.rot) },
    { x: -Math.sin(a.rot), y: Math.cos(a.rot) },
    { x: Math.cos(b.rot), y: Math.sin(b.rot) },
    { x: -Math.sin(b.rot), y: Math.cos(b.rot) },
  ]
  for (const axis of axes) {
    let minA = Infinity
    let maxA = -Infinity
    let minB = Infinity
    let maxB = -Infinity
    for (const p of ca) {
      const d = dot(p, axis)
      minA = Math.min(minA, d)
      maxA = Math.max(maxA, d)
    }
    for (const p of cb) {
      const d = dot(p, axis)
      minB = Math.min(minB, d)
      maxB = Math.max(maxB, d)
    }
    if (maxA <= minB + 1e-9 || maxB <= minA + 1e-9) return false
  }
  return true
}

/** Formats a length in meters for display, e.g. 3.25 → "3.25 m". */
export function formatMeters(value: number, digits = 2): string {
  return `${value.toFixed(digits)} m`
}

export function formatArea(value: number): string {
  return `${value.toFixed(2)} m²`
}

export function degrees(radians: number): number {
  return (radians * 180) / Math.PI
}

export function radians(deg: number): number {
  return (deg * Math.PI) / 180
}
