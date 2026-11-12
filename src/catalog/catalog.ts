import type { FurnitureCategory, RoomType } from '../types/house'
import { MATERIAL_COLORS } from './palette'

export interface CatalogItem {
  id: string
  name: string
  category: FurnitureCategory
  /** default real-world dimensions in meters */
  size: { w: number; h: number; d: number }
  color: string
  /** extra rooms where this item is also commonly used */
  alsoIn?: RoomType[]
  tags?: string[]
}

const C = MATERIAL_COLORS

export const CATALOG: CatalogItem[] = [
  /* ------------------------------------------------------------- living */
  { id: 'sofa', name: 'Sofa', category: 'living', size: { w: 2.1, h: 0.82, d: 0.9 }, color: '#6e7a88', tags: ['seating', 'couch'] },
  { id: 'armchair', name: 'Armchair', category: 'living', size: { w: 0.9, h: 0.8, d: 0.88 }, color: '#8a7b6b', alsoIn: ['bedroom'], tags: ['seating'] },
  { id: 'coffee-table', name: 'Coffee Table', category: 'living', size: { w: 1.1, h: 0.42, d: 0.6 }, color: C.wood, tags: ['table'] },
  { id: 'tv', name: 'TV', category: 'living', size: { w: 1.25, h: 0.72, d: 0.08 }, color: C.black, alsoIn: ['bedroom'], tags: ['screen', 'electronics'] },
  { id: 'tv-stand', name: 'TV Stand', category: 'living', size: { w: 1.6, h: 0.45, d: 0.4 }, color: C.darkWood, tags: ['storage'] },
  { id: 'bookshelf', name: 'Bookshelf', category: 'living', size: { w: 0.9, h: 1.9, d: 0.32 }, color: C.wood, alsoIn: ['bedroom'], tags: ['storage', 'shelves'] },
  { id: 'floor-lamp', name: 'Floor Lamp', category: 'living', size: { w: 0.4, h: 1.6, d: 0.4 }, color: '#d9cfc0', alsoIn: ['bedroom'], tags: ['lighting'] },
  { id: 'rug', name: 'Rug', category: 'living', size: { w: 2.4, h: 0.02, d: 1.6 }, color: '#9a7f6b', alsoIn: ['bedroom'], tags: ['textile'] },

  /* ------------------------------------------------------------ kitchen */
  { id: 'refrigerator', name: 'Refrigerator', category: 'kitchen', size: { w: 0.7, h: 1.85, d: 0.7 }, color: C.steel, tags: ['appliance', 'freezer'] },
  { id: 'kitchen-cabinet', name: 'Kitchen Cabinet', category: 'kitchen', size: { w: 0.9, h: 0.88, d: 0.6 }, color: '#e9e6e0', tags: ['storage'] },
  { id: 'wall-cabinet', name: 'Wall Cabinet', category: 'kitchen', size: { w: 0.9, h: 0.7, d: 0.35 }, color: '#e9e6e0', tags: ['storage', 'upper'] },
  { id: 'countertop', name: 'Countertop', category: 'kitchen', size: { w: 1.8, h: 0.9, d: 0.6 }, color: '#cfc9bf', tags: ['worktop'] },
  { id: 'kitchen-sink', name: 'Kitchen Sink', category: 'kitchen', size: { w: 0.9, h: 0.9, d: 0.6 }, color: C.metal, tags: ['plumbing'] },
  { id: 'stove', name: 'Stove / Oven', category: 'kitchen', size: { w: 0.6, h: 0.9, d: 0.62 }, color: C.steel, tags: ['appliance', 'cooking'] },
  { id: 'microwave', name: 'Microwave', category: 'kitchen', size: { w: 0.5, h: 0.3, d: 0.38 }, color: C.black, tags: ['appliance'] },
  { id: 'dishwasher', name: 'Dishwasher', category: 'kitchen', size: { w: 0.6, h: 0.85, d: 0.6 }, color: C.steel, tags: ['appliance'] },
  { id: 'dining-table', name: 'Dining Table', category: 'kitchen', size: { w: 1.6, h: 0.75, d: 0.9 }, color: C.wood, alsoIn: ['living'], tags: ['table'] },
  { id: 'dining-chair', name: 'Dining Chair', category: 'kitchen', size: { w: 0.45, h: 0.9, d: 0.48 }, color: C.darkWood, alsoIn: ['living'], tags: ['seating'] },

  /* ------------------------------------------------------------ bedroom */
  { id: 'single-bed', name: 'Single Bed', category: 'bedroom', size: { w: 1.0, h: 0.8, d: 2.0 }, color: '#8d9bab', tags: ['bed'] },
  { id: 'double-bed', name: 'Double Bed', category: 'bedroom', size: { w: 1.6, h: 0.85, d: 2.05 }, color: '#8d9bab', tags: ['bed', 'queen'] },
  { id: 'wardrobe', name: 'Wardrobe', category: 'bedroom', size: { w: 1.4, h: 2.1, d: 0.6 }, color: C.wood, tags: ['storage', 'closet'] },
  { id: 'nightstand', name: 'Nightstand', category: 'bedroom', size: { w: 0.45, h: 0.55, d: 0.4 }, color: C.wood, tags: ['storage'] },
  { id: 'desk', name: 'Desk', category: 'bedroom', size: { w: 1.3, h: 0.75, d: 0.6 }, color: C.wood, alsoIn: ['living'], tags: ['table', 'office'] },
  { id: 'desk-chair', name: 'Desk Chair', category: 'bedroom', size: { w: 0.55, h: 0.95, d: 0.55 }, color: C.black, alsoIn: ['living'], tags: ['seating', 'office'] },
  { id: 'dresser', name: 'Dresser', category: 'bedroom', size: { w: 1.1, h: 0.85, d: 0.5 }, color: C.wood, tags: ['storage', 'drawers'] },

  /* ----------------------------------------------------------- bathroom */
  { id: 'toilet', name: 'Toilet', category: 'bathroom', size: { w: 0.4, h: 0.78, d: 0.68 }, color: C.ceramic, tags: ['plumbing'] },
  { id: 'bathroom-sink', name: 'Bathroom Sink', category: 'bathroom', size: { w: 0.6, h: 0.85, d: 0.45 }, color: C.ceramic, tags: ['plumbing', 'basin'] },
  { id: 'bathroom-cabinet', name: 'Bathroom Cabinet', category: 'bathroom', size: { w: 0.6, h: 0.7, d: 0.2 }, color: C.white, tags: ['storage'] },
  { id: 'shower', name: 'Shower Enclosure', category: 'bathroom', size: { w: 0.9, h: 2.0, d: 0.9 }, color: '#cfe0e6', tags: ['plumbing', 'glass'] },
  { id: 'bathtub', name: 'Bathtub', category: 'bathroom', size: { w: 1.7, h: 0.58, d: 0.75 }, color: C.ceramic, tags: ['plumbing'] },
  { id: 'mirror', name: 'Mirror', category: 'bathroom', size: { w: 0.7, h: 0.9, d: 0.04 }, color: '#cfdfe6', alsoIn: ['bedroom'], tags: ['glass'] },

  /* ------------------------------------------------------------ laundry */
  { id: 'washing-machine', name: 'Washing Machine', category: 'laundry', size: { w: 0.6, h: 0.85, d: 0.6 }, color: C.white, tags: ['appliance'] },
  { id: 'dryer', name: 'Dryer', category: 'laundry', size: { w: 0.6, h: 0.85, d: 0.6 }, color: C.white, tags: ['appliance'] },
  { id: 'laundry-sink', name: 'Laundry Sink', category: 'laundry', size: { w: 0.6, h: 0.9, d: 0.5 }, color: C.white, tags: ['plumbing'] },
  { id: 'storage-cabinet', name: 'Storage Cabinet', category: 'laundry', size: { w: 0.8, h: 1.8, d: 0.45 }, color: '#e4e1da', alsoIn: ['kitchen'], tags: ['storage'] },
  { id: 'shelves', name: 'Shelves', category: 'laundry', size: { w: 1.0, h: 1.5, d: 0.3 }, color: C.wood, alsoIn: ['kitchen', 'living'], tags: ['storage'] },
]

export const CATALOG_BY_ID: Record<string, CatalogItem> = Object.fromEntries(
  CATALOG.map((item) => [item.id, item]),
)

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  living: 'Living Room',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  laundry: 'Laundry Room',
  other: 'Other',
  general: 'General',
}

/**
 * Orders the catalog for a room: items for that room first, then items that are
 * also used there, then everything else. The full catalog stays reachable.
 */
export function catalogForRoom(roomType: RoomType | null, query = ''): CatalogItem[] {
  const q = query.trim().toLowerCase()
  const matches = (item: CatalogItem) =>
    !q ||
    item.name.toLowerCase().includes(q) ||
    item.id.includes(q) ||
    (item.tags ?? []).some((tag) => tag.includes(q))

  const rank = (item: CatalogItem) => {
    if (!roomType || roomType === 'other') return 1
    if (item.category === roomType) return 0
    if (item.alsoIn?.includes(roomType)) return 1
    return 2
  }

  return CATALOG.filter(matches)
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item)
}
