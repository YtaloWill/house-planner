import { useEffect } from 'react'
import { useStore, type Tool } from './store/useStore'
import { TopToolbar } from './ui/TopToolbar'
import { LeftSidebar } from './ui/LeftSidebar'
import { RightSidebar } from './ui/RightSidebar'
import { StatusBar } from './ui/StatusBar'
import { Canvas2D } from './editor2d/Canvas2D'
import { Scene3D } from './view3d/Scene3D'
import { saveSlot } from './core/persistence'

const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  w: 'wall',
  o: 'door',
  i: 'window',
  m: 'move',
  x: 'delete',
  l: 'measure',
  p: 'pan',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}

export default function App() {
  const view = useStore((s) => s.view)
  const warning = useStore((s) => s.warning)
  const setWarning = useStore((s) => s.setWarning)

  useEffect(() => {
    if (!warning) return
    const timer = window.setTimeout(() => setWarning(null), 5000)
    return () => window.clearTimeout(timer)
  }, [warning, setWarning])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const state = useStore.getState()
      if (isTypingTarget(event.target)) return

      const meta = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()

      if (meta && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) state.redo()
        else state.undo()
        return
      }
      if (meta && key === 'y') {
        event.preventDefault()
        state.redo()
        return
      }
      if (meta && key === 's') {
        event.preventDefault()
        saveSlot(state.house)
        state.setStatus(`Saved "${state.house.meta.name}" to this browser`)
        return
      }
      if (meta && key === 'd') {
        event.preventDefault()
        state.duplicateSelected()
        return
      }

      if (event.key === 'Escape') {
        if (state.draft) state.endDraft()
        else if (state.placing) state.cancelPlacing()
        else if (state.firstPerson) state.setFirstPerson(false)
        else state.select({ kind: 'none' })
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        state.deleteSelection()
        return
      }

      if (event.key === 'Enter' && state.draft) {
        state.endDraft()
        return
      }

      if (key === '2') {
        state.setView('2d')
        return
      }
      if (key === '3') {
        state.setView('3d')
        return
      }
      if (key === 'g') {
        state.setGrid({ snap: !state.grid.snap })
        state.setStatus(`Snapping ${!state.grid.snap ? 'on' : 'off'}`)
        return
      }
      if (meta) return
      const tool = TOOL_KEYS[key]
      if (tool) state.setTool(tool)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="app">
      <TopToolbar />
      <div className="body">
        <LeftSidebar />
        <main className="workspace">
          <div className={`viewport${view === '2d' ? ' active' : ''}`}>
            <Canvas2D />
          </div>
          <div className={`viewport${view === '3d' ? ' active' : ''}`}>
            <Scene3D />
          </div>
          {warning && (
            <div className="toast" role="status">
              {warning}
              <button type="button" onClick={() => setWarning(null)} aria-label="Dismiss">
                ×
              </button>
            </div>
          )}
        </main>
        <RightSidebar />
      </div>
      <StatusBar />
    </div>
  )
}
