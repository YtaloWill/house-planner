/**
 * Splits a wall into solid pieces around its openings.
 *
 * Everything is in wall-local coordinates: x runs along the wall and is centred
 * on the wall (so x ∈ [-len/2, len/2]), y is height above the floor.
 */

export interface WallOpeningSpec {
  /** centre along the wall, 0..1 */
  t: number
  width: number
  height: number
  sill: number
}

export interface WallPiece {
  /** centre of the piece along the wall, relative to the wall centre */
  cx: number
  /** centre height of the piece */
  cy: number
  /** piece length along the wall */
  len: number
  /** piece height */
  h: number
}

const MIN_PIECE = 0.004

export function wallPieces(
  length: number,
  height: number,
  openings: WallOpeningSpec[],
): WallPiece[] {
  const pieces: WallPiece[] = []
  if (length <= 0 || height <= 0) return pieces

  const push = (from: number, to: number, bottom: number, top: number) => {
    const len = to - from
    const h = top - bottom
    if (len <= MIN_PIECE || h <= MIN_PIECE) return
    pieces.push({ cx: (from + to) / 2 - length / 2, cy: (bottom + top) / 2, len, h })
  }

  const spans = openings
    .map((opening) => {
      const halfWidth = Math.min(opening.width, length) / 2
      const centre = Math.min(length - halfWidth, Math.max(halfWidth, opening.t * length))
      const sill = Math.max(0, Math.min(opening.sill, height))
      const top = Math.min(height, sill + opening.height)
      return { from: centre - halfWidth, to: centre + halfWidth, sill, top }
    })
    .sort((a, b) => a.from - b.from)

  let cursor = 0
  for (const span of spans) {
    const from = Math.max(cursor, span.from)
    const to = Math.max(from, Math.min(length, span.to))
    // full-height wall before the opening
    push(cursor, from, 0, height)
    // under-sill wall (windows) and the header above the opening
    push(from, to, 0, span.sill)
    push(from, to, span.top, height)
    cursor = Math.max(cursor, to)
  }
  push(cursor, length, 0, height)

  return pieces
}

/** Total solid area of the wall face, handy for sanity checks and tests. */
export function piecesArea(pieces: WallPiece[]): number {
  return pieces.reduce((sum, piece) => sum + piece.len * piece.h, 0)
}
