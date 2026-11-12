import type { House, Vec2 } from '../types/house'
import { dist, distToSegment, lerp, pointInPolygon } from '../core/geometry'
import { openingsForWall, wallEnds } from '../core/house'
import type { Selection } from '../store/useStore'

/** Centre of an opening in floor-plan coordinates. */
export function openingCenter(h: House, openingId: string): Vec2 | null {
  const opening = h.openings[openingId]
  if (!opening) return null
  const wall = h.walls[opening.wallId]
  if (!wall) return null
  const [a, b] = wallEnds(h, wall)
  return lerp(a, b, opening.t)
}

export function objectCorners(
  center: Vec2,
  w: number,
  d: number,
  rotation: number,
): Vec2[] {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  return [
    { x: -w / 2, y: -d / 2 },
    { x: w / 2, y: -d / 2 },
    { x: w / 2, y: d / 2 },
    { x: -w / 2, y: d / 2 },
  ].map((p) => ({ x: center.x + p.x * c - p.y * s, y: center.y + p.x * s + p.y * c }))
}

/**
 * Picks whatever is under a floor-plan point, in the order that feels right for
 * editing: small handles first, areas last.
 */
export function hitTest(h: House, p: Vec2, tol: number): Selection {
  for (const opening of Object.values(h.openings)) {
    const center = openingCenter(h, opening.id)
    if (center && dist(center, p) <= Math.max(tol, opening.width / 2)) {
      return { kind: 'opening', id: opening.id }
    }
  }

  for (const vertex of Object.values(h.vertices)) {
    if (dist(vertex, p) <= tol) return { kind: 'vertex', id: vertex.id }
  }

  for (const obj of Object.values(h.objects)) {
    const center = { x: obj.position.x, y: obj.position.z }
    const corners = objectCorners(center, obj.size.w, obj.size.d, obj.rotation)
    if (pointInPolygon(p, corners)) return { kind: 'object', id: obj.id }
  }

  for (const wall of Object.values(h.walls)) {
    const [a, b] = wallEnds(h, wall)
    if (distToSegment(p, a, b) <= Math.max(tol, wall.thickness / 2)) {
      return { kind: 'wall', id: wall.id }
    }
  }

  const rooms = h.rooms.filter((room) => pointInPolygon(p, room.polygon))
  rooms.sort((x, y) => x.area - y.area)
  if (rooms[0]) return { kind: 'room', id: rooms[0].id }

  return { kind: 'none' }
}

/** Parameter along a wall for a point, used when dropping doors/windows. */
export function wallParamAt(h: House, wallId: string, p: Vec2): number {
  const wall = h.walls[wallId]
  if (!wall) return 0.5
  const [a, b] = wallEnds(h, wall)
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const len2 = ab.x * ab.x + ab.y * ab.y
  if (len2 < 1e-9) return 0.5
  const t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2
  return Math.min(1, Math.max(0, t))
}

export function wallOpeningSpans(h: House, wallId: string) {
  const wall = h.walls[wallId]
  if (!wall) return []
  const [a, b] = wallEnds(h, wall)
  const len = dist(a, b)
  return openingsForWall(h, wallId).map((opening) => {
    const half = opening.width / 2 / Math.max(len, 1e-6)
    return {
      opening,
      from: lerp(a, b, Math.max(0, opening.t - half)),
      to: lerp(a, b, Math.min(1, opening.t + half)),
      center: lerp(a, b, opening.t),
    }
  })
}
