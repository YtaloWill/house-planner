import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useStore } from '../store/useStore'
import type { Vec2, Vec3 } from '../types/house'
import { degrees, dist, formatArea, formatMeters, polygonCentroid, roundTo } from '../core/geometry'
import {
  DEFAULTS,
  findWallNear,
  snapPoint,
  wallAngle,
  wallEnds,
  wallLength,
} from '../core/house'
import { hitTest, objectCorners, wallOpeningSpans, wallParamAt } from './hit'
import { roomTypeLabel } from '../types/house'

interface Camera {
  /** world coordinate at the centre of the viewport */
  cx: number
  cy: number
  /** pixels per meter */
  ppm: number
}

type Drag =
  | { kind: 'pan'; sx: number; sy: number; cam: Camera }
  | { kind: 'wall'; wallId: string; last: Vec2 }
  | { kind: 'vertex'; vertexId: string }
  | { kind: 'object'; objectId: string; offset: Vec2 }
  | { kind: 'measure'; from: Vec2 }
  | { kind: 'resize'; objectId: string; handle: number }

/** Pointer capture is best-effort: it is unavailable for synthetic pointers. */
function capture(element: Element, pointerId: number) {
  try {
    element.setPointerCapture(pointerId)
  } catch {
    /* ignore */
  }
}

function releaseCapture(element: Element, pointerId: number) {
  try {
    element.releasePointerCapture(pointerId)
  } catch {
    /* ignore */
  }
}

/**
 * The eight resize grips of a selected object, in its own frame:
 * 0-3 are the corners, 4-7 the edge midpoints (top, right, bottom, left).
 */
const HANDLE_OFFSETS: [number, number][] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

function handlePoints(center: Vec2, w: number, d: number, rotation: number): Vec2[] {
  const c = Math.cos(rotation)
  const s = Math.sin(rotation)
  return HANDLE_OFFSETS.map(([hx, hy]) => {
    const lx = (hx * w) / 2
    const ly = (hy * d) / 2
    return { x: center.x + lx * c - ly * s, y: center.y + lx * s + ly * c }
  })
}

/**
 * Resizes an object by dragging one of its grips: the opposite edge or corner
 * stays put while the dragged side follows the pointer.
 */
function resizeFromHandle(
  object: { position: Vec3; size: { w: number; h: number; d: number }; rotation: number },
  handle: number,
  pointer: Vec2,
  step: number,
): { position: Vec3; size: { w: number; h: number; d: number } } {
  const [hx, hy] = HANDLE_OFFSETS[handle]
  const c = Math.cos(object.rotation)
  const sn = Math.sin(object.rotation)
  const ex = { x: c, y: sn }
  const ey = { x: -sn, y: c }
  const center = { x: object.position.x, y: object.position.z }

  // local coordinates of the pointer, relative to the object centre
  const rel = { x: pointer.x - center.x, y: pointer.y - center.y }
  const localX = rel.x * ex.x + rel.y * ex.y
  const localY = rel.x * ey.x + rel.y * ey.y

  let { w, d } = object.size
  let shiftX = 0
  let shiftY = 0

  if (hx !== 0) {
    const fixed = (-hx * object.size.w) / 2 // the edge that stays put
    const next = Math.max(0.05, roundTo(Math.abs(localX - fixed), step))
    shiftX = fixed + (hx * next) / 2
    w = next
  }
  if (hy !== 0) {
    const fixed = (-hy * object.size.d) / 2
    const next = Math.max(0.05, roundTo(Math.abs(localY - fixed), step))
    shiftY = fixed + (hy * next) / 2
    d = next
  }

  return {
    size: { ...object.size, w, d },
    position: {
      x: center.x + shiftX * ex.x + shiftY * ey.x,
      y: object.position.y,
      z: center.y + shiftX * ex.y + shiftY * ey.y,
    },
  }
}

const HANDLE_CURSORS = ['nwse-resize', 'nesw-resize', 'nwse-resize', 'nesw-resize', 'ns-resize', 'ew-resize', 'ns-resize', 'ew-resize']

const MIN_PPM = 8
const MAX_PPM = 400

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 1000, height: 700 })
  const [cam, setCam] = useState<Camera>({ cx: 4, cy: 4, ppm: 64 })
  const [snapHint, setSnapHint] = useState<{ p: Vec2; kind: string } | null>(null)
  const dragRef = useRef<Drag | null>(null)
  const spaceRef = useRef(false)

  const house = useStore((s) => s.house)
  const tool = useStore((s) => s.tool)
  const grid = useStore((s) => s.grid)
  const selection = useStore((s) => s.selection)
  const draft = useStore((s) => s.draft)
  const measure = useStore((s) => s.measure)

  const select = useStore((s) => s.select)
  const setCursor = useStore((s) => s.setCursor)
  const startDraft = useStore((s) => s.startDraft)
  const updateDraft = useStore((s) => s.updateDraft)
  const commitDraftPoint = useStore((s) => s.commitDraftPoint)
  const endDraft = useStore((s) => s.endDraft)
  const setMeasure = useStore((s) => s.setMeasure)
  const moveWall = useStore((s) => s.moveWall)
  const finishWallEdit = useStore((s) => s.finishWallEdit)
  const finishJointEdit = useStore((s) => s.finishJointEdit)
  const moveVertex = useStore((s) => s.moveVertex)
  const setObjectProp = useStore((s) => s.setObjectProp)
  const placing = useStore((s) => s.placing)
  const cancelPlacing = useStore((s) => s.cancelPlacing)
  const pushHistory = useStore((s) => s.pushHistory)
  const addWallOpening = useStore((s) => s.addWallOpening)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const setStatus = useStore((s) => s.setStatus)

  /* ------------------------------------------------------------- sizing */

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      setSize({ width: element.clientWidth, height: element.clientHeight })
    })
    observer.observe(element)
    setSize({ width: element.clientWidth, height: element.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  /* -------------------------------------------------------- transforms */

  const toScreen = useCallback(
    (p: Vec2) => ({
      x: (p.x - cam.cx) * cam.ppm + size.width / 2,
      y: (p.y - cam.cy) * cam.ppm + size.height / 2,
    }),
    [cam, size],
  )

  const toWorld = useCallback(
    (sx: number, sy: number): Vec2 => ({
      x: (sx - size.width / 2) / cam.ppm + cam.cx,
      y: (sy - size.height / 2) / cam.ppm + cam.cy,
    }),
    [cam, size],
  )

  const eventToWorld = useCallback(
    (e: ReactPointerEvent | ReactWheelEvent): Vec2 => {
      const rect = containerRef.current?.getBoundingClientRect()
      const sx = e.clientX - (rect?.left ?? 0)
      const sy = e.clientY - (rect?.top ?? 0)
      return toWorld(sx, sy)
    },
    [toWorld],
  )

  const pickTolerance = 9 / cam.ppm

  const snapped = useCallback(
    (p: Vec2, from?: Vec2) =>
      snapPoint(house, p, {
        gridSize: grid.size,
        snapEnabled: grid.snap,
        tol: Math.max(DEFAULTS.snapTolerance, pickTolerance),
        from,
      }),
    [house, grid, pickTolerance],
  )

  /* ------------------------------------------------------------- events */

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.button === 1 || spaceRef.current || tool === 'pan') {
      dragRef.current = { kind: 'pan', sx: e.clientX, sy: e.clientY, cam }
      capture(e.currentTarget, e.pointerId)
      return
    }
    if (e.button === 2) {
      // right click clears the selection (and any pending action)
      if (draft) endDraft()
      if (placing) cancelPlacing()
      select({ kind: 'none' })
      return
    }
    if (e.button !== 0) return
    capture(e.currentTarget, e.pointerId)

    const raw = eventToWorld(e)

    // resize grips of the selected object take precedence over everything else
    if (selection.kind === 'object') {
      const object = house.objects[selection.id]
      if (object) {
        const grips = handlePoints(
          { x: object.position.x, y: object.position.z },
          object.size.w,
          object.size.d,
          object.rotation,
        )
        const index = grips.findIndex((grip) => dist(grip, raw) <= pickTolerance * 1.2)
        if (index >= 0) {
          pushHistory()
          dragRef.current = { kind: 'resize', objectId: selection.id, handle: index }
          return
        }
      }
    }

    if (tool === 'wall') {
      const result = snapped(raw, draft?.start)
      if (!draft) startDraft(result.point)
      else commitDraftPoint(result.point)
      return
    }

    if (tool === 'measure') {
      const result = snapped(raw)
      dragRef.current = { kind: 'measure', from: result.point }
      setMeasure({ from: result.point, to: result.point })
      return
    }

    if (tool === 'door' || tool === 'window') {
      const wall = findWallNear(house, raw, Math.max(0.3, pickTolerance * 2))
      if (!wall) {
        setStatus('Click on a wall to add a ' + tool)
        return
      }
      addWallOpening(wall.id, tool, wallParamAt(house, wall.id, raw))
      return
    }

    const hit = hitTest(house, raw, pickTolerance)

    if (tool === 'delete') {
      if (hit.kind !== 'none' && hit.kind !== 'room') {
        select(hit)
        deleteSelection()
      }
      return
    }

    select(hit)

    if (tool === 'move' || tool === 'select') {
      if (hit.kind === 'vertex') {
        pushHistory()
        dragRef.current = { kind: 'vertex', vertexId: hit.id }
      } else if (hit.kind === 'wall' && tool === 'move') {
        pushHistory()
        dragRef.current = { kind: 'wall', wallId: hit.id, last: raw }
      } else if (hit.kind === 'object') {
        const obj = house.objects[hit.id]
        pushHistory()
        dragRef.current = {
          kind: 'object',
          objectId: hit.id,
          offset: { x: obj.position.x - raw.x, y: obj.position.z - raw.y },
        }
      }
    }
  }

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const raw = eventToWorld(e)
    setCursor(raw)

    const drag = dragRef.current
    if (drag?.kind === 'pan') {
      const dx = (e.clientX - drag.sx) / drag.cam.ppm
      const dy = (e.clientY - drag.sy) / drag.cam.ppm
      setCam({ ...drag.cam, cx: drag.cam.cx - dx, cy: drag.cam.cy - dy })
      return
    }

    if (drag?.kind === 'vertex') {
      const result = snapPoint(house, raw, {
        gridSize: grid.size,
        snapEnabled: grid.snap,
        tol: pickTolerance,
      })
      moveVertex(drag.vertexId, result.point)
      setSnapHint({ p: result.point, kind: result.kind })
      return
    }

    if (drag?.kind === 'wall') {
      const result = grid.snap
        ? { point: { x: Math.round(raw.x / grid.size) * grid.size, y: Math.round(raw.y / grid.size) * grid.size } }
        : { point: raw }
      const delta = { x: result.point.x - drag.last.x, y: result.point.y - drag.last.y }
      if (Math.abs(delta.x) > 1e-9 || Math.abs(delta.y) > 1e-9) {
        moveWall(drag.wallId, delta)
        dragRef.current = { ...drag, last: result.point }
      }
      return
    }

    if (drag?.kind === 'object') {
      const obj = house.objects[drag.objectId]
      if (!obj) return
      let x = raw.x + drag.offset.x
      let y = raw.y + drag.offset.y
      if (grid.snap) {
        // Furniture moves to the centimetre; the grid governs the structure.
        x = roundTo(x, DEFAULTS.objectStep)
        y = roundTo(y, DEFAULTS.objectStep)
      }
      setObjectProp(drag.objectId, { position: { x, y: obj.position.y, z: y } })
      return
    }

    if (drag?.kind === 'resize') {
      const object = house.objects[drag.objectId]
      if (!object) return
      const next = resizeFromHandle(object, drag.handle, raw, DEFAULTS.objectStep)
      setObjectProp(drag.objectId, next)
      return
    }

    if (drag?.kind === 'measure') {
      const result = snapped(raw, drag.from)
      setMeasure({ from: drag.from, to: result.point })
      return
    }

    if (tool === 'wall') {
      const result = snapped(raw, draft?.start)
      setSnapHint({ p: result.point, kind: result.kind })
      if (draft) updateDraft(result.point)
      return
    }

    setSnapHint(null)
  }

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    releaseCapture(e.currentTarget, e.pointerId)
    const drag = dragRef.current
    dragRef.current = null
    // Reconnect walls that were dragged back against their neighbours.
    if (drag?.kind === 'wall') finishWallEdit(drag.wallId)
    if (drag?.kind === 'vertex') finishJointEdit(drag.vertexId)
  }

  const onDoubleClick = () => {
    if (tool === 'wall' && draft) endDraft()
  }

  const onWheel = (e: ReactWheelEvent<SVGSVGElement>) => {
    e.preventDefault()
    const before = eventToWorld(e)
    const factor = Math.exp(-e.deltaY * 0.0015)
    const ppm = Math.max(MIN_PPM, Math.min(MAX_PPM, cam.ppm * factor))
    // Keep the point under the cursor fixed while zooming.
    const rect = containerRef.current?.getBoundingClientRect()
    const sx = e.clientX - (rect?.left ?? 0)
    const sy = e.clientY - (rect?.top ?? 0)
    const cx = before.x - (sx - size.width / 2) / ppm
    const cy = before.y - (sy - size.height / 2) / ppm
    setCam({ cx, cy, ppm })
  }

  /* ------------------------------------------------------------- render */

  const gridLines = useMemo(() => {
    if (!grid.show) return null
    const step = cam.ppm * grid.size < 9 ? Math.max(1, grid.size * 4) : grid.size
    const half = { x: size.width / 2 / cam.ppm, y: size.height / 2 / cam.ppm }
    const minX = Math.floor((cam.cx - half.x) / step) * step
    const maxX = Math.ceil((cam.cx + half.x) / step) * step
    const minY = Math.floor((cam.cy - half.y) / step) * step
    const maxY = Math.ceil((cam.cy + half.y) / step) * step
    const lines: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
    for (let x = minX; x <= maxX + 1e-9; x += step) {
      lines.push({ x1: x, y1: minY, x2: x, y2: maxY, major: Math.abs(x % 1) < 1e-6 })
    }
    for (let y = minY; y <= maxY + 1e-9; y += step) {
      lines.push({ x1: minX, y1: y, x2: maxX, y2: y, major: Math.abs(y % 1) < 1e-6 })
    }
    return lines
  }, [cam, grid, size])

  const labels: { p: Vec2; lines: string[]; className: string }[] = []

  for (const room of house.rooms) {
    const c = polygonCentroid(room.polygon)
    labels.push({
      p: c,
      lines: [room.name, roomTypeLabel(room.type), formatArea(room.area)],
      className: `room-label${selection.kind === 'room' && selection.id === room.id ? ' selected' : ''}`,
    })
  }

  const wallLabels: { p: Vec2; text: string; angle: number }[] = []
  for (const wall of Object.values(house.walls)) {
    const [a, b] = wallEnds(house, wall)
    const len = dist(a, b)
    if (len * cam.ppm < 40) continue
    let angle = degrees(Math.atan2(b.y - a.y, b.x - a.x))
    if (angle > 90 || angle < -90) angle += 180
    wallLabels.push({ p: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, text: formatMeters(len), angle })
  }

  const draftLength = draft ? dist(draft.start, draft.current) : 0
  const draftAngle = draft ? degrees(Math.atan2(draft.current.y - draft.start.y, draft.current.x - draft.start.x)) : 0

  return (
    <div className="canvas2d" ref={containerRef}>
      <svg
        width={size.width}
        height={size.height}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        onContextMenu={(e) => e.preventDefault()}
        className={`plan tool-${tool}`}
      >
        <g transform={`translate(${size.width / 2 - cam.cx * cam.ppm} ${size.height / 2 - cam.cy * cam.ppm}) scale(${cam.ppm})`}>
          {/* grid */}
          {gridLines?.map((line, i) => (
            <line
              key={i}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              className={line.major ? 'grid-major' : 'grid-minor'}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* axes */}
          <line x1={-1000} y1={0} x2={1000} y2={0} className="axis-x" vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={-1000} x2={0} y2={1000} className="axis-y" vectorEffect="non-scaling-stroke" />

          {/* rooms */}
          {house.rooms.map((room) => (
            <polygon
              key={room.id}
              points={room.polygon.map((p) => `${p.x},${p.y}`).join(' ')}
              fill={room.floorColor}
              fillOpacity={selection.kind === 'room' && selection.id === room.id ? 0.95 : 0.7}
              stroke="none"
            />
          ))}

          {/* walls */}
          {Object.values(house.walls).map((wall) => {
            const [a, b] = wallEnds(house, wall)
            const isSelected = selection.kind === 'wall' && selection.id === wall.id
            return (
              <g key={wall.id}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isSelected ? '#2f7fd8' : '#3a3f45'}
                  strokeWidth={wall.thickness}
                  strokeLinecap="butt"
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isSelected ? '#8fc0f0' : wall.color}
                  strokeWidth={Math.max(wall.thickness - 0.04, wall.thickness * 0.5)}
                  strokeLinecap="butt"
                />
              </g>
            )
          })}

          {/* openings */}
          {Object.values(house.walls).flatMap((wall) =>
            wallOpeningSpans(house, wall.id).map(({ opening, from, to, center }) => {
              const isSelected = selection.kind === 'opening' && selection.id === opening.id
              const dir = { x: to.x - from.x, y: to.y - from.y }
              const len = Math.hypot(dir.x, dir.y) || 1
              const normal = { x: -dir.y / len, y: dir.x / len }
              const t = wall.thickness / 2 + 0.005
              return (
                <g key={opening.id}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#fbfbf9"
                    strokeWidth={wall.thickness + 0.01}
                  />
                  {opening.kind === 'window' ? (
                    <>
                      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#4a8fd0" strokeWidth={0.03} />
                      <line
                        x1={from.x + normal.x * t * 0.5}
                        y1={from.y + normal.y * t * 0.5}
                        x2={to.x + normal.x * t * 0.5}
                        y2={to.y + normal.y * t * 0.5}
                        stroke="#4a8fd0"
                        strokeWidth={0.02}
                      />
                    </>
                  ) : (
                    <path
                      d={`M ${from.x} ${from.y} A ${opening.width} ${opening.width} 0 0 1 ${
                        from.x + normal.x * opening.width
                      } ${from.y + normal.y * opening.width}`}
                      fill="none"
                      stroke="#8a8f96"
                      strokeWidth={0.02}
                    />
                  )}
                  <circle
                    cx={center.x}
                    cy={center.y}
                    r={isSelected ? 0.09 : 0.05}
                    fill={isSelected ? '#2f7fd8' : '#7d858e'}
                  />
                </g>
              )
            }),
          )}

          {/* furniture footprints */}
          {Object.values(house.objects).map((obj) => {
            const corners = objectCorners(
              { x: obj.position.x, y: obj.position.z },
              obj.size.w,
              obj.size.d,
              obj.rotation,
            )
            const isSelected = selection.kind === 'object' && selection.id === obj.id
            const front = {
              x: (corners[2].x + corners[3].x) / 2,
              y: (corners[2].y + corners[3].y) / 2,
            }
            return (
              <g key={obj.id}>
                <polygon
                  points={corners.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill={obj.color}
                  fillOpacity={0.75}
                  stroke={isSelected ? '#2f7fd8' : '#5d646c'}
                  strokeWidth={isSelected ? 0.04 : 0.02}
                />
                <line
                  x1={obj.position.x}
                  y1={obj.position.z}
                  x2={front.x}
                  y2={front.y}
                  stroke="#2f3338"
                  strokeWidth={0.015}
                />
              </g>
            )
          })}

          {/* resize grips for the selected object */}
          {selection.kind === 'object' &&
            house.objects[selection.id] &&
            handlePoints(
              { x: house.objects[selection.id].position.x, y: house.objects[selection.id].position.z },
              house.objects[selection.id].size.w,
              house.objects[selection.id].size.d,
              house.objects[selection.id].rotation,
            ).map((grip, index) => (
              <rect
                key={`grip-${index}`}
                x={grip.x - 5 / cam.ppm}
                y={grip.y - 5 / cam.ppm}
                width={10 / cam.ppm}
                height={10 / cam.ppm}
                fill="#ffffff"
                stroke="#2f7fd8"
                strokeWidth={2 / cam.ppm}
                style={{ cursor: HANDLE_CURSORS[index] }}
              />
            ))}

          {/* vertices */}
          {Object.values(house.vertices).map((v) => {
            const isSelected = selection.kind === 'vertex' && selection.id === v.id
            return (
              <circle
                key={v.id}
                cx={v.x}
                cy={v.y}
                r={isSelected ? 0.1 : 0.06}
                fill={isSelected ? '#2f7fd8' : '#ffffff'}
                stroke="#3a3f45"
                strokeWidth={0.02}
              />
            )
          })}

          {/* wall drawing preview */}
          {draft && (
            <>
              <line
                x1={draft.start.x}
                y1={draft.start.y}
                x2={draft.current.x}
                y2={draft.current.y}
                stroke="#2f7fd8"
                strokeWidth={house.defaults.wallThickness}
                strokeOpacity={0.5}
              />
              <line
                x1={draft.start.x}
                y1={draft.start.y}
                x2={draft.current.x}
                y2={draft.current.y}
                stroke="#1b4f87"
                strokeWidth={0.02}
                strokeDasharray="0.12 0.08"
              />
            </>
          )}

          {/* measurement */}
          {measure && (
            <line
              x1={measure.from.x}
              y1={measure.from.y}
              x2={measure.to.x}
              y2={measure.to.y}
              stroke="#d9772b"
              strokeWidth={0.03}
              strokeDasharray="0.15 0.1"
            />
          )}

          {/* snap indicator */}
          {snapHint && (
            <circle
              cx={snapHint.p.x}
              cy={snapHint.p.y}
              r={0.09}
              fill="none"
              stroke={snapHint.kind === 'vertex' ? '#e4572e' : '#2f7fd8'}
              strokeWidth={0.025}
            />
          )}
        </g>

        {/* screen-space labels */}
        <g className="labels">
          {labels.map((label, i) => {
            const s = toScreen(label.p)
            return (
              <text key={i} x={s.x} y={s.y} className={label.className} textAnchor="middle">
                {label.lines.map((line, j) => (
                  <tspan key={j} x={s.x} dy={j === 0 ? -8 : 13}>
                    {line}
                  </tspan>
                ))}
              </text>
            )
          })}
          {wallLabels.map((label, i) => {
            const s = toScreen(label.p)
            return (
              <text
                key={`w${i}`}
                x={s.x}
                y={s.y}
                className="wall-label"
                textAnchor="middle"
                transform={`rotate(${label.angle} ${s.x} ${s.y})`}
                dy={-6}
              >
                {label.text}
              </text>
            )
          })}
          {draft && (
            <text
              x={toScreen(draft.current).x + 12}
              y={toScreen(draft.current).y - 10}
              className="draft-label"
            >
              {formatMeters(draftLength)} · {draftAngle.toFixed(1)}°
            </text>
          )}
          {measure && (
            <text
              x={toScreen({ x: (measure.from.x + measure.to.x) / 2, y: (measure.from.y + measure.to.y) / 2 }).x}
              y={toScreen({ x: (measure.from.x + measure.to.x) / 2, y: (measure.from.y + measure.to.y) / 2 }).y - 8}
              className="measure-label"
              textAnchor="middle"
            >
              {formatMeters(dist(measure.from, measure.to))}
            </text>
          )}
        </g>
      </svg>

      <Zoom2D cam={cam} setCam={setCam} house={house} size={size} />
      {draft && <DraftInput length={draftLength} angle={draftAngle} />}
      {tool === 'wall' && !draft && <div className="canvas-hint">Click to start a wall. Double-click or Esc to finish.</div>}
    </div>
  )
}

/* --------------------------------------------------------- sub-components */

function Zoom2D({
  cam,
  setCam,
  house,
  size,
}: {
  cam: Camera
  setCam: (c: Camera) => void
  house: ReturnType<typeof useStore.getState>['house']
  size: { width: number; height: number }
}) {
  const fit = () => {
    const points = Object.values(house.vertices)
    if (points.length === 0) {
      setCam({ cx: 4, cy: 4, ppm: 64 })
      return
    }
    const xs = points.map((p) => p.x)
    const ys = points.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const spanX = Math.max(1, maxX - minX) * 1.25
    const spanY = Math.max(1, maxY - minY) * 1.25
    const ppm = Math.max(MIN_PPM, Math.min(MAX_PPM, Math.min(size.width / spanX, size.height / spanY)))
    setCam({ cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, ppm })
  }
  return (
    <div className="zoom-controls">
      <button type="button" onClick={() => setCam({ ...cam, ppm: Math.min(MAX_PPM, cam.ppm * 1.25) })} title="Zoom in">
        +
      </button>
      <button type="button" onClick={() => setCam({ ...cam, ppm: Math.max(MIN_PPM, cam.ppm / 1.25) })} title="Zoom out">
        −
      </button>
      <button type="button" onClick={fit} title="Fit plan">
        ⤢
      </button>
      <span className="zoom-level">{Math.round(cam.ppm)} px/m</span>
    </div>
  )
}

/** Precise numeric entry for the segment being drawn. */
function DraftInput({ length, angle }: { length: number; angle: number }) {
  const commitDraftByLength = useStore((s) => s.commitDraftByLength)
  const [lengthText, setLengthText] = useState('')
  const [angleText, setAngleText] = useState('')
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    // Track the pointer, but never overwrite what the user is typing.
    if (typing) return
    setLengthText(length.toFixed(2))
    setAngleText(angle.toFixed(1))
  }, [length, angle, typing])

  const submit = () => {
    const len = Number.parseFloat(lengthText)
    const ang = Number.parseFloat(angleText)
    if (!Number.isFinite(len) || len <= 0) return
    commitDraftByLength(len, Number.isFinite(ang) ? ang : 0)
    setTyping(false)
  }

  return (
    <form
      className="draft-input"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <label>
        Length
        <input
          value={lengthText}
          onChange={(e) => setLengthText(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          inputMode="decimal"
        />
        <span className="unit">m</span>
      </label>
      <label>
        Angle
        <input
          value={angleText}
          onChange={(e) => setAngleText(e.target.value)}
          onFocus={() => setTyping(true)}
          onBlur={() => setTyping(false)}
          inputMode="decimal"
        />
        <span className="unit">°</span>
      </label>
      <button type="submit">Add wall ⏎</button>
    </form>
  )
}

export function wallInfo(house: ReturnType<typeof useStore.getState>['house'], wallId: string) {
  const wall = house.walls[wallId]
  if (!wall) return null
  return { length: wallLength(house, wall), angle: degrees(wallAngle(house, wall)) }
}
