import type { House, Room, Vec2, Vertex, Wall } from '../types/house'
import { angleOf, polygonArea, polygonCentroid, pointInPolygon, signedArea } from './geometry'
import { roomTypeColor } from '../types/house'

/** Smallest enclosed area (m²) that counts as a room. Filters out slivers. */
export const MIN_ROOM_AREA = 0.4

export interface Face {
  /** boundary walls, in traversal order */
  wallIds: string[]
  /** boundary vertices, counter-clockwise */
  polygon: Vec2[]
  area: number
}

interface HalfEdge {
  wallId: string
  from: string
  to: string
  angle: number
}

const keyOf = (he: { wallId: string; from: string }) => `${he.wallId}|${he.from}`

/**
 * Finds the minimal cycles (faces) of the wall graph — i.e. the enclosed areas.
 *
 * Walls form an undirected planar graph; each wall is split into two directed
 * half-edges. Walking "always take the next edge clockwise from the one you came
 * back along" traverses one face per half-edge. The unbounded face of each
 * connected component comes out clockwise (negative signed area) and is dropped,
 * leaving the enclosed rooms.
 */
export function detectFaces(
  vertices: Record<string, Vertex>,
  walls: Record<string, Wall>,
): Face[] {
  const incident = new Map<string, HalfEdge[]>()

  for (const wall of Object.values(walls)) {
    const a = vertices[wall.a]
    const b = vertices[wall.b]
    if (!a || !b || wall.a === wall.b) continue
    const ab: HalfEdge = { wallId: wall.id, from: a.id, to: b.id, angle: angleOf({ x: b.x - a.x, y: b.y - a.y }) }
    const ba: HalfEdge = { wallId: wall.id, from: b.id, to: a.id, angle: angleOf({ x: a.x - b.x, y: a.y - b.y }) }
    if (!incident.has(a.id)) incident.set(a.id, [])
    if (!incident.has(b.id)) incident.set(b.id, [])
    incident.get(a.id)!.push(ab)
    incident.get(b.id)!.push(ba)
  }

  // Sort outgoing half-edges by angle so we can pick neighbours rotationally.
  for (const list of incident.values()) list.sort((p, q) => p.angle - q.angle)

  const visited = new Set<string>()
  const faces: Face[] = []

  for (const list of incident.values()) {
    for (const start of list) {
      if (visited.has(keyOf(start))) continue

      const wallIds: string[] = []
      const polygon: Vec2[] = []
      let current = start
      let guard = 0

      while (guard++ < 10000) {
        visited.add(keyOf(current))
        wallIds.push(current.wallId)
        const fromVertex = vertices[current.from]
        polygon.push({ x: fromVertex.x, y: fromVertex.y })

        const outgoing = incident.get(current.to)
        if (!outgoing || outgoing.length === 0) break
        // The half-edge that walks back the way we came.
        const backIndex = outgoing.findIndex(
          (he) => he.wallId === current.wallId && he.to === current.from,
        )
        if (backIndex < 0) break
        const next = outgoing[(backIndex - 1 + outgoing.length) % outgoing.length]
        if (keyOf(next) === keyOf(start)) break
        if (visited.has(keyOf(next))) break
        current = next
      }

      if (polygon.length < 3) continue
      const area = signedArea(polygon)
      // Clockwise cycles are the unbounded faces; only keep enclosed areas.
      if (area <= 0) continue
      if (area < MIN_ROOM_AREA) continue
      faces.push({ wallIds, polygon, area })
    }
  }

  return faces
}

/**
 * Recomputes the room list from the wall graph, carrying user-assigned names,
 * types and colours over to the matching new rooms.
 */
export function syncRooms(house: House): Room[] {
  const faces = detectFaces(house.vertices, house.walls)
  const previous = house.rooms.slice()
  const taken = new Set<string>()
  const rooms: Room[] = []

  for (const face of faces) {
    const polygon = face.polygon
    const centroid = polygonCentroid(polygon)
    const area = polygonArea(polygon)

    // Carry over a previous room when its centroid still falls in this area, or
    // when this area's centroid falls inside the old polygon (handles resizes).
    let match: Room | undefined
    let bestScore = Infinity
    for (const room of previous) {
      if (taken.has(room.id)) continue
      const oldCentroid = polygonCentroid(room.polygon)
      const overlaps =
        pointInPolygon(oldCentroid, polygon) || pointInPolygon(centroid, room.polygon)
      if (!overlaps) continue
      const score = Math.abs(room.area - area) + Math.hypot(oldCentroid.x - centroid.x, oldCentroid.y - centroid.y)
      if (score < bestScore) {
        bestScore = score
        match = room
      }
    }

    if (match) taken.add(match.id)

    rooms.push({
      id: match?.id ?? `room-${Math.random().toString(36).slice(2, 10)}`,
      name: match?.name ?? `Room ${rooms.length + 1}`,
      type: match?.type ?? 'other',
      floorColor: match?.floorColor ?? roomTypeColor(match?.type ?? 'other'),
      wallIds: face.wallIds,
      polygon,
      area,
    })
  }

  return rooms
}

/** The room whose polygon contains the given floor-plan point, if any. */
export function roomAt(rooms: Room[], point: Vec2): Room | undefined {
  // Smallest matching room wins, so rooms nested in rooms behave sensibly.
  const hits = rooms.filter((room) => pointInPolygon(point, room.polygon))
  hits.sort((a, b) => a.area - b.area)
  return hits[0]
}
