import test from 'node:test'
import assert from 'node:assert/strict'
import { piecesArea, wallPieces } from '../src/view3d/wallGeometry.ts'

test('a wall with no openings is a single piece', () => {
  const pieces = wallPieces(4, 2.5, [])
  assert.equal(pieces.length, 1)
  assert.equal(pieces[0].len, 4)
  assert.equal(pieces[0].h, 2.5)
  assert.equal(pieces[0].cx, 0)
  assert.equal(pieces[0].cy, 1.25)
})

test('a door leaves wall on both sides plus a header', () => {
  const pieces = wallPieces(4, 2.5, [{ t: 0.5, width: 1, height: 2, sill: 0 }])
  assert.equal(pieces.length, 3)
  const area = piecesArea(pieces)
  assert.ok(Math.abs(area - (4 * 2.5 - 1 * 2)) < 1e-9)
  // no piece may overlap the door opening below its header
  for (const piece of pieces) {
    const overlapsX = Math.abs(piece.cx) < 0.5 - 1e-9
    if (overlapsX) assert.ok(piece.cy - piece.h / 2 >= 2 - 1e-9)
  }
})

test('a window leaves wall under the sill and above the head', () => {
  const pieces = wallPieces(4, 2.5, [{ t: 0.5, width: 1.2, height: 1.2, sill: 0.9 }])
  assert.equal(pieces.length, 4)
  assert.ok(Math.abs(piecesArea(pieces) - (4 * 2.5 - 1.2 * 1.2)) < 1e-9)
})

test('multiple openings are handled in order and clamped to the wall', () => {
  const pieces = wallPieces(6, 2.6, [
    { t: 0.8, width: 1, height: 1.2, sill: 1 },
    { t: 0.2, width: 0.9, height: 2.05, sill: 0 },
  ])
  assert.ok(Math.abs(piecesArea(pieces) - (6 * 2.6 - 0.9 * 2.05 - 1 * 1.2)) < 1e-9)
  for (const piece of pieces) {
    assert.ok(piece.cx - piece.len / 2 >= -3 - 1e-9)
    assert.ok(piece.cx + piece.len / 2 <= 3 + 1e-9)
    assert.ok(piece.cy + piece.h / 2 <= 2.6 + 1e-9)
  }
})

test('an opening at the very edge still produces a valid wall', () => {
  const pieces = wallPieces(2, 2.5, [{ t: 0, width: 1, height: 2.1, sill: 0 }])
  assert.ok(piecesArea(pieces) > 0)
  assert.ok(pieces.every((piece) => piece.len > 0 && piece.h > 0))
})
