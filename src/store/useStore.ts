import { create } from 'zustand'
import type { FurnitureObject, House, RoomType, Vec2, Vec3 } from '../types/house'
import { roomTypeColor } from '../types/house'
import {
  addObject,
  addOpening,
  addWallChain,
  createHouse,
  DEFAULTS,
  duplicateObject,
  normalizeOpening,
  refreshRooms,
  removeObject,
  removeOpening,
  removeVertex,
  removeWall,
  roomIdAt,
  setWallAngle,
  setWallEndpoint,
  setWallLength,
  translateWall,
  moveVertexTo,
} from '../core/house'
import type { CatalogItem } from '../catalog/catalog'
import { CATALOG_BY_ID } from '../catalog/catalog'
import { loadAutosave, saveAutosave } from '../core/persistence'

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'move' | 'delete' | 'measure' | 'pan'
export type ViewMode = '2d' | '3d'
export type GizmoMode = 'translate' | 'rotate' | 'scale'
export type CameraPreset = 'iso' | 'top' | 'front' | 'side' | 'fit'

export type Selection =
  | { kind: 'none' }
  | { kind: 'wall'; id: string }
  | { kind: 'vertex'; id: string }
  | { kind: 'room'; id: string }
  | { kind: 'object'; id: string }
  | { kind: 'opening'; id: string }

export interface CameraCommand {
  preset: CameraPreset
  /** when set, the camera frames this room */
  roomId?: string
  nonce: number
}

export interface DraftState {
  /** confirmed chain start of the segment currently being drawn */
  start: Vec2
  current: Vec2
  /** the whole chain, for rendering */
  points: Vec2[]
}

const HISTORY_LIMIT = 80

interface StoreState {
  house: House
  past: House[]
  future: House[]

  tool: Tool
  view: ViewMode
  selection: Selection
  hovered: Selection

  grid: { size: number; snap: boolean; show: boolean }
  cursor: Vec2
  status: string
  warning: string | null

  draft: DraftState | null
  measure: { from: Vec2; to: Vec2 } | null

  placing: CatalogItem | null
  gizmo: GizmoMode
  cameraMode: 'perspective' | 'orthographic'
  firstPerson: boolean
  cameraCommand: CameraCommand
  visibility: { walls: boolean; roof: boolean; isolatedRoomId: string | null }
  constrainToHouse: boolean
  snapToWalls: boolean
  catalogRoomType: RoomType | null

  /* actions */
  commit: (mutate: (h: House) => void, options?: { structural?: boolean }) => void
  update: (mutate: (h: House) => void, options?: { structural?: boolean }) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean

  setTool: (tool: Tool) => void
  setView: (view: ViewMode) => void
  select: (selection: Selection) => void
  setHovered: (selection: Selection) => void
  setCursor: (p: Vec2) => void
  setStatus: (message: string) => void
  setWarning: (message: string | null) => void
  setGrid: (patch: Partial<StoreState['grid']>) => void
  setVisibility: (patch: Partial<StoreState['visibility']>) => void
  setGizmo: (mode: GizmoMode) => void
  setCameraMode: (mode: 'perspective' | 'orthographic') => void
  setFirstPerson: (on: boolean) => void
  runCamera: (preset: CameraPreset, roomId?: string) => void
  setConstrainToHouse: (on: boolean) => void
  setSnapToWalls: (on: boolean) => void
  setCatalogRoomType: (type: RoomType | null) => void

  startDraft: (p: Vec2) => void
  updateDraft: (p: Vec2) => void
  commitDraftPoint: (p: Vec2) => void
  commitDraftByLength: (length: number, angleDeg: number) => void
  endDraft: () => void

  setMeasure: (measure: { from: Vec2; to: Vec2 } | null) => void

  /* house editing helpers */
  addWalls: (from: Vec2, to: Vec2) => void
  deleteSelection: () => void
  setWallProp: (wallId: string, patch: Partial<House['walls'][string]>) => void
  setWallLengthValue: (wallId: string, length: number) => void
  setWallAngleValue: (wallId: string, degrees: number) => void
  moveWall: (wallId: string, delta: Vec2) => void
  moveVertex: (vertexId: string, p: Vec2) => void
  setVertexPos: (vertexId: string, p: Vec2) => void
  setWallEnd: (wallId: string, which: 'a' | 'b', p: Vec2) => void
  setDefaults: (patch: Partial<House['defaults']>) => void
  addWallOpening: (wallId: string, kind: 'door' | 'window', t: number) => void
  setOpeningProp: (id: string, patch: Partial<House['openings'][string]>) => void
  setRoomProp: (roomId: string, patch: { name?: string; type?: RoomType; floorColor?: string }) => void

  beginPlacing: (item: CatalogItem) => void
  cancelPlacing: () => void
  placeObject: (position: Vec3, rotation: number) => void
  setObjectProp: (id: string, patch: Partial<FurnitureObject>) => void
  /** live update during a gizmo drag — no history entry of its own */
  setObjectPropLive: (id: string, patch: Partial<FurnitureObject>) => void
  duplicateSelected: () => void

  newProject: () => void
  loadHouse: (house: House) => void
  renameProject: (name: string) => void
}

function touch(house: House): void {
  house.meta.updatedAt = new Date().toISOString()
}

const initialHouse = (): House => loadAutosave() ?? createHouse('My House')

export const useStore = create<StoreState>((set, get) => ({
  house: initialHouse(),
  past: [],
  future: [],

  tool: 'select',
  view: '2d',
  selection: { kind: 'none' },
  hovered: { kind: 'none' },

  grid: { size: 0.25, snap: true, show: true },
  cursor: { x: 0, y: 0 },
  status: 'Ready',
  warning: null,

  draft: null,
  measure: null,

  placing: null,
  gizmo: 'translate',
  cameraMode: 'perspective',
  firstPerson: false,
  cameraCommand: { preset: 'iso', nonce: 0 },
  visibility: { walls: true, roof: false, isolatedRoomId: null },
  constrainToHouse: true,
  snapToWalls: true,
  catalogRoomType: null,

  /* ----------------------------------------------------------- history */

  pushHistory: () => {
    const { house, past } = get()
    set({
      past: [...past.slice(-HISTORY_LIMIT + 1), structuredClone(house)],
      future: [],
    })
  },

  update: (mutate, options) => {
    const house = structuredClone(get().house)
    mutate(house)
    if (options?.structural !== false) refreshRooms(house)
    touch(house)
    set({ house })
    saveAutosave(house)
  },

  commit: (mutate, options) => {
    get().pushHistory()
    get().update(mutate, options)
  },

  undo: () => {
    const { past, future, house } = get()
    if (past.length === 0) return
    const previous = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [structuredClone(house), ...future].slice(0, HISTORY_LIMIT),
      house: previous,
      selection: { kind: 'none' },
      draft: null,
    })
    saveAutosave(previous)
  },

  redo: () => {
    const { past, future, house } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      past: [...past, structuredClone(house)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      house: next,
      selection: { kind: 'none' },
      draft: null,
    })
    saveAutosave(next)
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  /* -------------------------------------------------------------- ui */

  setTool: (tool) =>
    set({
      tool,
      draft: null,
      measure: tool === 'measure' ? get().measure : null,
      placing: null,
      status: `Tool: ${tool}`,
    }),
  setView: (view) => set({ view, draft: null, firstPerson: view === '3d' ? get().firstPerson : false }),
  select: (selection) => {
    const patch: Partial<StoreState> = { selection }
    if (selection.kind === 'room') {
      const room = get().house.rooms.find((r) => r.id === selection.id)
      if (room) patch.catalogRoomType = room.type
    }
    if (selection.kind === 'object') {
      const obj = get().house.objects[selection.id]
      const room = obj && obj.roomId ? get().house.rooms.find((r) => r.id === obj.roomId) : undefined
      if (room) patch.catalogRoomType = room.type
    }
    set(patch as StoreState)
  },
  setHovered: (hovered) => set({ hovered }),
  setCursor: (cursor) => set({ cursor }),
  setStatus: (status) => set({ status }),
  setWarning: (warning) => set({ warning }),
  setGrid: (patch) => set({ grid: { ...get().grid, ...patch } }),
  setVisibility: (patch) => set({ visibility: { ...get().visibility, ...patch } }),
  setGizmo: (gizmo) => set({ gizmo }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  setFirstPerson: (firstPerson) => set({ firstPerson, view: firstPerson ? '3d' : get().view }),
  runCamera: (preset, roomId) =>
    set({ cameraCommand: { preset, roomId, nonce: get().cameraCommand.nonce + 1 } }),
  setConstrainToHouse: (constrainToHouse) => set({ constrainToHouse }),
  setSnapToWalls: (snapToWalls) => set({ snapToWalls }),
  setCatalogRoomType: (catalogRoomType) => set({ catalogRoomType }),

  /* ----------------------------------------------------------- drafts */

  startDraft: (p) => set({ draft: { start: p, current: p, points: [p] } }),
  updateDraft: (p) => {
    const draft = get().draft
    if (!draft) return
    set({ draft: { ...draft, current: p } })
  },
  commitDraftPoint: (p) => {
    const draft = get().draft
    if (!draft) return
    get().addWalls(draft.start, p)
    set({ draft: { start: p, current: p, points: [...draft.points, p] } })
  },
  commitDraftByLength: (length, angleDeg) => {
    const draft = get().draft
    if (!draft || length <= 0) return
    const angle = (angleDeg * Math.PI) / 180
    const next = {
      x: draft.start.x + Math.cos(angle) * length,
      y: draft.start.y + Math.sin(angle) * length,
    }
    get().commitDraftPoint(next)
  },
  endDraft: () => set({ draft: null }),

  setMeasure: (measure) => set({ measure }),

  /* ---------------------------------------------------- house editing */

  addWalls: (from, to) => {
    get().commit((h) => {
      addWallChain(h, from, to)
    })
  },

  deleteSelection: () => {
    const { selection } = get()
    if (selection.kind === 'none') return
    get().commit((h) => {
      if (selection.kind === 'wall') removeWall(h, selection.id)
      else if (selection.kind === 'vertex') removeVertex(h, selection.id)
      else if (selection.kind === 'object') removeObject(h, selection.id)
      else if (selection.kind === 'opening') removeOpening(h, selection.id)
    })
    if (selection.kind !== 'room') set({ selection: { kind: 'none' } })
  },

  setWallProp: (wallId, patch) => {
    get().commit((h) => {
      const wall = h.walls[wallId]
      if (!wall) return
      Object.assign(wall, patch)
    })
  },

  setWallLengthValue: (wallId, length) => {
    get().commit((h) => setWallLength(h, wallId, length))
  },

  setWallAngleValue: (wallId, deg) => {
    get().commit((h) => setWallAngle(h, wallId, (deg * Math.PI) / 180))
  },

  moveWall: (wallId, delta) => {
    get().update((h) => translateWall(h, wallId, delta))
  },

  moveVertex: (vertexId, p) => {
    get().update((h) => moveVertexTo(h, vertexId, p))
  },

  setVertexPos: (vertexId, p) => {
    get().commit((h) => moveVertexTo(h, vertexId, p))
  },

  setWallEnd: (wallId, which, p) => {
    get().commit((h) => setWallEndpoint(h, wallId, which, p))
  },

  setDefaults: (patch) => {
    get().update((h) => {
      Object.assign(h.defaults, patch)
    }, { structural: false })
  },

  addWallOpening: (wallId, kind, t) => {
    let created: string | null = null
    get().commit((h) => {
      const opening = addOpening(h, wallId, kind, t)
      created = opening?.id ?? null
    })
    if (created) set({ selection: { kind: 'opening', id: created } })
    else set({ warning: 'The wall is too short for that opening.' })
  },

  setOpeningProp: (id, patch) => {
    get().commit((h) => {
      const opening = h.openings[id]
      if (!opening) return
      Object.assign(opening, patch)
      normalizeOpening(h, id)
    })
  },

  setRoomProp: (roomId, patch) => {
    get().commit((h) => {
      const room = h.rooms.find((r) => r.id === roomId)
      if (!room) return
      if (patch.name !== undefined) room.name = patch.name
      if (patch.type !== undefined) {
        const wasDefaultColor = room.floorColor === roomTypeColor(room.type)
        room.type = patch.type
        if (wasDefaultColor) room.floorColor = roomTypeColor(patch.type)
      }
      if (patch.floorColor !== undefined) room.floorColor = patch.floorColor
    }, { structural: false })
    if (patch.type) set({ catalogRoomType: patch.type })
  },

  /* -------------------------------------------------------- furniture */

  beginPlacing: (item) =>
    set({
      placing: item,
      view: '3d',
      tool: 'select',
      status: `Placing ${item.name} — click in the house to drop it, Esc to cancel`,
    }),

  cancelPlacing: () => set({ placing: null, status: 'Placement cancelled' }),

  placeObject: (position, rotation) => {
    const item = get().placing
    if (!item) return
    let id: string | null = null
    get().commit((h) => {
      const obj = addObject(h, item, position, rotation)
      id = obj.id
    }, { structural: false })
    set({
      placing: null,
      selection: id ? { kind: 'object', id } : { kind: 'none' },
      status: `Placed ${item.name}`,
    })
  },

  setObjectProp: (id, patch) => {
    get().commit((h) => {
      const obj = h.objects[id]
      if (!obj) return
      Object.assign(obj, patch)
      if (patch.position) obj.roomId = roomIdAt(h, { x: obj.position.x, y: obj.position.z })
    }, { structural: false })
  },

  setObjectPropLive: (id, patch) => {
    get().update((h) => {
      const obj = h.objects[id]
      if (!obj) return
      Object.assign(obj, patch)
      if (patch.position) obj.roomId = roomIdAt(h, { x: obj.position.x, y: obj.position.z })
    }, { structural: false })
  },

  duplicateSelected: () => {
    const { selection } = get()
    if (selection.kind !== 'object') return
    let id: string | null = null
    get().commit((h) => {
      id = duplicateObject(h, selection.id)
    }, { structural: false })
    if (id) set({ selection: { kind: 'object', id } })
  },

  /* ---------------------------------------------------------- project */

  newProject: () => {
    const house = createHouse('My House')
    set({
      house,
      past: [],
      future: [],
      selection: { kind: 'none' },
      draft: null,
      placing: null,
      status: 'New project',
      visibility: { walls: true, roof: false, isolatedRoomId: null },
    })
    saveAutosave(house)
  },

  loadHouse: (house) => {
    set({
      house,
      past: [],
      future: [],
      selection: { kind: 'none' },
      draft: null,
      placing: null,
      status: `Loaded ${house.meta.name}`,
      visibility: { walls: true, roof: false, isolatedRoomId: null },
    })
    saveAutosave(house)
  },

  renameProject: (name) => {
    get().update((h) => {
      h.meta.name = name
    }, { structural: false })
  },
}))

/* ------------------------------------------------------------- selectors */

export function selectedWall(state: StoreState) {
  return state.selection.kind === 'wall' ? state.house.walls[state.selection.id] : undefined
}

export function selectedRoom(state: StoreState) {
  const { selection } = state
  if (selection.kind !== 'room') return undefined
  return state.house.rooms.find((room) => room.id === selection.id)
}

export function selectedObject(state: StoreState) {
  return state.selection.kind === 'object' ? state.house.objects[state.selection.id] : undefined
}

export function selectedOpening(state: StoreState) {
  return state.selection.kind === 'opening' ? state.house.openings[state.selection.id] : undefined
}

export function catalogItemFor(object: FurnitureObject | undefined) {
  return object ? CATALOG_BY_ID[object.catalogId] : undefined
}

export const SNAP_TOLERANCE = DEFAULTS.snapTolerance
