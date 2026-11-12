import { useMemo } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { useStore } from '../store/useStore'
import { openingsForWall, wallAngle, wallCenter, wallLength } from '../core/house'
import { shade } from '../catalog/palette'
import { wallPieces } from './wallGeometry'

export function Walls3D() {
  const house = useStore((s) => s.house)
  const visibility = useStore((s) => s.visibility)
  const selection = useStore((s) => s.selection)
  const select = useStore((s) => s.select)
  const tool = useStore((s) => s.tool)
  const deleteSelection = useStore((s) => s.deleteSelection)
  const placing = useStore((s) => s.placing)

  const isolatedWallIds = useMemo(() => {
    if (!visibility.isolatedRoomId) return null
    const room = house.rooms.find((r) => r.id === visibility.isolatedRoomId)
    return room ? new Set(room.wallIds) : new Set<string>()
  }, [house.rooms, visibility.isolatedRoomId])

  if (!visibility.walls) return null

  return (
    <group name="walls">
      {Object.values(house.walls).map((wall) => {
        if (wall.hidden) return null
        if (isolatedWallIds && !isolatedWallIds.has(wall.id)) return null

        const length = wallLength(house, wall)
        if (length <= 0.01) return null
        const center = wallCenter(house, wall)
        const angle = wallAngle(house, wall)
        const pieces = wallPieces(
          length,
          wall.height,
          openingsForWall(house, wall.id).map((opening) => ({
            t: opening.t,
            width: opening.width,
            height: opening.height,
            sill: opening.sill,
          })),
        )
        const isSelected = selection.kind === 'wall' && selection.id === wall.id
        const color = isSelected ? shade(wall.color, -0.25) : wall.color

        const onClick = (event: ThreeEvent<MouseEvent>) => {
          // While placing furniture the click belongs to the placement plane.
          if (placing) return
          event.stopPropagation()
          if (tool === 'delete') {
            select({ kind: 'wall', id: wall.id })
            deleteSelection()
            return
          }
          select({ kind: 'wall', id: wall.id })
        }

        return (
          <group key={wall.id} position={[center.x, 0, center.y]} rotation={[0, -angle, 0]} onClick={onClick}>
            {pieces.map((piece, index) => (
              <mesh key={index} position={[piece.cx, piece.cy, 0]} castShadow receiveShadow>
                <boxGeometry args={[piece.len, piece.h, wall.thickness]} />
                <meshStandardMaterial
                  color={color}
                  roughness={0.9}
                  emissive={isSelected ? '#2f7fd8' : '#000000'}
                  emissiveIntensity={isSelected ? 0.18 : 0}
                />
              </mesh>
            ))}
            {/* window glass, so openings read as windows in 3D */}
            {openingsForWall(house, wall.id)
              .filter((opening) => opening.kind === 'window')
              .map((opening) => (
                <mesh
                  key={opening.id}
                  position={[
                    opening.t * length - length / 2,
                    opening.sill + opening.height / 2,
                    0,
                  ]}
                >
                  <boxGeometry args={[opening.width, opening.height, wall.thickness * 0.2]} />
                  <meshStandardMaterial
                    color="#bcd8e6"
                    transparent
                    opacity={0.35}
                    roughness={0.05}
                    metalness={0.1}
                  />
                </mesh>
              ))}
          </group>
        )
      })}
    </group>
  )
}
