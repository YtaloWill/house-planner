import { useStore } from '../store/useStore'
import { ROOM_TYPES, type RoomType, roomTypeLabel } from '../types/house'
import { ColorField, NumberField, Row, SelectField, TextField } from './fields'
import { degrees, dist, formatArea, formatMeters, radians } from '../core/geometry'
import { openingsForWall, wallAngle, wallEnds, wallLength, totalFloorArea } from '../core/house'
import { CATEGORY_LABELS, CATALOG_BY_ID } from '../catalog/catalog'
import { FLOOR_COLORS, MATERIAL_OPTIONS, WALL_COLORS } from '../catalog/palette'

export function RightSidebar() {
  const house = useStore((s) => s.house)
  const selection = useStore((s) => s.selection)

  return (
    <aside className="sidebar right">
      {selection.kind === 'wall' && house.walls[selection.id] && <WallPanel wallId={selection.id} />}
      {selection.kind === 'vertex' && house.vertices[selection.id] && <VertexPanel vertexId={selection.id} />}
      {selection.kind === 'room' && <RoomPanel roomId={selection.id} />}
      {selection.kind === 'object' && house.objects[selection.id] && <ObjectPanel objectId={selection.id} />}
      {selection.kind === 'opening' && house.openings[selection.id] && <OpeningPanel openingId={selection.id} />}
      {(selection.kind === 'none' ||
        (selection.kind === 'wall' && !house.walls[selection.id]) ||
        (selection.kind === 'object' && !house.objects[selection.id])) && <ProjectPanel />}
    </aside>
  )
}

/* ------------------------------------------------------------------- walls */

function WallPanel({ wallId }: { wallId: string }) {
  const house = useStore((s) => s.house)
  const setWallProp = useStore((s) => s.setWallProp)
  const setWallLengthValue = useStore((s) => s.setWallLengthValue)
  const setWallAngleValue = useStore((s) => s.setWallAngleValue)
  const setWallEnd = useStore((s) => s.setWallEnd)
  const addWallOpening = useStore((s) => s.addWallOpening)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const select = useStore((s) => s.select)

  const wall = house.walls[wallId]
  const [a, b] = wallEnds(house, wall)
  const length = wallLength(house, wall)
  const angle = degrees(wallAngle(house, wall))
  const openings = openingsForWall(house, wallId)

  return (
    <section className="panel">
      <h2>Wall</h2>
      <p className="meta">
        {formatMeters(length)} · {angle.toFixed(1)}° · {openings.length} opening(s)
      </p>

      <NumberField label="Length" value={length} min={0.05} onChange={(v) => setWallLengthValue(wallId, v)} />
      <NumberField label="Rotation" value={angle} unit="°" step={1} digits={1} onChange={(v) => setWallAngleValue(wallId, v)} />
      <NumberField label="Height" value={wall.height} min={0.2} onChange={(v) => setWallProp(wallId, { height: v })} />
      <NumberField label="Thickness" value={wall.thickness} min={0.02} step={0.01} onChange={(v) => setWallProp(wallId, { thickness: v })} />

      <h3>Position</h3>
      <Row>
        <NumberField label="Start X" value={a.x} onChange={(v) => setWallEnd(wallId, 'a', { x: v, y: a.y })} />
        <NumberField label="Start Y" value={a.y} onChange={(v) => setWallEnd(wallId, 'a', { x: a.x, y: v })} />
      </Row>
      <Row>
        <NumberField label="End X" value={b.x} onChange={(v) => setWallEnd(wallId, 'b', { x: v, y: b.y })} />
        <NumberField label="End Y" value={b.y} onChange={(v) => setWallEnd(wallId, 'b', { x: b.x, y: v })} />
      </Row>

      <h3>Material</h3>
      <ColorField label="Colour" value={wall.color} onChange={(v) => setWallProp(wallId, { color: v })} swatches={WALL_COLORS} />
      <label className="checkbox">
        <input type="checkbox" checked={wall.hidden === true} onChange={(e) => setWallProp(wallId, { hidden: e.target.checked })} />
        Hide this wall in 3D
      </label>

      <h3>Openings</h3>
      <div className="button-row">
        <button type="button" onClick={() => addWallOpening(wallId, 'door', 0.5)}>
          + Door
        </button>
        <button type="button" onClick={() => addWallOpening(wallId, 'window', 0.5)}>
          + Window
        </button>
      </div>
      <ul className="mini-list">
        {openings.map((opening) => (
          <li key={opening.id}>
            <button type="button" onClick={() => select({ kind: 'opening', id: opening.id })}>
              {opening.kind === 'door' ? 'Door' : 'Window'} · {formatMeters(opening.width)} at{' '}
              {formatMeters(opening.t * length)}
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="danger" onClick={deleteSelection}>
        Delete wall
      </button>
    </section>
  )
}

function VertexPanel({ vertexId }: { vertexId: string }) {
  const house = useStore((s) => s.house)
  const setVertexPos = useStore((s) => s.setVertexPos)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const vertex = house.vertices[vertexId]
  const connected = Object.values(house.walls).filter((w) => w.a === vertexId || w.b === vertexId)

  return (
    <section className="panel">
      <h2>Wall joint</h2>
      <p className="meta">{connected.length} connected wall(s)</p>
      <Row>
        <NumberField label="X" value={vertex.x} onChange={(v) => setVertexPos(vertexId, { x: v, y: vertex.y })} />
        <NumberField label="Y" value={vertex.y} onChange={(v) => setVertexPos(vertexId, { x: vertex.x, y: v })} />
      </Row>
      <p className="hint">Moving a joint keeps every wall attached to it connected.</p>
      <button type="button" className="danger" onClick={deleteSelection}>
        Delete joint and its walls
      </button>
    </section>
  )
}

/* ------------------------------------------------------------------- rooms */

function RoomPanel({ roomId }: { roomId: string }) {
  const house = useStore((s) => s.house)
  const setRoomProp = useStore((s) => s.setRoomProp)
  const visibility = useStore((s) => s.visibility)
  const setVisibility = useStore((s) => s.setVisibility)
  const runCamera = useStore((s) => s.runCamera)
  const setView = useStore((s) => s.setView)
  const room = house.rooms.find((r) => r.id === roomId)

  if (!room) {
    return (
      <section className="panel">
        <h2>Room</h2>
        <p className="empty">This room no longer exists — the walls around it changed.</p>
      </section>
    )
  }

  const walls = room.wallIds.map((id) => house.walls[id]).filter(Boolean)
  const perimeter = room.polygon.reduce((sum, p, i) => sum + dist(p, room.polygon[(i + 1) % room.polygon.length]), 0)
  const objects = Object.values(house.objects).filter((obj) => obj.roomId === room.id)

  return (
    <section className="panel">
      <h2>Room</h2>
      <TextField label="Name" value={room.name} onChange={(v) => setRoomProp(roomId, { name: v })} />
      <SelectField
        label="Type"
        value={room.type}
        options={ROOM_TYPES.map((type) => ({ value: type.id, label: type.label }))}
        onChange={(v) => setRoomProp(roomId, { type: v as RoomType })}
      />
      <ColorField label="Floor" value={room.floorColor} onChange={(v) => setRoomProp(roomId, { floorColor: v })} swatches={FLOOR_COLORS} />
      <dl className="stats">
        <div>
          <dt>Floor area</dt>
          <dd>{formatArea(room.area)}</dd>
        </div>
        <div>
          <dt>Perimeter</dt>
          <dd>{formatMeters(perimeter)}</dd>
        </div>
        <div>
          <dt>Boundary walls</dt>
          <dd>{walls.length}</dd>
        </div>
        <div>
          <dt>Objects</dt>
          <dd>{objects.length}</dd>
        </div>
      </dl>
      <div className="button-row">
        <button
          type="button"
          className={visibility.isolatedRoomId === room.id ? 'active' : ''}
          onClick={() => setVisibility({ isolatedRoomId: visibility.isolatedRoomId === room.id ? null : room.id })}
        >
          {visibility.isolatedRoomId === room.id ? 'Show whole house' : 'Isolate room'}
        </button>
        <button
          type="button"
          onClick={() => {
            setView('3d')
            runCamera('fit', room.id)
          }}
        >
          Focus camera
        </button>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- objects */

function ObjectPanel({ objectId }: { objectId: string }) {
  const house = useStore((s) => s.house)
  const setObjectProp = useStore((s) => s.setObjectProp)
  const duplicateSelected = useStore((s) => s.duplicateSelected)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const gizmo = useStore((s) => s.gizmo)
  const setGizmo = useStore((s) => s.setGizmo)
  const constrainToHouse = useStore((s) => s.constrainToHouse)
  const setConstrainToHouse = useStore((s) => s.setConstrainToHouse)
  const snapToWalls = useStore((s) => s.snapToWalls)
  const setSnapToWalls = useStore((s) => s.setSnapToWalls)

  const obj = house.objects[objectId]
  const item = CATALOG_BY_ID[obj.catalogId]
  const room = obj.roomId ? house.rooms.find((r) => r.id === obj.roomId) : undefined

  return (
    <section className="panel">
      <h2>{obj.name}</h2>
      <p className="meta">
        {CATEGORY_LABELS[obj.category]} · {item ? item.id : obj.catalogId}
        {room ? ` · in ${room.name}` : ' · outside any room'}
      </p>

      <TextField label="Name" value={obj.name} onChange={(v) => setObjectProp(objectId, { name: v })} />

      <h3>Dimensions</h3>
      <Row>
        <NumberField label="Width" value={obj.size.w} min={0.05} onChange={(v) => setObjectProp(objectId, { size: { ...obj.size, w: v } })} />
        <NumberField label="Height" value={obj.size.h} min={0.05} onChange={(v) => setObjectProp(objectId, { size: { ...obj.size, h: v } })} />
      </Row>
      <NumberField label="Depth" value={obj.size.d} min={0.05} onChange={(v) => setObjectProp(objectId, { size: { ...obj.size, d: v } })} />
      {item && (
        <button
          type="button"
          onClick={() => setObjectProp(objectId, { size: { ...item.size } })}
          title={`Reset to ${item.size.w}×${item.size.h}×${item.size.d} m`}
        >
          Reset to default size
        </button>
      )}

      <h3>Position</h3>
      <Row>
        <NumberField label="X" value={obj.position.x} onChange={(v) => setObjectProp(objectId, { position: { ...obj.position, x: v } })} />
        <NumberField label="Z" value={obj.position.z} onChange={(v) => setObjectProp(objectId, { position: { ...obj.position, z: v } })} />
      </Row>
      <NumberField
        label="Y (height off floor)"
        value={obj.position.y}
        min={0}
        onChange={(v) => setObjectProp(objectId, { position: { ...obj.position, y: v } })}
      />
      <NumberField
        label="Rotation"
        value={degrees(obj.rotation)}
        unit="°"
        step={5}
        digits={1}
        onChange={(v) => setObjectProp(objectId, { rotation: radians(v) })}
      />

      <h3>Material</h3>
      <ColorField
        label="Colour"
        value={obj.color}
        onChange={(v) => setObjectProp(objectId, { color: v })}
        swatches={MATERIAL_OPTIONS.map((option) => option.color)}
      />

      <h3>Gizmo</h3>
      <div className="button-row segmented">
        {(['translate', 'rotate', 'scale'] as const).map((mode) => (
          <button key={mode} type="button" className={gizmo === mode ? 'active' : ''} onClick={() => setGizmo(mode)}>
            {mode}
          </button>
        ))}
      </div>
      <label className="checkbox">
        <input type="checkbox" checked={snapToWalls} onChange={(e) => setSnapToWalls(e.target.checked)} />
        Snap new objects to walls
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={constrainToHouse} onChange={(e) => setConstrainToHouse(e.target.checked)} />
        Keep objects inside the house
      </label>

      <div className="button-row">
        <button type="button" onClick={duplicateSelected}>
          Duplicate
        </button>
        <button type="button" className="danger" onClick={deleteSelection}>
          Delete
        </button>
      </div>
    </section>
  )
}

function OpeningPanel({ openingId }: { openingId: string }) {
  const house = useStore((s) => s.house)
  const setOpeningProp = useStore((s) => s.setOpeningProp)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const select = useStore((s) => s.select)

  const opening = house.openings[openingId]
  const wall = house.walls[opening.wallId]
  const length = wall ? wallLength(house, wall) : 1

  return (
    <section className="panel">
      <h2>{opening.kind === 'door' ? 'Door' : 'Window'}</h2>
      <p className="meta">on a {formatMeters(length)} wall</p>
      <SelectField
        label="Type"
        value={opening.kind}
        options={[
          { value: 'door', label: 'Door' },
          { value: 'window', label: 'Window' },
        ]}
        onChange={(v) => setOpeningProp(openingId, { kind: v })}
      />
      <NumberField label="Width" value={opening.width} min={0.2} onChange={(v) => setOpeningProp(openingId, { width: v })} />
      <NumberField label="Height" value={opening.height} min={0.2} onChange={(v) => setOpeningProp(openingId, { height: v })} />
      <NumberField label="Sill height" value={opening.sill} min={0} onChange={(v) => setOpeningProp(openingId, { sill: v })} />
      <NumberField
        label="Distance along wall"
        value={opening.t * length}
        min={0}
        max={length}
        onChange={(v) => setOpeningProp(openingId, { t: Math.min(1, Math.max(0, v / Math.max(length, 1e-6))) })}
      />
      <div className="button-row">
        {wall && (
          <button type="button" onClick={() => select({ kind: 'wall', id: wall.id })}>
            Select wall
          </button>
        )}
        <button type="button" className="danger" onClick={deleteSelection}>
          Delete
        </button>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- project */

function ProjectPanel() {
  const house = useStore((s) => s.house)
  const setDefaults = useStore((s) => s.setDefaults)

  const wallCount = Object.keys(house.walls).length
  const objectCount = Object.keys(house.objects).length
  const openingCount = Object.keys(house.openings).length

  return (
    <section className="panel">
      <h2>Project</h2>
      <dl className="stats">
        <div>
          <dt>Rooms</dt>
          <dd>{house.rooms.length}</dd>
        </div>
        <div>
          <dt>Total floor area</dt>
          <dd>{formatArea(totalFloorArea(house))}</dd>
        </div>
        <div>
          <dt>Walls</dt>
          <dd>{wallCount}</dd>
        </div>
        <div>
          <dt>Doors / windows</dt>
          <dd>{openingCount}</dd>
        </div>
        <div>
          <dt>Objects</dt>
          <dd>{objectCount}</dd>
        </div>
        <div>
          <dt>Units</dt>
          <dd>meters</dd>
        </div>
      </dl>

      <h3>New wall defaults</h3>
      <NumberField label="Height" value={house.defaults.wallHeight} min={0.5} onChange={(v) => setDefaults({ wallHeight: v })} />
      <NumberField label="Thickness" value={house.defaults.wallThickness} min={0.02} step={0.01} onChange={(v) => setDefaults({ wallThickness: v })} />
      <ColorField label="Colour" value={house.defaults.wallColor} onChange={(v) => setDefaults({ wallColor: v })} swatches={WALL_COLORS} />

      <h3>Room types</h3>
      <ul className="legend">
        {house.rooms.length === 0 && <li className="empty">No rooms yet.</li>}
        {house.rooms.map((room) => (
          <li key={room.id}>
            <span className="swatch-dot" style={{ background: room.floorColor }} />
            {room.name} — {roomTypeLabel(room.type)} · {formatArea(room.area)}
          </li>
        ))}
      </ul>
      <p className="hint">
        Select a wall, room, joint or object to edit it. Everything is measured in meters; 1 unit = 1 m in the 3D view.
      </p>
    </section>
  )
}
