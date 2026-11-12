import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  clearAutosave,
  downloadHouse,
  listSlots,
  loadSlot,
  openHouseFile,
  saveSlot,
} from '../core/persistence'

export function TopToolbar() {
  const house = useStore((s) => s.house)
  const view = useStore((s) => s.view)
  const setView = useStore((s) => s.setView)
  const undo = useStore((s) => s.undo)
  const redo = useStore((s) => s.redo)
  const past = useStore((s) => s.past.length)
  const future = useStore((s) => s.future.length)
  const newProject = useStore((s) => s.newProject)
  const loadHouse = useStore((s) => s.loadHouse)
  const renameProject = useStore((s) => s.renameProject)
  const setStatus = useStore((s) => s.setStatus)
  const setWarning = useStore((s) => s.setWarning)
  const cameraMode = useStore((s) => s.cameraMode)
  const setCameraMode = useStore((s) => s.setCameraMode)
  const runCamera = useStore((s) => s.runCamera)
  const firstPerson = useStore((s) => s.firstPerson)
  const setFirstPerson = useStore((s) => s.setFirstPerson)
  const visibility = useStore((s) => s.visibility)
  const setVisibility = useStore((s) => s.setVisibility)
  const grid = useStore((s) => s.grid)
  const setGrid = useStore((s) => s.setGrid)
  const gizmo = useStore((s) => s.gizmo)
  const setGizmo = useStore((s) => s.setGizmo)

  const [name, setName] = useState(house.meta.name)
  const [slots, setSlots] = useState(listSlots())

  useEffect(() => setName(house.meta.name), [house.meta.name])

  const refreshSlots = () => setSlots(listSlots())

  const onSave = () => {
    saveSlot(house)
    refreshSlots()
    setStatus(`Saved "${house.meta.name}" to this browser`)
  }

  const onLoad = (slotName: string) => {
    if (!slotName) return
    const loaded = loadSlot(slotName)
    if (!loaded) {
      setWarning(`Could not load "${slotName}".`)
      return
    }
    loadHouse(loaded)
  }

  const onImport = async () => {
    try {
      const imported = await openHouseFile()
      loadHouse(imported)
    } catch (error) {
      setWarning(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  const onReset = () => {
    clearAutosave()
    newProject()
    setStatus('Project reset')
  }

  return (
    <header className="toolbar">
      <div className="toolbar-group brand">
        <span className="logo">⌂</span>
        <input
          className="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => renameProject(name.trim() || 'Untitled House')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          title="Project name"
        />
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={newProject} title="New project">
          New
        </button>
        <button type="button" onClick={onSave} title="Save to this browser">
          Save
        </button>
        <select
          className="slot-select"
          value=""
          onChange={(e) => onLoad(e.target.value)}
          onFocus={refreshSlots}
          title="Load a saved project"
        >
          <option value="">Load…</option>
          {slots.map((slot) => (
            <option key={slot.name} value={slot.name}>
              {slot.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => downloadHouse(house)} title="Export project as JSON">
          Export
        </button>
        <button type="button" onClick={onImport} title="Import project from JSON">
          Import
        </button>
        <button type="button" onClick={onReset} title="Reset to an empty project">
          Reset
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={undo} disabled={past === 0} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button type="button" onClick={redo} disabled={future === 0} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
      </div>

      <div className="toolbar-group segmented">
        <button type="button" className={view === '2d' ? 'active' : ''} onClick={() => setView('2d')} title="2D floor plan (2)">
          2D Plan
        </button>
        <button type="button" className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')} title="3D view (3)">
          3D View
        </button>
      </div>

      {view === '3d' && (
        <>
          <div className="toolbar-group segmented">
            <button type="button" onClick={() => runCamera('iso')} title="Isometric view">
              Iso
            </button>
            <button type="button" onClick={() => runCamera('top')} title="Top-down view">
              Top
            </button>
            <button type="button" onClick={() => runCamera('front')} title="Front view">
              Front
            </button>
            <button type="button" onClick={() => runCamera('side')} title="Side view">
              Side
            </button>
            <button type="button" onClick={() => runCamera('fit')} title="Fit the house in view">
              Fit
            </button>
          </div>

          <div className="toolbar-group segmented">
            <button
              type="button"
              className={cameraMode === 'perspective' ? 'active' : ''}
              onClick={() => setCameraMode('perspective')}
              title="Perspective camera"
            >
              Persp
            </button>
            <button
              type="button"
              className={cameraMode === 'orthographic' ? 'active' : ''}
              onClick={() => setCameraMode('orthographic')}
              title="Orthographic camera"
            >
              Ortho
            </button>
            <button
              type="button"
              className={firstPerson ? 'active' : ''}
              onClick={() => setFirstPerson(!firstPerson)}
              title="First-person walkthrough (click the scene to look, WASD to walk, Esc to exit)"
            >
              Walk
            </button>
          </div>

          <div className="toolbar-group segmented" title="Transform mode for the selected object">
            <button type="button" className={gizmo === 'translate' ? 'active' : ''} onClick={() => setGizmo('translate')}>
              Move
            </button>
            <button type="button" className={gizmo === 'rotate' ? 'active' : ''} onClick={() => setGizmo('rotate')}>
              Rotate
            </button>
            <button type="button" className={gizmo === 'scale' ? 'active' : ''} onClick={() => setGizmo('scale')}>
              Scale
            </button>
          </div>

          <div className="toolbar-group">
            <button
              type="button"
              className={visibility.walls ? '' : 'active'}
              onClick={() => setVisibility({ walls: !visibility.walls })}
              title="Show/hide all walls"
            >
              {visibility.walls ? 'Hide walls' : 'Show walls'}
            </button>
            <button
              type="button"
              className={visibility.roof ? 'active' : ''}
              onClick={() => setVisibility({ roof: !visibility.roof })}
              title="Show/hide the roof"
            >
              {visibility.roof ? 'Hide roof' : 'Show roof'}
            </button>
            {visibility.isolatedRoomId && (
              <button type="button" className="active" onClick={() => setVisibility({ isolatedRoomId: null })}>
                Exit isolation
              </button>
            )}
          </div>
        </>
      )}

      <div className="toolbar-group right">
        <label className="checkbox" title="Snap to grid, walls and vertices (G)">
          <input type="checkbox" checked={grid.snap} onChange={(e) => setGrid({ snap: e.target.checked })} />
          Snap
        </label>
        <label className="checkbox" title="Show grid">
          <input type="checkbox" checked={grid.show} onChange={(e) => setGrid({ show: e.target.checked })} />
          Grid
        </label>
        <select
          value={grid.size}
          onChange={(e) => setGrid({ size: Number.parseFloat(e.target.value) })}
          title="Grid size"
        >
          <option value={0.1}>10 cm</option>
          <option value={0.25}>25 cm</option>
          <option value={0.5}>50 cm</option>
          <option value={1}>1 m</option>
        </select>
      </div>
    </header>
  )
}
