import { useStore } from '../store/useStore'
import { degrees, formatArea, formatMeters } from '../core/geometry'
import { wallAngle, wallLength } from '../core/house'

export function StatusBar() {
  const house = useStore((s) => s.house)
  const tool = useStore((s) => s.tool)
  const view = useStore((s) => s.view)
  const cursor = useStore((s) => s.cursor)
  const selection = useStore((s) => s.selection)
  const status = useStore((s) => s.status)
  const grid = useStore((s) => s.grid)
  const placing = useStore((s) => s.placing)

  let selectionText = 'Nothing selected'
  if (selection.kind === 'wall') {
    const wall = house.walls[selection.id]
    if (wall) {
      selectionText = `Wall · ${formatMeters(wallLength(house, wall))} × ${formatMeters(wall.height)} · ${wall.thickness * 100} cm thick · ${degrees(
        wallAngle(house, wall),
      ).toFixed(1)}°`
    }
  } else if (selection.kind === 'room') {
    const room = house.rooms.find((r) => r.id === selection.id)
    if (room) selectionText = `Room · ${room.name} · ${formatArea(room.area)}`
  } else if (selection.kind === 'object') {
    const obj = house.objects[selection.id]
    if (obj) {
      selectionText = `${obj.name} · ${obj.size.w.toFixed(2)} × ${obj.size.h.toFixed(2)} × ${obj.size.d.toFixed(
        2,
      )} m · ${degrees(obj.rotation).toFixed(0)}°`
    }
  } else if (selection.kind === 'vertex') {
    const vertex = house.vertices[selection.id]
    if (vertex) selectionText = `Joint · ${vertex.x.toFixed(2)}, ${vertex.y.toFixed(2)} m`
  } else if (selection.kind === 'opening') {
    const opening = house.openings[selection.id]
    if (opening) {
      selectionText = `${opening.kind === 'door' ? 'Door' : 'Window'} · ${formatMeters(opening.width)} × ${formatMeters(
        opening.height,
      )}`
    }
  }

  return (
    <footer className="statusbar">
      <span className="chip-tool">{placing ? `Placing: ${placing.name}` : `Tool: ${tool}`}</span>
      <span>{view === '2d' ? `Cursor: ${cursor.x.toFixed(2)}, ${cursor.y.toFixed(2)} m` : '3D view'}</span>
      <span>{selectionText}</span>
      <span className="spacer" />
      <span>{status}</span>
      <span>Snap: {grid.snap ? `${(grid.size * 100).toFixed(0)} cm` : 'off'}</span>
      <span>Units: meters</span>
    </footer>
  )
}
