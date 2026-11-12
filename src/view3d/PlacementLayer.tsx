import { useEffect, useState } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { DEFAULTS } from '../core/house'
import { resolvePlacement, type PlacementResult } from '../core/placement'
import { FurnitureModel } from '../catalog/models'
import { objectCorners } from '../editor2d/hit'

/** Floor plane + ghost preview used while dropping a catalog item. */
export function PlacementLayer() {
  const placing = useStore((s) => s.placing)
  const house = useStore((s) => s.house)
  const grid = useStore((s) => s.grid)
  const snapToWalls = useStore((s) => s.snapToWalls)
  const constrainToHouse = useStore((s) => s.constrainToHouse)
  const placeObject = useStore((s) => s.placeObject)
  const setStatus = useStore((s) => s.setStatus)
  const setWarning = useStore((s) => s.setWarning)

  const [rotation, setRotation] = useState(0)
  const [result, setResult] = useState<PlacementResult | null>(null)

  useEffect(() => {
    if (!placing) {
      setResult(null)
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r') {
        setRotation((r) => r + Math.PI / 12 * (e.shiftKey ? -1 : 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [placing])

  if (!placing) return null

  const onMove = (event: ThreeEvent<PointerEvent>) => {
    const next = resolvePlacement(
      house,
      { id: placing.id, size: placing.size },
      { x: event.point.x, y: event.point.z },
      {
        // Furniture lands on the centimetre, like every other object move.
        gridSize: DEFAULTS.objectStep,
        gridSnap: grid.snap,
        snapToWalls,
        constrainToHouse,
        rotation,
      },
    )
    setResult(next)
    setStatus(
      next.valid
        ? `${placing.name} · ${next.snappedToWall ? 'snapped to wall' : 'free'} · ${next.position.x.toFixed(2)}, ${next.position.z.toFixed(2)} m${
            next.collisions.length ? ' · overlapping!' : ''
          }`
        : `${placing.name} · outside the house`,
    )
  }

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!result) return
    if (!result.valid) {
      setWarning('Objects must be dropped inside a room (disable the boundary constraint to override).')
      return
    }
    setWarning(result.collisions.length > 0 ? 'Placed object overlaps another object.' : null)
    placeObject(result.position, result.rotation)
  }

  const footprint = result
    ? objectCorners(
        { x: result.position.x, y: result.position.z },
        placing.size.w,
        placing.size.d,
        result.rotation,
      )
    : null

  return (
    <group>
      {/* invisible-ish pick plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} onPointerMove={onMove} onClick={onClick}>
        <planeGeometry args={[400, 400]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {result && (
        <group position={[result.position.x, result.position.y, result.position.z]} rotation={[0, -result.rotation, 0]}>
          <FurnitureModel
            catalogId={placing.id}
            w={placing.size.w}
            h={placing.size.h}
            d={placing.size.d}
            color={placing.color}
          />
          <mesh position={[0, placing.size.h / 2, 0]}>
            <boxGeometry args={[placing.size.w, placing.size.h, placing.size.d]} />
            <meshBasicMaterial
              color={result.valid ? (result.collisions.length ? '#e0a33a' : '#3fa66a') : '#d4553f'}
              transparent
              opacity={0.28}
            />
          </mesh>
        </group>
      )}

      {footprint && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array(
                  [...footprint, footprint[0]].flatMap((p) => [p.x, 0.02, p.y]),
                ),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={result?.valid ? '#2f7fd8' : '#d4553f'} />
        </line>
      )}
    </group>
  )
}
