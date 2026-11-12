import { useMemo, useState } from 'react'
import { useStore, type Tool } from '../store/useStore'
import { ROOM_TYPES, type RoomType, roomTypeLabel } from '../types/house'
import { catalogForRoom, CATEGORY_LABELS } from '../catalog/catalog'
import { formatArea } from '../core/geometry'

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: '⬚', hint: 'Select walls, rooms and objects (V)' },
  { id: 'wall', label: 'Wall', icon: '╱', hint: 'Draw connected walls (W)' },
  { id: 'door', label: 'Door', icon: '🚪', hint: 'Click a wall to add a door (O)' },
  { id: 'window', label: 'Window', icon: '▭', hint: 'Click a wall to add a window (I)' },
  { id: 'move', label: 'Move', icon: '✥', hint: 'Drag walls, vertices and objects (M)' },
  { id: 'delete', label: 'Delete', icon: '⌫', hint: 'Click something to delete it (X)' },
  { id: 'measure', label: 'Measure', icon: '📏', hint: 'Drag to measure a distance (L)' },
  { id: 'pan', label: 'Pan', icon: '✋', hint: 'Drag to pan the plan (P)' },
]

export function LeftSidebar() {
  const tool = useStore((s) => s.tool)
  const setTool = useStore((s) => s.setTool)
  const house = useStore((s) => s.house)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const setRoomProp = useStore((s) => s.setRoomProp)
  const visibility = useStore((s) => s.visibility)
  const setVisibility = useStore((s) => s.setVisibility)
  const runCamera = useStore((s) => s.runCamera)
  const setView = useStore((s) => s.setView)
  const beginPlacing = useStore((s) => s.beginPlacing)
  const catalogRoomType = useStore((s) => s.catalogRoomType)
  const setCatalogRoomType = useStore((s) => s.setCatalogRoomType)
  const placing = useStore((s) => s.placing)

  const [query, setQuery] = useState('')

  const items = useMemo(() => catalogForRoom(catalogRoomType, query), [catalogRoomType, query])

  const focusRoom = (roomId: string) => {
    select({ kind: 'room', id: roomId })
    setView('3d')
    runCamera('fit', roomId)
  }

  return (
    <aside className="sidebar left">
      <section className="panel">
        <h2>Tools</h2>
        <div className="tool-grid">
          {TOOLS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`tool${tool === entry.id ? ' active' : ''}`}
              onClick={() => setTool(entry.id)}
              title={entry.hint}
            >
              <span className="tool-icon">{entry.icon}</span>
              <span className="tool-label">{entry.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>
          Rooms <span className="count">{house.rooms.length}</span>
        </h2>
        {house.rooms.length === 0 && (
          <p className="empty">Draw closed walls to create rooms. Enclosed areas are detected automatically.</p>
        )}
        <ul className="room-list">
          {house.rooms.map((room) => {
            const isSelected = selection.kind === 'room' && selection.id === room.id
            return (
              <li key={room.id} className={isSelected ? 'selected' : ''}>
                <button type="button" className="room-main" onClick={() => select({ kind: 'room', id: room.id })}>
                  <span className="swatch-dot" style={{ background: room.floorColor }} />
                  <span className="room-name">{room.name}</span>
                  <span className="room-area">{formatArea(room.area)}</span>
                </button>
                <div className="room-actions">
                  <select
                    value={room.type}
                    onChange={(e) => setRoomProp(room.id, { type: e.target.value as RoomType })}
                    title="Room type"
                  >
                    {ROOM_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={visibility.isolatedRoomId === room.id ? 'active' : ''}
                    onClick={() =>
                      setVisibility({
                        isolatedRoomId: visibility.isolatedRoomId === room.id ? null : room.id,
                      })
                    }
                    title="Isolate this room in the 3D view"
                  >
                    Isolate
                  </button>
                  <button type="button" onClick={() => focusRoom(room.id)} title="Focus the 3D camera on this room">
                    Focus
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="panel catalog">
        <h2>Furniture catalog</h2>
        <div className="chips">
          <button
            type="button"
            className={catalogRoomType === null ? 'chip active' : 'chip'}
            onClick={() => setCatalogRoomType(null)}
          >
            All
          </button>
          {ROOM_TYPES.filter((type) => type.id !== 'other').map((type) => (
            <button
              key={type.id}
              type="button"
              className={catalogRoomType === type.id ? 'chip active' : 'chip'}
              onClick={() => setCatalogRoomType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="Search furniture…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {catalogRoomType && (
          <p className="hint">
            Showing {roomTypeLabel(catalogRoomType)} items first — the whole catalog stays below.
          </p>
        )}
        <ul className="catalog-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={placing?.id === item.id ? 'catalog-item active' : 'catalog-item'}
                onClick={() => beginPlacing(item)}
                title={`Place ${item.name} (${item.size.w}×${item.size.d} m)`}
              >
                <span className="swatch-dot" style={{ background: item.color }} />
                <span className="catalog-name">{item.name}</span>
                <span className="catalog-meta">
                  {CATEGORY_LABELS[item.category]} · {item.size.w.toFixed(2)}×{item.size.d.toFixed(2)} m
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
