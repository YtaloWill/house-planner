/** Small colour helpers so procedural models can derive detail colours. */

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)))
}

export function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

export function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((c) => clamp255(c).toString(16).padStart(2, '0')).join('')}`
}

/** amount > 0 lightens, amount < 0 darkens. Range roughly -1..1. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex)
  const target = amount >= 0 ? 255 : 0
  const k = Math.abs(amount)
  return toHex([r + (target - r) * k, g + (target - g) * k, b + (target - b) * k])
}

export function mix(a: string, b: string, t = 0.5): string {
  const [r1, g1, b1] = parseHex(a)
  const [r2, g2, b2] = parseHex(b)
  return toHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t])
}

export const MATERIAL_COLORS = {
  wood: '#a9794f',
  darkWood: '#6b4a2f',
  metal: '#b9bdc2',
  steel: '#8d9398',
  white: '#f3f3f1',
  ceramic: '#fafafa',
  fabric: '#7d8794',
  black: '#2b2d31',
  glass: '#bcd4e0',
}

export const MATERIAL_OPTIONS: { id: string; label: string; color: string }[] = [
  { id: 'wood', label: 'Wood', color: MATERIAL_COLORS.wood },
  { id: 'darkWood', label: 'Dark wood', color: MATERIAL_COLORS.darkWood },
  { id: 'white', label: 'White', color: MATERIAL_COLORS.white },
  { id: 'metal', label: 'Metal', color: MATERIAL_COLORS.metal },
  { id: 'fabric', label: 'Fabric', color: MATERIAL_COLORS.fabric },
  { id: 'black', label: 'Charcoal', color: MATERIAL_COLORS.black },
]

export const WALL_COLORS = ['#e8e4dd', '#f5f3ee', '#d9d3c7', '#c9d6d3', '#dcd3d8', '#b9c3c9']
export const FLOOR_COLORS = ['#d8cfc0', '#c9b79a', '#b9c7c4', '#d2d2d2', '#cbbfae', '#9fa8ad']
