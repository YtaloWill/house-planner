import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { TransformControls } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { FurnitureModel } from '../catalog/models'
import { DEFAULTS, overlappingObjects } from '../core/house'

export function Furniture3D() {
  const house = useStore((s) => s.house)
  const selection = useStore((s) => s.selection)
  const visibility = useStore((s) => s.visibility)
  const gizmo = useStore((s) => s.gizmo)
  const grid = useStore((s) => s.grid)
  const tool = useStore((s) => s.tool)
  const placing = useStore((s) => s.placing)
  const select = useStore((s) => s.select)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const pushHistory = useStore((s) => s.pushHistory)
  const setObjectPropLive = useStore((s) => s.setObjectPropLive)
  const setWarning = useStore((s) => s.setWarning)

  const [target, setTarget] = useState<THREE.Object3D | null>(null)

  const selectedId = selection.kind === 'object' ? selection.id : null
  const objects = useMemo(
    () =>
      Object.values(house.objects).filter(
        (obj) => !visibility.isolatedRoomId || obj.roomId === visibility.isolatedRoomId,
      ),
    [house.objects, visibility.isolatedRoomId],
  )

  useEffect(() => {
    if (!selectedId) setTarget(null)
  }, [selectedId])

  const commitFromTarget = (mode: typeof gizmo) => {
    if (!target || !selectedId) return
    const obj = house.objects[selectedId]
    if (!obj) return

    if (mode === 'scale') {
      const next = {
        w: Math.max(0.05, obj.size.w * target.scale.x),
        h: Math.max(0.05, obj.size.h * target.scale.y),
        d: Math.max(0.05, obj.size.d * target.scale.z),
      }
      target.scale.set(1, 1, 1)
      setObjectPropLive(selectedId, { size: next })
      return
    }

    if (mode === 'rotate') {
      // Yaw drives the floor-plan footprint; X and Z are kept as tilt.
      setObjectPropLive(selectedId, {
        rotation: -target.rotation.y,
        tilt: { x: target.rotation.x, z: target.rotation.z },
      })
      return
    }

    const y = Math.max(0, target.position.y)
    target.position.y = y
    setObjectPropLive(selectedId, {
      position: { x: target.position.x, y, z: target.position.z },
    })
  }

  return (
    <group name="furniture">
      {objects.map((obj) => {
        const isSelected = obj.id === selectedId
        const onClick = (event: ThreeEvent<MouseEvent>) => {
          if (placing) return
          event.stopPropagation()
          if (tool === 'delete') {
            select({ kind: 'object', id: obj.id })
            deleteSelection()
            return
          }
          select({ kind: 'object', id: obj.id })
        }
        return (
          <group
            key={obj.id}
            ref={
              isSelected
                ? (node) => {
                    if (node) setTarget(node)
                  }
                : undefined
            }
            position={[obj.position.x, obj.position.y, obj.position.z]}
            rotation={[obj.tilt.x, -obj.rotation, obj.tilt.z]}
            onClick={onClick}
          >
            <FurnitureModel
              catalogId={obj.catalogId}
              w={obj.size.w}
              h={obj.size.h}
              d={obj.size.d}
              color={obj.color}
            />
            {isSelected && (
              <mesh position={[0, obj.size.h / 2, 0]}>
                <boxGeometry args={[obj.size.w + 0.03, obj.size.h + 0.03, obj.size.d + 0.03]} />
                <meshBasicMaterial color="#2f7fd8" wireframe transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        )
      })}

      {target && selectedId && !placing && (
        <TransformControls
          object={target}
          mode={gizmo}
          translationSnap={grid.snap ? DEFAULTS.objectStep : undefined}
          rotationSnap={grid.snap ? DEFAULTS.objectAngleStep : undefined}
          onMouseDown={() => pushHistory()}
          onObjectChange={() => {
            if (gizmo !== 'scale') commitFromTarget(gizmo)
          }}
          onMouseUp={() => {
            commitFromTarget(gizmo)
            const obj = useStore.getState().house.objects[selectedId]
            if (obj) {
              const hits = overlappingObjects(useStore.getState().house, obj)
              setWarning(hits.length > 0 ? `${obj.name} overlaps ${hits.length} other object(s)` : null)
            }
          }}
        />
      )}
    </group>
  )
}
