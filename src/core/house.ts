import type {
  FurnitureObject,
  House,
  Opening,
  OpeningKind,
  Vec2,
  Vec3,
  Wall,
} from '../types/house'
import { HOUSE_VERSION } from '../types/house'
import type { CatalogItem } from '../catalog/catalog'
import {
  type Bounds,
  boundsOf,
  closestPointOnSegment,
  dist,
  distToSegment,
  lerp,
  normalize,
  pointInPolygon,
  projectOnSegment,
  rectsOverlap,
  roundTo,
  segmentIntersection,
  sub,
} from './geometry'
import { syncRooms } from './rooms'

let counter = 0

export function uid(prefix: string): string {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}

export const DEFAULTS = {
  wallHeight: 2.6,
  wallThickness: 0.15,
  wallColor: '#e8e4dd',
  door: { width: 0.9, height: 2.05, sill: 0 },
  window: { width: 1.2, height: 1.2, sill: 0.9 },
  /** snap radius in meters, used for vertex/wall snapping */
  snapTolerance: 0.25,
  /** furniture is positioned and sized to the centimetre, not to the grid */
  objectStep: 0.01,
  /** furniture rotates in 1° steps */
  objectAngleStep: Math.PI / 180,
}

export function createHouse(name = 'Untitled House'): House {
  const now = new Date().toISOString()
  return {
    meta: {
      id: uid('house'),
      name,
      createdAt: now,
      updatedAt: now,
      units: 'm',
      version: HOUSE_VERSION,
    },
    vertices: {},
    walls: {},
    openings: {},
    rooms: [],
    objects: {},
    defaults: {
      wallHeight: DEFAULTS.wallHeight,
      wallThickness: DEFAULTS.wallThickness,
      wallColor: DEFAULTS.wallColor,
    },
  }
}

/* ------------------------------------------------------------------ walls */

export function vertexPos(h: House, id: string): Vec2 {
  const v = h.vertices[id]
  return { x: v.x, y: v.y }
}

export function wallEnds(h: House, wall: Wall): [Vec2, Vec2] {
  return [vertexPos(h, wall.a), vertexPos(h, wall.b)]
}

export function wallLength(h: House, wall: Wall): number {
  const [a, b] = wallEnds(h, wall)
  return dist(a, b)
}

export function wallAngle(h: House, wall: Wall): number {
  const [a, b] = wallEnds(h, wall)
  return Math.atan2(b.y - a.y, b.x - a.x)
}

export function wallCenter(h: House, wall: Wall): Vec2 {
  const [a, b] = wallEnds(h, wall)
  return lerp(a, b, 0.5)
}

export function wallDirection(h: House, wall: Wall): Vec2 {
  const [a, b] = wallEnds(h, wall)
  return normalize(sub(b, a))
}

export function wallsAtVertex(h: House, vertexId: string): Wall[] {
  return Object.values(h.walls).filter((w) => w.a === vertexId || w.b === vertexId)
}

export function findWallNear(h: House, p: Vec2, tol = DEFAULTS.snapTolerance): Wall | undefined {
  let best: Wall | undefined
  let bestDist = tol
  for (const wall of Object.values(h.walls)) {
    const [a, b] = wallEnds(h, wall)
    const d = distToSegment(p, a, b)
    if (d <= bestDist) {
      bestDist = d
      best = wall
    }
  }
  return best
}

export function findVertexNear(h: House, p: Vec2, tol = DEFAULTS.snapTolerance): string | undefined {
  let best: string | undefined
  let bestDist = tol
  for (const v of Object.values(h.vertices)) {
    const d = dist(p, v)
    if (d <= bestDist) {
      bestDist = d
      best = v.id
    }
  }
  return best
}

/* --------------------------------------------------------------- snapping */

export type SnapKind = 'free' | 'grid' | 'vertex' | 'wall' | 'axis'

export interface SnapOptions {
  gridSize: number
  snapEnabled: boolean
  tol?: number
  /** when drawing a chain, the previous point — enables axis locking */
  from?: Vec2
  axisLock?: boolean
}

export interface SnapResult {
  point: Vec2
  kind: SnapKind
  vertexId?: string
  wallId?: string
}

export function snapPoint(h: House, p: Vec2, opts: SnapOptions): SnapResult {
  const tol = opts.tol ?? DEFAULTS.snapTolerance

  if (opts.snapEnabled) {
    const vertexId = findVertexNear(h, p, tol)
    if (vertexId) return { point: vertexPos(h, vertexId), kind: 'vertex', vertexId }

    const wall = findWallNear(h, p, tol)
    if (wall) {
      const [a, b] = wallEnds(h, wall)
      return { point: closestPointOnSegment(p, a, b), kind: 'wall', wallId: wall.id }
    }
  }

  let point = { ...p }

  if (opts.from && opts.axisLock !== false) {
    const dx = point.x - opts.from.x
    const dy = point.y - opts.from.y
    const len = Math.hypot(dx, dy)
    if (len > 1e-6) {
      const angle = Math.atan2(dy, dx)
      // Lock to the nearest 15° increment when we are close to one.
      const step = Math.PI / 12
      const snapped = Math.round(angle / step) * step
      if (Math.abs(((angle - snapped + Math.PI) % (2 * Math.PI)) - Math.PI) < (4 * Math.PI) / 180) {
        const snappedLen = opts.snapEnabled ? Math.max(opts.gridSize, roundTo(len, opts.gridSize)) : len
        return {
          point: {
            x: opts.from.x + Math.cos(snapped) * snappedLen,
            y: opts.from.y + Math.sin(snapped) * snappedLen,
          },
          kind: 'axis',
        }
      }
    }
  }

  if (opts.snapEnabled && opts.gridSize > 0) {
    point = { x: roundTo(point.x, opts.gridSize), y: roundTo(point.y, opts.gridSize) }
    return { point, kind: 'grid' }
  }

  return { point, kind: 'free' }
}

/* ------------------------------------------------- structural operations */

function createVertex(h: House, p: Vec2): string {
  const id = uid('v')
  h.vertices[id] = { id, x: p.x, y: p.y }
  return id
}

/** Splits a wall at parameter t (0..1), returning the id of the new middle vertex. */
export function splitWallAt(h: House, wallId: string, t: number): string {
  const wall = h.walls[wallId]
  const [a, b] = wallEnds(h, wall)
  const point = lerp(a, b, t)
  const mid = createVertex(h, point)

  const second: Wall = {
    ...wall,
    id: uid('w'),
    a: mid,
    b: wall.b,
  }
  wall.b = mid
  h.walls[second.id] = second

  // Re-home openings onto whichever half now contains them.
  for (const opening of Object.values(h.openings)) {
    if (opening.wallId !== wallId) continue
    if (opening.t <= t) {
      opening.t = t <= 1e-9 ? 0 : opening.t / t
    } else {
      opening.wallId = second.id
      opening.t = (opening.t - t) / Math.max(1e-9, 1 - t)
    }
  }

  return mid
}

/**
 * Returns the id of a vertex at p: an existing vertex if one is within
 * tolerance, a new vertex splitting a wall if p lies on one, else a new vertex.
 */
export function ensureVertexAt(h: House, p: Vec2, tol = DEFAULTS.snapTolerance): string {
  const existing = findVertexNear(h, p, tol)
  if (existing) return existing

  const wall = findWallNear(h, p, tol)
  if (wall) {
    const [a, b] = wallEnds(h, wall)
    const t = projectOnSegment(p, a, b)
    const len = dist(a, b)
    if (t * len > tol && (1 - t) * len > tol) return splitWallAt(h, wall.id, t)
    return t < 0.5 ? wall.a : wall.b
  }

  return createVertex(h, p)
}

function wallBetween(h: House, a: string, b: string): Wall | undefined {
  return Object.values(h.walls).find(
    (w) => (w.a === a && w.b === b) || (w.a === b && w.b === a),
  )
}

function connect(h: House, a: string, b: string, props?: Partial<Wall>): Wall | undefined {
  if (a === b) return undefined
  const existing = wallBetween(h, a, b)
  if (existing) return existing
  const wall: Wall = {
    id: uid('w'),
    a,
    b,
    height: props?.height ?? h.defaults.wallHeight,
    thickness: props?.thickness ?? h.defaults.wallThickness,
    color: props?.color ?? h.defaults.wallColor,
  }
  h.walls[wall.id] = wall
  return wall
}

/**
 * Draws a wall from p1 to p2, splitting any wall it crosses and routing through
 * any existing vertex it passes over, so that the result stays a planar graph
 * and enclosed areas are detected reliably.
 */
export function addWallChain(
  h: House,
  p1: Vec2,
  p2: Vec2,
  props?: Partial<Wall>,
  tol = DEFAULTS.snapTolerance,
): string[] {
  if (dist(p1, p2) < Math.max(1e-6, tol * 0.4)) return []

  const startId = ensureVertexAt(h, p1, tol)
  const endId = ensureVertexAt(h, p2, tol)
  if (startId === endId) return []

  const start = vertexPos(h, startId)
  const end = vertexPos(h, endId)
  const segLength = dist(start, end)

  // Collect every point along the new segment that must become a vertex.
  const stops: { t: number; vertexId: string }[] = []
  const seen = new Set<string>([startId, endId])

  // 1. Existing vertices lying on the new segment (T-junctions / pass-throughs).
  for (const v of Object.values(h.vertices)) {
    if (seen.has(v.id)) continue
    if (distToSegment(v, start, end) > tol * 0.5) continue
    const t = projectOnSegment(v, start, end)
    if (t * segLength <= tol * 0.5 || (1 - t) * segLength <= tol * 0.5) continue
    stops.push({ t, vertexId: v.id })
    seen.add(v.id)
  }

  // 2. Proper crossings with existing walls — split them.
  for (const wall of Object.values(h.walls).slice()) {
    const [a, b] = wallEnds(h, wall)
    const hit = segmentIntersection(start, end, a, b)
    if (!hit) continue
    const wallLen = dist(a, b)
    const marginNew = tol * 0.5
    if (hit.t * segLength <= marginNew || (1 - hit.t) * segLength <= marginNew) continue
    if (hit.u * wallLen <= marginNew || (1 - hit.u) * wallLen <= marginNew) continue
    const mid = splitWallAt(h, wall.id, hit.u)
    stops.push({ t: hit.t, vertexId: mid })
    seen.add(mid)
  }

  stops.sort((x, y) => x.t - y.t)

  const chain = [startId, ...stops.map((s) => s.vertexId), endId]
  const created: string[] = []
  for (let i = 0; i < chain.length - 1; i++) {
    const wall = connect(h, chain[i], chain[i + 1], props)
    if (wall) created.push(wall.id)
  }
  return created
}

export function removeWall(h: House, wallId: string): void {
  const wall = h.walls[wallId]
  if (!wall) return
  delete h.walls[wallId]
  for (const opening of Object.values(h.openings)) {
    if (opening.wallId === wallId) delete h.openings[opening.id]
  }
  pruneVertex(h, wall.a)
  pruneVertex(h, wall.b)
}

function pruneVertex(h: House, vertexId: string): void {
  if (wallsAtVertex(h, vertexId).length === 0) delete h.vertices[vertexId]
}

export function removeVertex(h: House, vertexId: string): void {
  for (const wall of wallsAtVertex(h, vertexId)) removeWall(h, wall.id)
  delete h.vertices[vertexId]
}

export function moveVertexTo(h: House, vertexId: string, p: Vec2): void {
  const v = h.vertices[vertexId]
  if (!v) return
  v.x = p.x
  v.y = p.y
}

/** Moves a whole wall, dragging both of its endpoints (and anything attached). */
export function translateWall(h: House, wallId: string, delta: Vec2): void {
  const wall = h.walls[wallId]
  if (!wall) return
  for (const id of [wall.a, wall.b]) {
    const v = h.vertices[id]
    v.x += delta.x
    v.y += delta.y
  }
}

/** Changes a wall's length by moving its b endpoint along the wall direction. */
export function setWallLength(h: House, wallId: string, newLength: number): void {
  const wall = h.walls[wallId]
  if (!wall || newLength <= 0) return
  const [a] = wallEnds(h, wall)
  const dir = wallDirection(h, wall)
  moveVertexTo(h, wall.b, { x: a.x + dir.x * newLength, y: a.y + dir.y * newLength })
}

/** Rotates a wall around its a endpoint, keeping its length. */
export function setWallAngle(h: House, wallId: string, angleRad: number): void {
  const wall = h.walls[wallId]
  if (!wall) return
  const [a] = wallEnds(h, wall)
  const len = wallLength(h, wall)
  moveVertexTo(h, wall.b, {
    x: a.x + Math.cos(angleRad) * len,
    y: a.y + Math.sin(angleRad) * len,
  })
}

export function setWallEndpoint(h: House, wallId: string, which: 'a' | 'b', p: Vec2): void {
  const wall = h.walls[wallId]
  if (!wall) return
  moveVertexTo(h, which === 'a' ? wall.a : wall.b, p)
}

/* ------------------------------------------------------------- openings */

export function openingsForWall(h: House, wallId: string): Opening[] {
  return Object.values(h.openings)
    .filter((o) => o.wallId === wallId)
    .sort((a, b) => a.t - b.t)
}

/** Adds a door or window to a wall. Width defaults to the preset for the kind. */
export function addOpening(
  h: House,
  wallId: string,
  kind: OpeningKind,
  t: number,
  width?: number,
): Opening | null {
  const wall = h.walls[wallId]
  if (!wall) return null
  const preset = kind === 'door' ? DEFAULTS.door : DEFAULTS.window
  const requested = width ?? preset.width
  const len = wallLength(h, wall)
  // A wide passage may fill nearly the whole wall; only a sliver is required.
  if (len < requested + 0.02) return null
  const half = requested / 2 / len
  const opening: Opening = {
    id: uid('o'),
    wallId,
    kind,
    t: Math.min(1 - half, Math.max(half, t)),
    width: requested,
    height: Math.min(preset.height, wall.height - preset.sill - 0.05),
    sill: preset.sill,
  }
  h.openings[opening.id] = opening
  return opening
}

export function removeOpening(h: House, id: string): void {
  delete h.openings[id]
}

/** Clamps an opening so it stays inside its wall and under the wall height. */
export function normalizeOpening(h: House, id: string): void {
  const opening = h.openings[id]
  if (!opening) return
  const wall = h.walls[opening.wallId]
  if (!wall) {
    delete h.openings[id]
    return
  }
  const len = wallLength(h, wall)
  opening.width = Math.max(0.2, Math.min(opening.width, len - 0.05))
  opening.sill = Math.max(0, Math.min(opening.sill, wall.height - 0.2))
  opening.height = Math.max(0.2, Math.min(opening.height, wall.height - opening.sill))
  const half = opening.width / 2 / Math.max(len, 1e-6)
  opening.t = Math.min(1 - half, Math.max(half, opening.t))
}

/* ------------------------------------------------------------- objects */

export function objectFootprint(obj: FurnitureObject) {
  return {
    cx: obj.position.x,
    cy: obj.position.z,
    w: obj.size.w,
    d: obj.size.d,
    rot: obj.rotation,
  }
}

export function addObject(
  h: House,
  item: CatalogItem,
  position: Vec3,
  rotation = 0,
): FurnitureObject {
  const obj: FurnitureObject = {
    id: uid('obj'),
    catalogId: item.id,
    name: item.name,
    category: item.category,
    position: { ...position },
    rotation,
    tilt: { x: 0, z: 0 },
    size: { ...item.size },
    color: item.color,
  }
  obj.roomId = roomIdAt(h, { x: position.x, y: position.z })
  h.objects[obj.id] = obj
  return obj
}

export function removeObject(h: House, id: string): void {
  delete h.objects[id]
}

export function duplicateObject(h: House, id: string): string | null {
  const source = h.objects[id]
  if (!source) return null
  const copy: FurnitureObject = {
    ...source,
    id: uid('obj'),
    tilt: { ...source.tilt },
    position: { ...source.position, x: source.position.x + 0.3, z: source.position.z + 0.3 },
    size: { ...source.size },
  }
  copy.roomId = roomIdAt(h, { x: copy.position.x, y: copy.position.z })
  h.objects[copy.id] = copy
  return copy.id
}

export function roomIdAt(h: House, p: Vec2): string | undefined {
  const hits = h.rooms.filter((room) => pointInPolygon(p, room.polygon))
  hits.sort((a, b) => a.area - b.area)
  return hits[0]?.id
}

export function isInsideHouse(h: House, p: Vec2): boolean {
  return h.rooms.some((room) => pointInPolygon(p, room.polygon))
}

/** Ids of objects whose footprint overlaps the given one. */
export function overlappingObjects(h: House, obj: FurnitureObject): string[] {
  const a = objectFootprint(obj)
  return Object.values(h.objects)
    .filter((other) => other.id !== obj.id)
    .filter((other) => rectsOverlap(a, objectFootprint(other), 0.02))
    .map((other) => other.id)
}

/* --------------------------------------------------------------- derived */

export function refreshRooms(h: House): void {
  h.rooms = syncRooms(h)
  for (const obj of Object.values(h.objects)) {
    obj.roomId = roomIdAt(h, { x: obj.position.x, y: obj.position.z })
  }
  for (const id of Object.keys(h.openings)) normalizeOpening(h, id)
}

export function houseBounds(h: House): Bounds | null {
  const points: Vec2[] = Object.values(h.vertices).map((v) => ({ x: v.x, y: v.y }))
  for (const obj of Object.values(h.objects)) {
    points.push({ x: obj.position.x, y: obj.position.z })
  }
  return boundsOf(points)
}

export function totalFloorArea(h: House): number {
  return h.rooms.reduce((sum, room) => sum + room.area, 0)
}
