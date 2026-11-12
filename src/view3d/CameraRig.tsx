import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls, OrthographicCamera, PerspectiveCamera, PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useStore } from '../store/useStore'
import { boundsOf } from '../core/geometry'
import type { House } from '../types/house'

interface Frame {
  center: THREE.Vector3
  span: number
}

function houseFrame(house: House, roomId?: string): Frame {
  const room = roomId ? house.rooms.find((r) => r.id === roomId) : undefined
  const points = room
    ? room.polygon
    : Object.values(house.vertices).map((v) => ({ x: v.x, y: v.y }))
  const bounds = boundsOf(points)
  if (!bounds) return { center: new THREE.Vector3(0, 0, 0), span: 10 }
  const center = new THREE.Vector3(
    (bounds.min.x + bounds.max.x) / 2,
    0,
    (bounds.min.y + bounds.max.y) / 2,
  )
  const span = Math.max(3, bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y)
  return { center, span }
}

export function CameraRig() {
  const cameraMode = useStore((s) => s.cameraMode)
  const cameraCommand = useStore((s) => s.cameraCommand)
  const firstPerson = useStore((s) => s.firstPerson)
  const house = useStore((s) => s.house)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    const { preset, roomId } = cameraCommand
    const { center, span } = houseFrame(house, roomId)
    const distance = span * 1.6 + 4
    const target = center.clone()
    if (roomId) target.y = 1.2

    const place = (x: number, y: number, z: number, up: THREE.Vector3) => {
      camera.up.copy(up)
      camera.position.set(center.x + x, y, center.z + z)
      camera.lookAt(target)
      if (camera instanceof THREE.OrthographicCamera) {
        camera.zoom = Math.max(8, 700 / (span * 1.4))
        camera.updateProjectionMatrix()
      }
      const controls = controlsRef.current
      if (controls) {
        controls.target.copy(target)
        controls.update()
      }
    }

    switch (preset) {
      case 'top':
        place(0, distance, 0.001, new THREE.Vector3(0, 0, -1))
        break
      case 'front':
        place(0, span * 0.5 + 1.5, distance, new THREE.Vector3(0, 1, 0))
        break
      case 'side':
        place(distance, span * 0.5 + 1.5, 0, new THREE.Vector3(0, 1, 0))
        break
      case 'iso':
      case 'fit':
      default:
        place(distance * 0.7, distance * 0.65, distance * 0.7, new THREE.Vector3(0, 1, 0))
        break
    }
    // Only react to explicit camera commands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraCommand.nonce])

  return (
    <>
      {cameraMode === 'perspective' ? (
        <PerspectiveCamera makeDefault fov={55} near={0.05} far={500} position={[9, 8, 11]} />
      ) : (
        <OrthographicCamera makeDefault near={-200} far={500} zoom={55} position={[9, 8, 11]} />
      )}
      {firstPerson ? (
        <FirstPersonRig />
      ) : (
        <OrbitControls
          ref={controlsRef as never}
          makeDefault
          enableDamping
          dampingFactor={0.12}
          maxPolarAngle={Math.PI / 2 - 0.01}
          minDistance={0.6}
          maxDistance={200}
        />
      )}
    </>
  )
}

const EYE_HEIGHT = 1.62

/** WASD + mouse-look walkthrough. */
function FirstPersonRig() {
  const house = useStore((s) => s.house)
  const { camera } = useThree()
  const keys = useRef<Record<string, boolean>>({})

  useEffect(() => {
    const start = house.rooms[0]
    camera.up.set(0, 1, 0)
    if (start) {
      const center = start.polygon.reduce(
        (acc, p) => ({ x: acc.x + p.x / start.polygon.length, y: acc.y + p.y / start.polygon.length }),
        { x: 0, y: 0 },
      )
      camera.position.set(center.x, EYE_HEIGHT, center.y)
    } else {
      camera.position.set(0, EYE_HEIGHT, 0)
    }
    camera.lookAt(camera.position.x, EYE_HEIGHT, camera.position.z + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true
    }
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  useFrame((_, delta) => {
    const speed = (keys.current.ShiftLeft || keys.current.ShiftRight ? 4.2 : 2.2) * delta
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize()

    const move = new THREE.Vector3()
    if (keys.current.KeyW || keys.current.ArrowUp) move.add(forward)
    if (keys.current.KeyS || keys.current.ArrowDown) move.sub(forward)
    if (keys.current.KeyA || keys.current.ArrowLeft) move.add(right)
    if (keys.current.KeyD || keys.current.ArrowRight) move.sub(right)
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed)
      camera.position.add(move)
    }
    camera.position.y = EYE_HEIGHT
  })

  return <PointerLockControls makeDefault />
}
