import type { ReactNode } from 'react'

export type P3 = [number, number, number]

export interface SurfaceProps {
  color: string
  rough?: number
  metal?: number
  opacity?: number
  emissive?: string
}

/** Box primitive: p is the centre of the box. */
export function B({
  p,
  s,
  color,
  rough = 0.75,
  metal = 0,
  opacity,
  emissive,
  rot,
}: SurfaceProps & { p: P3; s: P3; rot?: P3 }) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.6 : 0}
      />
    </mesh>
  )
}

/** Cylinder primitive: p is the centre, height along local Y unless rotated. */
export function Cy({
  p,
  r,
  rTop,
  len,
  color,
  rough = 0.6,
  metal = 0,
  opacity,
  rot,
  segments = 20,
  emissive,
}: SurfaceProps & {
  p: P3
  r: number
  rTop?: number
  len: number
  rot?: P3
  segments?: number
}) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, len, segments]} />
      <meshStandardMaterial
        color={color}
        roughness={rough}
        metalness={metal}
        transparent={opacity !== undefined && opacity < 1}
        opacity={opacity ?? 1}
        emissive={emissive ?? '#000000'}
        emissiveIntensity={emissive ? 0.6 : 0}
      />
    </mesh>
  )
}

export function Sp({
  p,
  r,
  color,
  rough = 0.5,
  metal = 0,
  scale,
}: SurfaceProps & { p: P3; r: number; scale?: P3 }) {
  return (
    <mesh position={p} scale={scale} castShadow receiveShadow>
      <sphereGeometry args={[r, 20, 14]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

export function Torus({
  p,
  r,
  tube,
  color,
  rough = 0.5,
  metal = 0,
  rot,
}: SurfaceProps & { p: P3; r: number; tube: number; rot?: P3 }) {
  return (
    <mesh position={p} rotation={rot} castShadow receiveShadow>
      <torusGeometry args={[r, tube, 10, 24]} />
      <meshStandardMaterial color={color} roughness={rough} metalness={metal} />
    </mesh>
  )
}

/** Four legs inset from the corners of a w×d footprint. */
export function Legs({
  w,
  d,
  height,
  thickness,
  inset = 0.04,
  color,
  round = false,
}: {
  w: number
  d: number
  height: number
  thickness: number
  inset?: number
  color: string
  round?: boolean
}) {
  const x = w / 2 - thickness / 2 - inset
  const z = d / 2 - thickness / 2 - inset
  const spots: [number, number][] = [
    [x, z],
    [-x, z],
    [x, -z],
    [-x, -z],
  ]
  return (
    <>
      {spots.map(([lx, lz], i) =>
        round ? (
          <Cy key={i} p={[lx, height / 2, lz]} r={thickness / 2} len={height} color={color} />
        ) : (
          <B key={i} p={[lx, height / 2, lz]} s={[thickness, height, thickness]} color={color} />
        ),
      )}
    </>
  )
}

/** A simple handle bar standing off a front face at z. */
export function Handle({
  p,
  len,
  thickness = 0.022,
  color,
  vertical = false,
}: {
  p: P3
  len: number
  thickness?: number
  color: string
  vertical?: boolean
}) {
  return (
    <Cy
      p={p}
      r={thickness}
      len={len}
      color={color}
      metal={0.8}
      rough={0.3}
      rot={vertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}
    />
  )
}

export function Group({ children, p, rot }: { children: ReactNode; p?: P3; rot?: P3 }) {
  return (
    <group position={p} rotation={rot}>
      {children}
    </group>
  )
}
