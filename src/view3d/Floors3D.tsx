import { useMemo } from 'react'
import * as THREE from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import type { Room } from '../types/house'
import { shade } from '../catalog/palette'

const SLAB = 0.1

function shapeFor(room: Room): THREE.Shape {
  return new THREE.Shape(room.polygon.map((p) => new THREE.Vector2(p.x, p.y)))
}

export function Floors3D() {
  const house = useStore((s) => s.house)
  const selection = useStore((s) => s.selection)
  const visibility = useStore((s) => s.visibility)
  const select = useStore((s) => s.select)
  const placing = useStore((s) => s.placing)

  const rooms = useMemo(
    () =>
      house.rooms
        .filter((room) => !visibility.isolatedRoomId || room.id === visibility.isolatedRoomId)
        .map((room) => ({ room, geometry: new THREE.ExtrudeGeometry(shapeFor(room), { depth: SLAB, bevelEnabled: false }) })),
    [house.rooms, visibility.isolatedRoomId],
  )

  return (
    <group name="floors">
      {rooms.map(({ room, geometry }) => {
        const isSelected = selection.kind === 'room' && selection.id === room.id
        const onClick = (event: ThreeEvent<MouseEvent>) => {
          if (placing) return
          event.stopPropagation()
          select({ kind: 'room', id: room.id })
        }
        return (
          <mesh
            key={room.id}
            geometry={geometry}
            rotation={[Math.PI / 2, 0, 0]}
            receiveShadow
            onClick={onClick}
          >
            <meshStandardMaterial
              color={isSelected ? shade(room.floorColor, -0.12) : room.floorColor}
              roughness={0.95}
              emissive={isSelected ? '#2f7fd8' : '#000000'}
              emissiveIntensity={isSelected ? 0.15 : 0}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export function Roof3D() {
  const house = useStore((s) => s.house)
  const visibility = useStore((s) => s.visibility)

  const slabs = useMemo(
    () =>
      house.rooms.map((room) => {
        const walls = room.wallIds.map((id) => house.walls[id]).filter(Boolean)
        const height = walls.length ? Math.max(...walls.map((w) => w.height)) : house.defaults.wallHeight
        return {
          id: room.id,
          height,
          geometry: new THREE.ExtrudeGeometry(shapeFor(room), { depth: 0.12, bevelEnabled: false }),
        }
      }),
    [house.rooms, house.walls, house.defaults.wallHeight],
  )

  if (!visibility.roof || visibility.isolatedRoomId) return null

  return (
    <group name="roof">
      {slabs.map((slab) => (
        <mesh
          key={slab.id}
          geometry={slab.geometry}
          position={[0, slab.height + 0.12, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <meshStandardMaterial color="#8d7f72" roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
