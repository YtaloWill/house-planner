/**
 * Single source of truth for the house. Rendering-engine agnostic.
 *
 * Coordinate conventions:
 *  - 1 unit = 1 meter, everywhere.
 *  - Floor-plan space is 2D: (x, y). It maps to world space as X = x, Z = y.
 *  - World Y is vertical height (0 = floor level).
 */

export interface Vec2 {
  x: number
  y: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** A wall endpoint. Walls share vertices so connected geometry stays connected. */
export interface Vertex {
  id: string
  x: number
  y: number
}

export interface Wall {
  id: string
  /** vertex id of the wall start */
  a: string
  /** vertex id of the wall end */
  b: string
  /** meters, from floor to top of wall */
  height: number
  /** meters, total wall thickness (centred on the a→b line) */
  thickness: number
  color: string
  /** per-wall visibility override for 3D inspection */
  hidden?: boolean
}

export type OpeningKind = 'door' | 'window'

export interface Opening {
  id: string
  wallId: string
  kind: OpeningKind
  /** centre position along the wall, 0..1 from vertex a to vertex b */
  t: number
  /** meters */
  width: number
  /** meters */
  height: number
  /** meters from the floor to the bottom of the opening (0 for doors) */
  sill: number
}

export type RoomType = 'living' | 'kitchen' | 'bedroom' | 'bathroom' | 'laundry' | 'other'

export interface Room {
  id: string
  name: string
  type: RoomType
  /** ids of the walls that enclose this room */
  wallIds: string[]
  /** closed boundary polygon in floor-plan space (centre-lines of the walls) */
  polygon: Vec2[]
  /** m², derived from the polygon */
  area: number
  floorColor: string
}

export type FurnitureCategory = RoomType | 'general'

export interface FurnitureObject {
  id: string
  /** catalog item this object was created from */
  catalogId: string
  name: string
  category: FurnitureCategory
  /** world position; x/z are the footprint centre, y is the bottom of the object */
  position: Vec3
  /** radians, around world Y — the yaw that drives the 2D footprint */
  rotation: number
  /** radians, tilt around world X and Z; both 0 for an upright object */
  tilt: { x: number; z: number }
  /** meters */
  size: { w: number; h: number; d: number }
  color: string
  /** room the object was dropped in, when known */
  roomId?: string
}

export interface HouseMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  units: 'm'
  /** schema version, so stored/exported files can be validated */
  version: number
}

export interface House {
  meta: HouseMeta
  vertices: Record<string, Vertex>
  walls: Record<string, Wall>
  openings: Record<string, Opening>
  rooms: Room[]
  objects: Record<string, FurnitureObject>
  /** defaults applied to newly drawn walls */
  defaults: {
    wallHeight: number
    wallThickness: number
    wallColor: string
  }
}

export const HOUSE_VERSION = 1

export const ROOM_TYPES: { id: RoomType; label: string; color: string }[] = [
  { id: 'living', label: 'Living Room', color: '#d8cfc0' },
  { id: 'kitchen', label: 'Kitchen', color: '#cdd8d3' },
  { id: 'bedroom', label: 'Bedroom', color: '#d6cddb' },
  { id: 'bathroom', label: 'Bathroom', color: '#c6d4e0' },
  { id: 'laundry', label: 'Laundry Room', color: '#d9d9cf' },
  { id: 'other', label: 'Unassigned', color: '#d2d2d2' },
]

export function roomTypeLabel(type: RoomType): string {
  return ROOM_TYPES.find((r) => r.id === type)?.label ?? 'Room'
}

export function roomTypeColor(type: RoomType): string {
  return ROOM_TYPES.find((r) => r.id === type)?.color ?? '#d2d2d2'
}
