import type { House, Room, Vertex, Wall } from '../types/house'
import { HOUSE_VERSION } from '../types/house'
import { createHouse, DEFAULTS, refreshRooms } from './house'

const AUTOSAVE_KEY = 'house-planner:autosave'
const SLOTS_KEY = 'house-planner:slots'

export interface SlotInfo {
  name: string
  updatedAt: string
}

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/* ------------------------------------------------------------ validation */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

/**
 * Validates and normalises an unknown payload into a House. Throws a readable
 * error when the payload is not a house project.
 */
export function parseHouse(raw: unknown): House {
  const data = typeof raw === 'string' ? (JSON.parse(raw) as unknown) : raw
  if (!isObject(data) || Array.isArray(data)) throw new Error('Not a house project file.')
  if (!isObject(data.walls) || !isObject(data.vertices)) {
    throw new Error('Project file is missing walls or vertices.')
  }

  const base = createHouse(str(isObject(data.meta) ? data.meta.name : undefined, 'Imported House'))
  const house: House = {
    ...base,
    meta: {
      ...base.meta,
      id: str(isObject(data.meta) ? data.meta.id : undefined, base.meta.id),
      name: str(isObject(data.meta) ? data.meta.name : undefined, base.meta.name),
      createdAt: str(isObject(data.meta) ? data.meta.createdAt : undefined, base.meta.createdAt),
      updatedAt: new Date().toISOString(),
      version: HOUSE_VERSION,
    },
    defaults: {
      wallHeight: num(isObject(data.defaults) ? data.defaults.wallHeight : undefined, DEFAULTS.wallHeight),
      wallThickness: num(isObject(data.defaults) ? data.defaults.wallThickness : undefined, DEFAULTS.wallThickness),
      wallColor: str(isObject(data.defaults) ? data.defaults.wallColor : undefined, DEFAULTS.wallColor),
    },
    vertices: {},
    walls: {},
    openings: {},
    objects: {},
    rooms: [],
  }

  for (const [id, value] of Object.entries(data.vertices as Record<string, unknown>)) {
    if (!isObject(value)) continue
    const vertex: Vertex = { id, x: num(value.x, 0), y: num(value.y, 0) }
    house.vertices[id] = vertex
  }

  for (const [id, value] of Object.entries(data.walls as Record<string, unknown>)) {
    if (!isObject(value)) continue
    const a = str(value.a, '')
    const b = str(value.b, '')
    if (!house.vertices[a] || !house.vertices[b] || a === b) continue
    const wall: Wall = {
      id,
      a,
      b,
      height: num(value.height, house.defaults.wallHeight),
      thickness: num(value.thickness, house.defaults.wallThickness),
      color: str(value.color, house.defaults.wallColor),
      hidden: value.hidden === true,
    }
    house.walls[id] = wall
  }

  if (isObject(data.openings)) {
    for (const [id, value] of Object.entries(data.openings as Record<string, unknown>)) {
      if (!isObject(value)) continue
      const wallId = str(value.wallId, '')
      if (!house.walls[wallId]) continue
      const kind = value.kind === 'window' ? 'window' : 'door'
      house.openings[id] = {
        id,
        wallId,
        kind,
        t: Math.min(1, Math.max(0, num(value.t, 0.5))),
        width: num(value.width, DEFAULTS[kind].width),
        height: num(value.height, DEFAULTS[kind].height),
        sill: num(value.sill, DEFAULTS[kind].sill),
      }
    }
  }

  if (isObject(data.objects)) {
    for (const [id, value] of Object.entries(data.objects as Record<string, unknown>)) {
      if (!isObject(value)) continue
      const position = isObject(value.position) ? value.position : {}
      const size = isObject(value.size) ? value.size : {}
      house.objects[id] = {
        id,
        catalogId: str(value.catalogId, 'sofa'),
        name: str(value.name, 'Object'),
        category: (str(value.category, 'general') as House['objects'][string]['category']),
        position: {
          x: num(position.x, 0),
          y: num(position.y, 0),
          z: num(position.z, 0),
        },
        rotation: num(value.rotation, 0),
        tilt: {
          x: num(isObject(value.tilt) ? value.tilt.x : undefined, 0),
          z: num(isObject(value.tilt) ? value.tilt.z : undefined, 0),
        },
        size: {
          w: Math.max(0.05, num(size.w, 1)),
          h: Math.max(0.05, num(size.h, 1)),
          d: Math.max(0.05, num(size.d, 1)),
        },
        color: str(value.color, '#cccccc'),
      }
    }
  }

  // Room metadata (names/types/colours) is restored by matching the detected
  // rooms against the saved polygons.
  if (Array.isArray(data.rooms)) {
    house.rooms = (data.rooms as unknown[])
      .filter(isObject)
      .map((value): Room => ({
        id: str(value.id, `room-${Math.random().toString(36).slice(2, 8)}`),
        name: str(value.name, 'Room'),
        type: (str(value.type, 'other') as Room['type']),
        floorColor: str(value.floorColor, '#d2d2d2'),
        wallIds: Array.isArray(value.wallIds) ? (value.wallIds as unknown[]).map((w) => String(w)) : [],
        polygon: Array.isArray(value.polygon)
          ? (value.polygon as unknown[]).filter(isObject).map((p) => ({ x: num(p.x, 0), y: num(p.y, 0) }))
          : [],
        area: num(value.area, 0),
      }))
      .filter((room) => room.polygon.length >= 3)
  }

  refreshRooms(house)
  return house
}

/* --------------------------------------------------------------- storage */

export function saveAutosave(house: House): void {
  const store = storage()
  if (!store) return
  try {
    store.setItem(AUTOSAVE_KEY, JSON.stringify(house))
  } catch {
    /* quota exceeded — autosave is best-effort */
  }
}

export function loadAutosave(): House | null {
  const store = storage()
  if (!store) return null
  const raw = store.getItem(AUTOSAVE_KEY)
  if (!raw) return null
  try {
    return parseHouse(raw)
  } catch {
    return null
  }
}

export function clearAutosave(): void {
  storage()?.removeItem(AUTOSAVE_KEY)
}

function readSlots(): Record<string, House> {
  const store = storage()
  if (!store) return {}
  const raw = store.getItem(SLOTS_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed as Record<string, House>
  } catch {
    return {}
  }
}

export function saveSlot(house: House): void {
  const store = storage()
  if (!store) return
  const slots = readSlots()
  slots[house.meta.name] = house
  store.setItem(SLOTS_KEY, JSON.stringify(slots))
}

export function loadSlot(name: string): House | null {
  const slots = readSlots()
  const raw = slots[name]
  if (!raw) return null
  try {
    return parseHouse(raw)
  } catch {
    return null
  }
}

export function deleteSlot(name: string): void {
  const store = storage()
  if (!store) return
  const slots = readSlots()
  delete slots[name]
  store.setItem(SLOTS_KEY, JSON.stringify(slots))
}

export function listSlots(): SlotInfo[] {
  return Object.entries(readSlots())
    .map(([name, house]) => ({ name, updatedAt: house?.meta?.updatedAt ?? '' }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/* ------------------------------------------------------- file import/export */

export function houseToJSON(house: House): string {
  return JSON.stringify(house, null, 2)
}

export function downloadHouse(house: House): void {
  const blob = new Blob([houseToJSON(house)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeName = house.meta.name.replace(/[^\w.-]+/g, '-').toLowerCase() || 'house'
  link.href = url
  link.download = `${safeName}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function openHouseFile(): Promise<House> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected.'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        try {
          resolve(parseHouse(String(reader.result)))
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Could not read project file.'))
        }
      }
      reader.onerror = () => reject(new Error('Could not read project file.'))
      reader.readAsText(file)
    }
    input.click()
  })
}
