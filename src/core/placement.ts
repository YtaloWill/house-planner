import type { FurnitureObject, House, Vec2, Vec3 } from '../types/house'
import type { CatalogItem } from '../catalog/catalog'
import { closestPointOnSegment, dist, normalize, roundTo, sub } from './geometry'
import { isInsideHouse, overlappingObjects, wallEnds } from './house'

export interface PlacementOptions {
  gridSize: number
  gridSnap: boolean
  snapToWalls: boolean
  constrainToHouse: boolean
  /** rotation the user has dialled in for the preview, radians */
  rotation: number
}

export interface PlacementResult {
  position: Vec3
  rotation: number
  /** true when the object may be dropped here */
  valid: boolean
  reason: string | null
  /** ids of objects whose footprint this would overlap */
  collisions: string[]
  snappedToWall: string | null
}

const WALL_SNAP_RANGE = 0.8

/**
 * Works out where a furniture item should land for a pointer position on the
 * floor: resting on the floor, optionally snapped flat against a nearby wall,
 * otherwise grid snapped, with boundary and overlap checks.
 */
export function resolvePlacement(
  house: House,
  item: { id: string; size: { w: number; h: number; d: number } },
  point: Vec2,
  options: PlacementOptions,
): PlacementResult {
  let center: Vec2 = { ...point }
  let rotation = options.rotation
  let snappedToWall: string | null = null

  if (options.snapToWalls) {
    let bestWallId: string | null = null
    let bestDistance = WALL_SNAP_RANGE
    let bestPoint: Vec2 | null = null
    for (const wall of Object.values(house.walls)) {
      const [a, b] = wallEnds(house, wall)
      const candidate = closestPointOnSegment(point, a, b)
      const d = dist(point, candidate)
      if (d < bestDistance) {
        bestDistance = d
        bestWallId = wall.id
        bestPoint = candidate
      }
    }

    if (bestWallId && bestPoint) {
      const wall = house.walls[bestWallId]
      let normal = normalize(sub(point, bestPoint))
      if (Math.hypot(normal.x, normal.y) < 1e-6) {
        const [a, b] = wallEnds(house, wall)
        const dir = normalize(sub(b, a))
        normal = { x: -dir.y, y: dir.x }
      }
      rotation = Math.atan2(-normal.x, normal.y)
      const offset = wall.thickness / 2 + item.size.d / 2
      center = { x: bestPoint.x + normal.x * offset, y: bestPoint.y + normal.y * offset }
      snappedToWall = bestWallId
    }
  }

  if (!snappedToWall && options.gridSnap && options.gridSize > 0) {
    center = { x: roundTo(center.x, options.gridSize), y: roundTo(center.y, options.gridSize) }
  }

  const probe: FurnitureObject = {
    id: '__probe__',
    catalogId: item.id,
    name: 'probe',
    category: 'general',
    position: { x: center.x, y: 0, z: center.y },
    rotation,
    tilt: { x: 0, z: 0 },
    size: { ...item.size },
    color: '#ffffff',
  }

  const collisions = overlappingObjects(house, probe)
  const inside = isInsideHouse(house, center)
  const valid = !options.constrainToHouse || inside

  return {
    position: { x: center.x, y: 0, z: center.y },
    rotation,
    valid,
    reason: valid ? (collisions.length > 0 ? 'Overlaps another object' : null) : 'Outside the house',
    collisions,
    snappedToWall,
  }
}

export function catalogProbe(item: CatalogItem) {
  return { id: item.id, size: item.size }
}
