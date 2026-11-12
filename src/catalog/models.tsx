/**
 * Procedural furniture models.
 *
 * Every model is built from reusable primitives and is parameterised by the
 * object's width/height/depth, so resizing keeps the proportions sensible.
 * Local space: origin at the centre of the footprint, y = 0 at the floor,
 * the "front" of an object faces +Z.
 */
import type { ReactElement } from 'react'
import { B, Cy, Handle, Legs, Sp, Torus } from './primitives'
import { MATERIAL_COLORS, mix, shade } from './palette'

export interface ModelProps {
  w: number
  h: number
  d: number
  color: string
}

const C = MATERIAL_COLORS

/* ------------------------------------------------------------- living room */

function Sofa({ w, h, d, color }: ModelProps) {
  const legH = h * 0.12
  const seatH = h * 0.45
  const armW = Math.min(0.2, w * 0.12)
  const backT = Math.min(0.2, d * 0.22)
  const frame = shade(color, -0.25)
  const cushions = Math.max(2, Math.round(w / 0.85))
  const innerW = w - armW * 2
  const cushionW = innerW / cushions
  return (
    <group>
      <Legs w={w} d={d} height={legH} thickness={0.07} color={C.darkWood} inset={0.06} />
      {/* seat base */}
      <B p={[0, legH + (seatH - legH) / 2, 0]} s={[w, seatH - legH, d]} color={frame} />
      {/* seat cushions */}
      {Array.from({ length: cushions }).map((_, i) => (
        <B
          key={i}
          p={[
            -innerW / 2 + cushionW * (i + 0.5),
            seatH + h * 0.07,
            (backT - 0.02) / 2,
          ]}
          s={[cushionW * 0.95, h * 0.16, d - backT - 0.04]}
          color={color}
          rough={0.95}
        />
      ))}
      {/* backrest */}
      <B p={[0, (h * 0.55) / 2 + seatH * 0.6, -d / 2 + backT / 2]} s={[w, h - seatH * 0.6, backT]} color={color} rough={0.95} />
      {/* back cushions */}
      {Array.from({ length: cushions }).map((_, i) => (
        <B
          key={`bc${i}`}
          p={[-innerW / 2 + cushionW * (i + 0.5), seatH + h * 0.26, -d / 2 + backT + 0.05]}
          s={[cushionW * 0.92, h * 0.3, 0.12]}
          color={shade(color, 0.08)}
          rough={0.95}
        />
      ))}
      {/* armrests */}
      {[-1, 1].map((s) => (
        <B
          key={s}
          p={[s * (w / 2 - armW / 2), legH + (h * 0.62 - legH) / 2, 0]}
          s={[armW, h * 0.62 - legH, d]}
          color={shade(color, -0.08)}
          rough={0.9}
        />
      ))}
    </group>
  )
}

function Armchair(props: ModelProps) {
  return <Sofa {...props} />
}

function CoffeeTable({ w, h, d, color }: ModelProps) {
  const topT = Math.min(0.06, h * 0.14)
  return (
    <group>
      <Legs w={w} d={d} height={h - topT} thickness={0.06} color={shade(color, -0.2)} inset={0.05} />
      <B p={[0, h - topT / 2, 0]} s={[w, topT, d]} color={color} rough={0.5} />
      {/* lower shelf */}
      <B p={[0, h * 0.3, 0]} s={[w * 0.82, 0.03, d * 0.7]} color={shade(color, -0.12)} />
    </group>
  )
}

function Tv({ w, h, d, color }: ModelProps) {
  const panelT = Math.max(0.02, d * 0.35)
  const standH = h * 0.1
  return (
    <group>
      {/* screen bezel + screen */}
      <B p={[0, standH + (h - standH) / 2, 0]} s={[w, h - standH, panelT]} color={color} rough={0.4} />
      <B
        p={[0, standH + (h - standH) / 2, panelT / 2 + 0.003]}
        s={[w * 0.96, (h - standH) * 0.94, 0.006]}
        color="#11151c"
        rough={0.15}
        metal={0.2}
      />
      {/* neck + foot */}
      <B p={[0, standH * 0.75, 0]} s={[w * 0.1, standH * 1.5, panelT]} color={shade(color, 0.1)} />
      <B p={[0, standH * 0.15, 0]} s={[w * 0.45, standH * 0.3, Math.max(0.12, d)]} color={shade(color, 0.1)} />
    </group>
  )
}

function TvStand({ w, h, d, color }: ModelProps) {
  const legH = h * 0.14
  const body = h - legH
  const doors = Math.max(2, Math.round(w / 0.6))
  const doorW = (w - 0.04) / doors
  return (
    <group>
      <Legs w={w} d={d} height={legH} thickness={0.05} color={shade(color, -0.3)} inset={0.05} />
      <B p={[0, legH + body / 2, 0]} s={[w, body, d]} color={color} rough={0.6} />
      {Array.from({ length: doors }).map((_, i) => (
        <group key={i}>
          <B
            p={[-w / 2 + 0.02 + doorW * (i + 0.5), legH + body / 2, d / 2 + 0.008]}
            s={[doorW * 0.94, body * 0.86, 0.016]}
            color={shade(color, 0.12)}
            rough={0.5}
          />
          <Handle
            p={[-w / 2 + 0.02 + doorW * (i + 0.5), legH + body / 2, d / 2 + 0.035]}
            len={doorW * 0.4}
            color={C.metal}
          />
        </group>
      ))}
      <B p={[0, h - 0.012, 0]} s={[w + 0.03, 0.024, d + 0.02]} color={shade(color, 0.05)} rough={0.5} />
    </group>
  )
}

function Bookshelf({ w, h, d, color }: ModelProps) {
  const side = 0.03
  const shelves = Math.max(3, Math.round(h / 0.38))
  const bookColors = ['#8d4d44', '#4a6076', '#7a7f52', '#9a7b4f', '#56544f']
  return (
    <group>
      {[-1, 1].map((s) => (
        <B key={s} p={[s * (w / 2 - side / 2), h / 2, 0]} s={[side, h, d]} color={color} />
      ))}
      <B p={[0, h / 2, -d / 2 + 0.008]} s={[w - side * 2, h, 0.016]} color={shade(color, -0.2)} />
      {Array.from({ length: shelves + 1 }).map((_, i) => {
        const y = (h / shelves) * i
        return (
          <B
            key={i}
            p={[0, Math.min(h - 0.01, Math.max(0.01, y)), 0]}
            s={[w - side * 2, 0.025, d - 0.02]}
            color={shade(color, 0.08)}
          />
        )
      })}
      {/* a few books for scale and recognisability */}
      {Array.from({ length: shelves }).map((_, i) => {
        const y = (h / shelves) * i
        const bookH = Math.min((h / shelves) * 0.7, 0.26)
        const count = Math.max(2, Math.floor((w - 0.1) / 0.06))
        return Array.from({ length: count }).map((__, j) => {
          if ((i + j) % 3 === 0) return null
          return (
            <B
              key={`${i}-${j}`}
              p={[-w / 2 + 0.06 + j * 0.055, y + 0.0125 + bookH / 2, 0]}
              s={[0.04, bookH, d * 0.7]}
              color={bookColors[(i + j) % bookColors.length]}
              rough={0.9}
            />
          )
        })
      })}
    </group>
  )
}

function FloorLamp({ w, h, color }: ModelProps) {
  const shadeH = Math.min(0.34, h * 0.22)
  const baseR = Math.min(w / 2, 0.2)
  return (
    <group>
      <Cy p={[0, 0.015, 0]} r={baseR} len={0.03} color={C.steel} metal={0.7} rough={0.35} />
      <Cy p={[0, h / 2, 0]} r={0.016} len={h - shadeH} color={C.steel} metal={0.8} rough={0.3} />
      <Cy
        p={[0, h - shadeH / 2, 0]}
        r={baseR * 1.1}
        rTop={baseR * 0.75}
        len={shadeH}
        color={color}
        rough={0.9}
        emissive={shade(color, 0.3)}
      />
      <Sp p={[0, h - shadeH - 0.04, 0]} r={0.045} color="#fff6da" rough={0.2} />
    </group>
  )
}

function Rug({ w, h, d, color }: ModelProps) {
  const t = Math.max(0.012, h)
  return (
    <group>
      <B p={[0, t / 2, 0]} s={[w, t, d]} color={color} rough={1} />
      <B p={[0, t + 0.002, 0]} s={[w * 0.86, 0.004, d * 0.8]} color={shade(color, 0.18)} rough={1} />
    </group>
  )
}

/* ----------------------------------------------------------------- kitchen */

function Refrigerator({ w, h, d, color }: ModelProps) {
  const freezerH = h * 0.34
  const gap = 0.012
  const panel = shade(color, 0.06)
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={shade(color, -0.1)} rough={0.4} metal={0.35} />
      {/* fridge door */}
      <B
        p={[0, freezerH + (h - freezerH) / 2 + gap / 2, d / 2 + 0.01]}
        s={[w - 0.02, h - freezerH - gap, 0.02]}
        color={panel}
        rough={0.35}
        metal={0.45}
      />
      {/* freezer door */}
      <B p={[0, freezerH / 2 - gap / 2, d / 2 + 0.01]} s={[w - 0.02, freezerH - gap, 0.02]} color={panel} rough={0.35} metal={0.45} />
      {/* handles */}
      <Handle p={[w / 2 - 0.08, freezerH + (h - freezerH) * 0.55, d / 2 + 0.04]} len={Math.min(0.5, (h - freezerH) * 0.5)} color={C.metal} vertical />
      <Handle p={[w / 2 - 0.08, freezerH * 0.6, d / 2 + 0.04]} len={freezerH * 0.5} color={C.metal} vertical />
      <B p={[0, 0.02, 0]} s={[w * 0.96, 0.04, d * 0.9]} color={C.black} />
    </group>
  )
}

function CabinetBody({
  w,
  h,
  d,
  color,
  plinth = 0.08,
  doors,
  handleColor = C.metal,
}: ModelProps & { plinth?: number; doors?: number; handleColor?: string }) {
  const n = doors ?? Math.max(1, Math.round(w / 0.5))
  const doorW = (w - 0.02) / n
  const bodyH = h - plinth
  return (
    <group>
      {plinth > 0 && <B p={[0, plinth / 2, -0.01]} s={[w * 0.96, plinth, d * 0.92]} color={C.black} />}
      <B p={[0, plinth + bodyH / 2, 0]} s={[w, bodyH, d]} color={shade(color, -0.1)} rough={0.6} />
      {Array.from({ length: n }).map((_, i) => {
        const cx = -w / 2 + 0.01 + doorW * (i + 0.5)
        return (
          <group key={i}>
            <B p={[cx, plinth + bodyH / 2, d / 2 + 0.01]} s={[doorW * 0.95, bodyH * 0.96, 0.02]} color={color} rough={0.5} />
            <Handle
              p={[cx + doorW * 0.32 * (i % 2 === 0 ? 1 : -1), plinth + bodyH * 0.55, d / 2 + 0.04]}
              len={Math.min(0.12, bodyH * 0.3)}
              color={handleColor}
              vertical
            />
          </group>
        )
      })}
    </group>
  )
}

function KitchenCabinet(props: ModelProps) {
  return <CabinetBody {...props} />
}

function WallCabinet({ w, h, d, color }: ModelProps) {
  return <CabinetBody w={w} h={h} d={d} color={color} plinth={0} />
}

function Countertop({ w, h, d, color }: ModelProps) {
  const topT = 0.04
  const base = h - topT
  return (
    <group>
      <CabinetBody w={w - 0.02} h={base} d={d - 0.04} color={shade(color, -0.04)} />
      <B p={[0, h - topT / 2, 0.01]} s={[w, topT, d]} color={shade(color, 0.18)} rough={0.35} />
      {/* backsplash */}
      <B p={[0, h + 0.07, -d / 2 + 0.01]} s={[w, 0.14, 0.02]} color={shade(color, 0.25)} rough={0.4} />
    </group>
  )
}

function Faucet({ x, y, z, height = 0.28, reach = 0.16 }: { x: number; y: number; z: number; height?: number; reach?: number }) {
  return (
    <group position={[x, y, z]}>
      <Cy p={[0, height / 2, 0]} r={0.018} len={height} color={C.metal} metal={0.9} rough={0.2} />
      <Cy p={[0, height, reach / 2]} r={0.015} len={reach} color={C.metal} metal={0.9} rough={0.2} rot={[Math.PI / 2, 0, 0]} />
      <Cy p={[0, height - 0.03, reach]} r={0.012} len={0.06} color={C.metal} metal={0.9} rough={0.2} />
      <B p={[0.07, height * 0.55, 0]} s={[0.08, 0.016, 0.016]} color={C.metal} metal={0.9} rough={0.2} />
    </group>
  )
}

function KitchenSink({ w, h, d, color }: ModelProps) {
  const topT = 0.04
  const base = h - topT
  const basinW = Math.min(w * 0.62, 0.55)
  const basinD = Math.min(d * 0.62, 0.42)
  return (
    <group>
      <CabinetBody w={w - 0.02} h={base} d={d - 0.04} color="#e6e3dd" />
      <B p={[0, h - topT / 2, 0]} s={[w, topT, d]} color={shade(color, 0.1)} rough={0.3} metal={0.5} />
      {/* basin recess */}
      <B p={[0, h - topT - 0.06, 0.02]} s={[basinW, 0.16, basinD]} color={shade(color, -0.25)} rough={0.25} metal={0.6} />
      <B p={[0, h - topT + 0.001, 0.02]} s={[basinW - 0.03, 0.01, basinD - 0.03]} color={shade(color, -0.35)} rough={0.25} metal={0.6} />
      <Faucet x={0} y={h} z={-d / 2 + 0.08} />
    </group>
  )
}

function Stove({ w, h, d, color }: ModelProps) {
  const topT = 0.03
  const panelH = 0.1
  const body = h - topT - panelH
  return (
    <group>
      <B p={[0, body / 2, 0]} s={[w, body, d]} color={shade(color, -0.12)} rough={0.4} metal={0.4} />
      {/* oven door + window */}
      <B p={[0, body * 0.5, d / 2 + 0.012]} s={[w - 0.04, body * 0.78, 0.024]} color={color} rough={0.35} metal={0.5} />
      <B p={[0, body * 0.55, d / 2 + 0.028]} s={[w - 0.16, body * 0.42, 0.01]} color="#20242b" rough={0.1} metal={0.2} />
      <Handle p={[0, body * 0.95, d / 2 + 0.05]} len={w - 0.08} color={C.metal} />
      {/* control panel */}
      <B p={[0, body + panelH / 2, 0]} s={[w, panelH, d]} color={shade(color, -0.2)} rough={0.4} metal={0.4} />
      {[-0.3, -0.1, 0.1, 0.3].map((f, i) => (
        <Cy key={i} p={[f * w, body + panelH / 2, d / 2 + 0.02]} r={0.022} len={0.03} color={C.black} rot={[Math.PI / 2, 0, 0]} />
      ))}
      {/* cooktop + burners */}
      <B p={[0, h - topT / 2, 0]} s={[w, topT, d]} color="#2a2d33" rough={0.25} metal={0.3} />
      {[
        [-0.23, -0.2],
        [0.23, -0.2],
        [-0.23, 0.22],
        [0.23, 0.22],
      ].map(([bx, bz], i) => (
        <Cy
          key={i}
          p={[bx * w, h + 0.004, bz * d]}
          r={Math.min(w, d) * (i < 2 ? 0.16 : 0.13)}
          len={0.012}
          color="#15181d"
          rough={0.4}
        />
      ))}
    </group>
  )
}

function Microwave({ w, h, d, color }: ModelProps) {
  const panelW = w * 0.26
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={shade(color, -0.1)} rough={0.4} metal={0.3} />
      <B p={[-panelW / 2, h / 2, d / 2 + 0.008]} s={[w - panelW, h * 0.84, 0.016]} color="#1c2027" rough={0.15} metal={0.2} />
      <B p={[w / 2 - panelW / 2, h / 2, d / 2 + 0.008]} s={[panelW * 0.9, h * 0.84, 0.016]} color={shade(color, 0.1)} rough={0.5} />
      <B p={[w / 2 - panelW / 2, h * 0.68, d / 2 + 0.02]} s={[panelW * 0.6, h * 0.16, 0.006]} color="#5de0a0" rough={0.3} emissive="#2fa36f" />
      <Handle p={[-panelW + w * 0.06, h / 2, d / 2 + 0.035]} len={h * 0.6} color={C.metal} vertical />
    </group>
  )
}

function Dishwasher({ w, h, d, color }: ModelProps) {
  const panelH = 0.07
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={shade(color, -0.15)} rough={0.45} metal={0.35} />
      <B p={[0, (h - panelH) / 2, d / 2 + 0.012]} s={[w - 0.02, h - panelH, 0.024]} color={color} rough={0.35} metal={0.5} />
      <B p={[0, h - panelH / 2, d / 2 + 0.012]} s={[w - 0.02, panelH, 0.024]} color={shade(color, -0.3)} rough={0.4} />
      {[-0.25, -0.1, 0.05].map((f, i) => (
        <B key={i} p={[f * w, h - panelH / 2, d / 2 + 0.026]} s={[0.03, 0.012, 0.004]} color="#7fe3c0" emissive="#35a37c" />
      ))}
      <Handle p={[0, h - panelH - 0.05, d / 2 + 0.05]} len={w * 0.7} color={C.metal} />
    </group>
  )
}

function DiningTable({ w, h, d, color }: ModelProps) {
  const topT = 0.045
  return (
    <group>
      <B p={[0, h - topT / 2, 0]} s={[w, topT, d]} color={color} rough={0.5} />
      <B p={[0, h - topT - 0.035, 0]} s={[w - 0.16, 0.05, d - 0.16]} color={shade(color, -0.15)} />
      <Legs w={w - 0.1} d={d - 0.1} height={h - topT - 0.06} thickness={0.07} color={shade(color, -0.2)} inset={0.02} />
    </group>
  )
}

function DiningChair({ w, h, d, color }: ModelProps) {
  const seatH = h * 0.48
  const seatT = 0.05
  return (
    <group>
      <Legs w={w} d={d} height={seatH - seatT} thickness={0.045} color={shade(color, -0.15)} inset={0.03} />
      <B p={[0, seatH - seatT / 2, 0]} s={[w, seatT, d]} color={color} rough={0.7} />
      {/* back posts + rails */}
      {[-1, 1].map((s) => (
        <B key={s} p={[s * (w / 2 - 0.035), seatH + (h - seatH) / 2, -d / 2 + 0.03]} s={[0.045, h - seatH, 0.045]} color={shade(color, -0.1)} />
      ))}
      <B p={[0, h - 0.06, -d / 2 + 0.03]} s={[w - 0.05, 0.08, 0.04]} color={shade(color, -0.05)} />
      <B p={[0, seatH + (h - seatH) * 0.45, -d / 2 + 0.03]} s={[w - 0.05, 0.06, 0.035]} color={shade(color, -0.05)} />
    </group>
  )
}

/* ----------------------------------------------------------------- bedroom */

function Bed({ w, h, d, color, pillows }: ModelProps & { pillows: number }) {
  const frameH = h * 0.32
  const mattressH = h * 0.26
  const headH = h
  const linen = mix(color, '#ffffff', 0.55)
  return (
    <group>
      {/* frame */}
      <B p={[0, frameH / 2, 0]} s={[w, frameH, d]} color={shade(C.darkWood, 0.05)} rough={0.7} />
      <Legs w={w} d={d} height={frameH * 0.5} thickness={0.07} color={C.darkWood} inset={0.03} />
      {/* mattress + duvet */}
      <B p={[0, frameH + mattressH / 2, 0]} s={[w - 0.06, mattressH, d - 0.06]} color="#f2efe8" rough={0.95} />
      <B p={[0, frameH + mattressH + 0.035, d * 0.12]} s={[w - 0.04, 0.07, d * 0.72]} color={color} rough={0.95} />
      <B p={[0, frameH + mattressH + 0.02, -d / 2 + d * 0.16]} s={[w - 0.04, 0.04, d * 0.1]} color={linen} rough={0.95} />
      {/* pillows */}
      {Array.from({ length: pillows }).map((_, i) => {
        const offset = pillows === 1 ? 0 : (i - (pillows - 1) / 2) * (w / pillows)
        return (
          <B
            key={i}
            p={[offset, frameH + mattressH + 0.07, -d / 2 + 0.3]}
            s={[(w / pillows) * 0.82, 0.12, 0.4]}
            color={linen}
            rough={0.95}
          />
        )
      })}
      {/* headboard */}
      <B p={[0, headH / 2, -d / 2 - 0.03]} s={[w + 0.06, headH, 0.07]} color={C.darkWood} rough={0.6} />
      <B p={[0, headH * 0.62, -d / 2 + 0.01]} s={[w - 0.08, headH * 0.5, 0.06]} color={shade(color, -0.1)} rough={0.95} />
    </group>
  )
}

function SingleBed(props: ModelProps) {
  return <Bed {...props} pillows={1} />
}

function DoubleBed(props: ModelProps) {
  return <Bed {...props} pillows={2} />
}

function Wardrobe({ w, h, d, color }: ModelProps) {
  const plinth = 0.07
  const doors = Math.max(2, Math.round(w / 0.7))
  const doorW = (w - 0.03) / doors
  const bodyH = h - plinth
  return (
    <group>
      <B p={[0, plinth / 2, 0]} s={[w * 0.96, plinth, d * 0.94]} color={C.black} />
      <B p={[0, plinth + bodyH / 2, 0]} s={[w, bodyH, d]} color={shade(color, -0.15)} rough={0.6} />
      {Array.from({ length: doors }).map((_, i) => {
        const cx = -w / 2 + 0.015 + doorW * (i + 0.5)
        const side = i % 2 === 0 ? 1 : -1
        return (
          <group key={i}>
            <B p={[cx, plinth + bodyH / 2, d / 2 + 0.012]} s={[doorW * 0.96, bodyH * 0.98, 0.024]} color={color} rough={0.5} />
            <B p={[cx, plinth + bodyH * 0.72, d / 2 + 0.028]} s={[doorW * 0.7, bodyH * 0.4, 0.008]} color={shade(color, 0.08)} rough={0.5} />
            <Handle p={[cx + side * doorW * 0.38, plinth + bodyH * 0.5, d / 2 + 0.05]} len={0.22} color={C.metal} vertical />
          </group>
        )
      })}
      <B p={[0, h - 0.015, 0]} s={[w + 0.04, 0.03, d + 0.03]} color={shade(color, 0.1)} />
    </group>
  )
}

function Nightstand({ w, h, d, color }: ModelProps) {
  const legH = h * 0.18
  const body = h - legH
  return (
    <group>
      <Legs w={w} d={d} height={legH} thickness={0.04} color={shade(color, -0.3)} inset={0.035} />
      <B p={[0, legH + body / 2, 0]} s={[w, body, d]} color={shade(color, -0.08)} rough={0.6} />
      {[0, 1].map((i) => (
        <group key={i}>
          <B
            p={[0, legH + body * (i === 0 ? 0.27 : 0.73), d / 2 + 0.01]}
            s={[w * 0.9, body * 0.4, 0.02]}
            color={color}
            rough={0.5}
          />
          <Sp p={[0, legH + body * (i === 0 ? 0.27 : 0.73), d / 2 + 0.035]} r={0.022} color={C.metal} metal={0.8} rough={0.25} />
        </group>
      ))}
      <B p={[0, h - 0.012, 0]} s={[w + 0.02, 0.024, d + 0.02]} color={shade(color, 0.08)} rough={0.45} />
    </group>
  )
}

function Desk({ w, h, d, color }: ModelProps) {
  const topT = 0.04
  const drawerW = Math.min(0.42, w * 0.32)
  return (
    <group>
      <B p={[0, h - topT / 2, 0]} s={[w, topT, d]} color={color} rough={0.5} />
      {/* left panel leg */}
      <B p={[-w / 2 + 0.03, (h - topT) / 2, 0]} s={[0.05, h - topT, d - 0.04]} color={shade(color, -0.2)} />
      {/* drawer unit on the right */}
      <B p={[w / 2 - drawerW / 2 - 0.02, (h - topT) / 2, 0]} s={[drawerW, h - topT, d - 0.04]} color={shade(color, -0.12)} />
      {[0.22, 0.5, 0.78].map((f, i) => (
        <group key={i}>
          <B p={[w / 2 - drawerW / 2 - 0.02, (h - topT) * f, d / 2 - 0.01]} s={[drawerW * 0.9, (h - topT) * 0.24, 0.02]} color={color} rough={0.5} />
          <Handle p={[w / 2 - drawerW / 2 - 0.02, (h - topT) * f, d / 2 + 0.015]} len={drawerW * 0.45} color={C.metal} />
        </group>
      ))}
      {/* modesty panel */}
      <B p={[-w * 0.1, h * 0.62, -d / 2 + 0.04]} s={[w * 0.6, h * 0.3, 0.025]} color={shade(color, -0.18)} />
    </group>
  )
}

function DeskChair({ w, h, d, color }: ModelProps) {
  const seatH = h * 0.5
  const baseR = Math.min(w, d) / 2
  return (
    <group>
      {/* 5-star base with casters */}
      {Array.from({ length: 5 }).map((_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i}>
            <B
              p={[Math.cos(a) * baseR * 0.5, 0.05, Math.sin(a) * baseR * 0.5]}
              s={[baseR, 0.03, 0.05]}
              color={shade(color, 0.1)}
              rot={[0, -a, 0]}
            />
            <Cy p={[Math.cos(a) * baseR, 0.025, Math.sin(a) * baseR]} r={0.025} len={0.03} color="#1b1d22" rot={[Math.PI / 2, 0, 0]} />
          </group>
        )
      })}
      <Cy p={[0, seatH * 0.6, 0]} r={0.035} len={seatH * 0.8} color={C.steel} metal={0.7} rough={0.3} />
      <B p={[0, seatH, 0]} s={[w, 0.09, d]} color={color} rough={0.85} />
      <B p={[0, seatH + h * 0.22, -d / 2 + 0.05]} s={[w * 0.92, h * 0.4, 0.08]} color={color} rough={0.85} />
      {[-1, 1].map((s) => (
        <B key={s} p={[s * (w / 2 + 0.01), seatH + 0.11, 0]} s={[0.04, 0.16, d * 0.6]} color="#2b2d31" />
      ))}
    </group>
  )
}

function Dresser({ w, h, d, color }: ModelProps) {
  const legH = h * 0.1
  const body = h - legH
  const rows = 3
  const cols = Math.max(1, Math.round(w / 0.6))
  return (
    <group>
      <Legs w={w} d={d} height={legH} thickness={0.05} color={shade(color, -0.3)} inset={0.04} />
      <B p={[0, legH + body / 2, 0]} s={[w, body, d]} color={shade(color, -0.1)} rough={0.6} />
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const cellW = (w - 0.04) / cols
          const cx = -w / 2 + 0.02 + cellW * (c + 0.5)
          const cy = legH + (body / rows) * (r + 0.5)
          return (
            <group key={`${r}-${c}`}>
              <B p={[cx, cy, d / 2 + 0.01]} s={[cellW * 0.93, (body / rows) * 0.86, 0.02]} color={color} rough={0.5} />
              <Handle p={[cx, cy, d / 2 + 0.035]} len={cellW * 0.4} color={C.metal} />
            </group>
          )
        }),
      )}
      <B p={[0, h - 0.015, 0]} s={[w + 0.025, 0.03, d + 0.02]} color={shade(color, 0.1)} rough={0.45} />
    </group>
  )
}

/* ---------------------------------------------------------------- bathroom */

function Toilet({ w, h, d, color }: ModelProps) {
  const tankH = h * 0.52
  const bowlH = h * 0.42
  return (
    <group>
      {/* cistern against the back */}
      <B p={[0, h - tankH / 2, -d / 2 + 0.09]} s={[w, tankH, 0.18]} color={color} rough={0.25} />
      <B p={[0, h - 0.01, -d / 2 + 0.09]} s={[w + 0.02, 0.02, 0.2]} color={shade(color, -0.05)} rough={0.25} />
      <B p={[w * 0.25, h - 0.03, -d / 2 + 0.02]} s={[0.05, 0.02, 0.04]} color={C.metal} metal={0.8} rough={0.2} />
      {/* pedestal + bowl */}
      <B p={[0, bowlH * 0.35, -d * 0.12]} s={[w * 0.5, bowlH * 0.7, d * 0.3]} color={color} rough={0.25} />
      <Cy p={[0, bowlH * 0.8, d * 0.08]} r={Math.min(w, d * 0.7) / 2} len={bowlH * 0.42} color={color} rough={0.25} segments={24} />
      {/* seat + lid */}
      <Torus p={[0, bowlH + 0.015, d * 0.08]} r={Math.min(w, d * 0.7) / 2 - 0.03} tube={0.028} color={shade(color, -0.04)} rot={[Math.PI / 2, 0, 0]} />
      <B p={[0, bowlH + 0.03, -d * 0.22]} s={[w * 0.85, 0.035, d * 0.18]} color={shade(color, -0.02)} rough={0.3} />
    </group>
  )
}

function BathroomSink({ w, h, d, color }: ModelProps) {
  const basinH = 0.16
  return (
    <group>
      {/* pedestal */}
      <Cy p={[0, (h - basinH) / 2, -d * 0.05]} r={Math.min(w, d) * 0.19} len={h - basinH} color={color} rough={0.25} segments={20} />
      {/* basin */}
      <B p={[0, h - basinH / 2, 0]} s={[w, basinH, d]} color={color} rough={0.2} />
      <B p={[0, h - basinH * 0.35, 0.01]} s={[w - 0.12, basinH * 0.6, d - 0.1]} color={shade(color, -0.12)} rough={0.2} />
      <Cy p={[0, h - basinH * 0.75, 0.01]} r={0.022} len={0.02} color={C.metal} metal={0.9} rough={0.2} />
      <Faucet x={0} y={h} z={-d / 2 + 0.06} height={0.22} reach={0.14} />
    </group>
  )
}

function BathroomCabinet({ w, h, d, color }: ModelProps) {
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={shade(color, -0.08)} rough={0.5} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <B p={[s * w * 0.25, h / 2, d / 2 + 0.008]} s={[w * 0.47, h * 0.94, 0.016]} color={color} rough={0.4} />
          <Handle p={[s * w * 0.06, h / 2, d / 2 + 0.03]} len={h * 0.3} color={C.metal} vertical />
        </group>
      ))}
    </group>
  )
}

function Shower({ w, h, d, color }: ModelProps) {
  const trayH = 0.12
  const frame = C.metal
  return (
    <group>
      <B p={[0, trayH / 2, 0]} s={[w, trayH, d]} color="#eceae5" rough={0.3} />
      <B p={[0, trayH, 0]} s={[w - 0.06, 0.012, d - 0.06]} color="#dfdcd6" rough={0.4} />
      {/* back + side wall panels */}
      <B p={[0, trayH + (h - trayH) / 2, -d / 2 + 0.01]} s={[w, h - trayH, 0.02]} color={shade(color, 0.1)} rough={0.2} opacity={0.35} />
      <B p={[-w / 2 + 0.01, trayH + (h - trayH) / 2, 0]} s={[0.02, h - trayH, d]} color={shade(color, 0.1)} rough={0.2} opacity={0.35} />
      {/* glass front with a door gap */}
      <B p={[w * 0.26, trayH + (h - trayH) / 2, d / 2 - 0.01]} s={[w * 0.48, h - trayH, 0.018]} color={color} rough={0.15} opacity={0.3} />
      {/* frame posts */}
      {[-1, 1].map((s) => (
        <Cy key={s} p={[s * (w / 2 - 0.02), trayH + (h - trayH) / 2, d / 2 - 0.01]} r={0.016} len={h - trayH} color={frame} metal={0.8} rough={0.25} />
      ))}
      <B p={[0, h - 0.02, d / 2 - 0.01]} s={[w, 0.03, 0.03]} color={frame} metal={0.8} rough={0.25} />
      {/* shower head */}
      <Cy p={[0, h - 0.25, -d / 2 + 0.12]} r={0.015} len={0.2} color={frame} metal={0.9} rough={0.2} rot={[Math.PI / 2.6, 0, 0]} />
      <Cy p={[0, h - 0.3, -d / 2 + 0.24]} r={0.09} len={0.03} color={frame} metal={0.9} rough={0.2} rot={[Math.PI / 12, 0, 0]} />
    </group>
  )
}

function Bathtub({ w, h, d, color }: ModelProps) {
  const wallT = 0.08
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={color} rough={0.25} />
      {/* inner recess */}
      <B p={[0, h - (h - 0.08) / 2 + 0.04, 0]} s={[w - wallT * 2, h - 0.1, d - wallT * 2]} color={shade(color, -0.1)} rough={0.2} />
      <B p={[0, h * 0.14, 0]} s={[w - wallT * 2, 0.02, d - wallT * 2]} color={shade(color, -0.16)} rough={0.3} />
      <Cy p={[-w / 2 + 0.16, h * 0.16, 0]} r={0.035} len={0.02} color={C.metal} metal={0.9} rough={0.2} />
      <Faucet x={-w / 2 + 0.12} y={h} z={-d / 2 + 0.06} height={0.14} reach={0.16} />
    </group>
  )
}

function Mirror({ w, h, d, color }: ModelProps) {
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, Math.max(0.02, d)]} color={shade(color, -0.4)} rough={0.5} />
      <B p={[0, h / 2, Math.max(0.02, d) / 2 + 0.004]} s={[w - 0.05, h - 0.05, 0.008]} color="#dbe7ec" rough={0.03} metal={1} />
    </group>
  )
}

/* ----------------------------------------------------------------- laundry */

function FrontLoader({ w, h, d, color, tint }: ModelProps & { tint: string }) {
  const panelH = 0.12
  const doorR = Math.min(w, h - panelH) * 0.33
  return (
    <group>
      <B p={[0, h / 2, 0]} s={[w, h, d]} color={shade(color, -0.08)} rough={0.5} />
      <B p={[0, (h - panelH) * 0.48, d / 2 + 0.008]} s={[w - 0.02, h - panelH, 0.016]} color={color} rough={0.4} />
      {/* door */}
      <Cy p={[0, (h - panelH) * 0.46, d / 2 + 0.03]} r={doorR} len={0.05} color={shade(color, -0.12)} rot={[Math.PI / 2, 0, 0]} segments={28} />
      <Cy p={[0, (h - panelH) * 0.46, d / 2 + 0.055]} r={doorR * 0.78} len={0.02} color={tint} rough={0.1} opacity={0.55} rot={[Math.PI / 2, 0, 0]} segments={28} />
      {/* control panel */}
      <B p={[0, h - panelH / 2, d / 2 + 0.008]} s={[w - 0.02, panelH, 0.016]} color={shade(color, -0.25)} rough={0.45} />
      <Cy p={[w * 0.3, h - panelH / 2, d / 2 + 0.03]} r={0.03} len={0.02} color={C.black} rot={[Math.PI / 2, 0, 0]} />
      <B p={[-w * 0.1, h - panelH / 2, d / 2 + 0.022]} s={[w * 0.3, panelH * 0.35, 0.006]} color="#6fd3ea" emissive="#2f8ea3" />
      {/* detergent drawer */}
      <B p={[-w * 0.28, h - panelH - 0.06, d / 2 + 0.02]} s={[w * 0.36, 0.07, 0.03]} color={shade(color, 0.08)} />
    </group>
  )
}

function WashingMachine(props: ModelProps) {
  return <FrontLoader {...props} tint="#9fd4e6" />
}

function Dryer(props: ModelProps) {
  return <FrontLoader {...props} tint="#e0d6c4" />
}

function LaundrySink({ w, h, d, color }: ModelProps) {
  const basinH = h * 0.42
  return (
    <group>
      {/* tubular stand */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <Cy
            key={`${sx}${sz}`}
            p={[sx * (w / 2 - 0.05), (h - basinH) / 2, sz * (d / 2 - 0.05)]}
            r={0.018
            }
            len={h - basinH}
            color={C.steel}
            metal={0.7}
            rough={0.35}
          />
        )),
      )}
      <B p={[0, h - basinH / 2, 0]} s={[w, basinH, d]} color={color} rough={0.4} />
      <B p={[0, h - basinH / 2 + 0.03, 0]} s={[w - 0.1, basinH - 0.06, d - 0.1]} color={shade(color, -0.14)} rough={0.4} />
      <Cy p={[0, h - basinH + 0.04, 0]} r={0.028} len={0.02} color={C.metal} metal={0.9} rough={0.2} />
      <Faucet x={0} y={h} z={-d / 2 + 0.05} height={0.26} reach={0.15} />
    </group>
  )
}

function StorageCabinet({ w, h, d, color }: ModelProps) {
  return <CabinetBody w={w} h={h} d={d} color={color} doors={2} plinth={0.06} />
}

function Shelves({ w, h, d, color }: ModelProps) {
  const boards = Math.max(3, Math.round(h / 0.4))
  const boxColors = ['#c9b79a', '#9aa7b1', '#bfae8f']
  return (
    <group>
      {[-1, 1].map((s) => (
        <B key={s} p={[s * (w / 2 - 0.025), h / 2, 0]} s={[0.05, h, d * 0.9]} color={shade(color, -0.2)} />
      ))}
      {Array.from({ length: boards }).map((_, i) => {
        const y = 0.06 + ((h - 0.08) / (boards - 1)) * i
        return (
          <group key={i}>
            <B p={[0, y, 0]} s={[w, 0.03, d]} color={color} rough={0.6} />
            {i % 2 === 1 && (
              <B
                p={[w * 0.18, y + 0.1, 0]}
                s={[Math.min(0.3, w * 0.4), 0.18, d * 0.7]}
                color={boxColors[i % boxColors.length]}
                rough={0.9}
              />
            )}
          </group>
        )
      })}
    </group>
  )
}

/* ---------------------------------------------------------------- registry */

function Fallback({ w, h, d, color }: ModelProps) {
  return <B p={[0, h / 2, 0]} s={[w, h, d]} color={color} />
}

export const MODELS: Record<string, (props: ModelProps) => ReactElement> = {
  sofa: Sofa,
  armchair: Armchair,
  'coffee-table': CoffeeTable,
  tv: Tv,
  'tv-stand': TvStand,
  bookshelf: Bookshelf,
  'floor-lamp': FloorLamp,
  rug: Rug,
  refrigerator: Refrigerator,
  'kitchen-cabinet': KitchenCabinet,
  'wall-cabinet': WallCabinet,
  countertop: Countertop,
  'kitchen-sink': KitchenSink,
  stove: Stove,
  microwave: Microwave,
  dishwasher: Dishwasher,
  'dining-table': DiningTable,
  'dining-chair': DiningChair,
  'single-bed': SingleBed,
  'double-bed': DoubleBed,
  wardrobe: Wardrobe,
  nightstand: Nightstand,
  desk: Desk,
  'desk-chair': DeskChair,
  dresser: Dresser,
  toilet: Toilet,
  'bathroom-sink': BathroomSink,
  'bathroom-cabinet': BathroomCabinet,
  shower: Shower,
  bathtub: Bathtub,
  mirror: Mirror,
  'washing-machine': WashingMachine,
  dryer: Dryer,
  'laundry-sink': LaundrySink,
  'storage-cabinet': StorageCabinet,
  shelves: Shelves,
}

/** Renders the procedural model for a catalog id at the given dimensions. */
export function FurnitureModel({
  catalogId,
  ...props
}: ModelProps & { catalogId: string }) {
  const Model = MODELS[catalogId] ?? Fallback
  return <Model {...props} />
}
