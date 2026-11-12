import { Canvas } from '@react-three/fiber'
import { Grid } from '@react-three/drei'
import { useStore } from '../store/useStore'
import { CameraRig } from './CameraRig'
import { Walls3D } from './Walls3D'
import { Floors3D, Roof3D } from './Floors3D'
import { Furniture3D } from './Furniture3D'
import { PlacementLayer } from './PlacementLayer'

export function Scene3D() {
  const select = useStore((s) => s.select)
  const grid = useStore((s) => s.grid)
  const firstPerson = useStore((s) => s.firstPerson)
  const placing = useStore((s) => s.placing)
  const view = useStore((s) => s.view)

  return (
    <Canvas
      shadows
      frameloop={view === '3d' ? 'always' : 'never'}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onPointerMissed={() => {
        if (!placing) select({ kind: 'none' })
      }}
      className={placing ? 'placing' : undefined}
    >
      <color attach="background" args={['#eef1f4']} />
      <fog attach="fog" args={['#eef1f4', 40, 160]} />

      <hemisphereLight args={['#ffffff', '#b9b2a6', 0.55]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[12, 18, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <directionalLight position={[-10, 8, -12]} intensity={0.35} />

      <CameraRig />

      {grid.show && !firstPerson && (
        <Grid
          args={[80, 80]}
          cellSize={grid.size > 0 ? grid.size : 0.5}
          cellThickness={0.5}
          cellColor="#c9ccd1"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#9aa0a8"
          infiniteGrid
          fadeDistance={70}
          followCamera={false}
          position={[0, -0.02, 0]}
        />
      )}

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#e3e6e9" roughness={1} />
      </mesh>

      <Floors3D />
      <Walls3D />
      <Roof3D />
      <Furniture3D />
      <PlacementLayer />
    </Canvas>
  )
}
