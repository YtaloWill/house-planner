import test from 'node:test'
import assert from 'node:assert/strict'
import {
  distToSegment,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  rectsOverlap,
  segmentIntersection,
  signedArea,
} from '../src/core/geometry.ts'

test('signedArea is positive for counter-clockwise polygons', () => {
  const ccw = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ]
  assert.equal(signedArea(ccw), 12)
  assert.equal(signedArea(ccw.slice().reverse()), -12)
  assert.equal(polygonArea(ccw.slice().reverse()), 12)
})

test('polygonCentroid finds the middle of a rectangle', () => {
  const rect = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2 },
    { x: 0, y: 2 },
  ]
  const c = polygonCentroid(rect)
  assert.ok(Math.abs(c.x - 2) < 1e-9)
  assert.ok(Math.abs(c.y - 1) < 1e-9)
})

test('pointInPolygon respects the boundary', () => {
  const rect = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 2 },
    { x: 0, y: 2 },
  ]
  assert.equal(pointInPolygon({ x: 2, y: 1 }, rect), true)
  assert.equal(pointInPolygon({ x: 5, y: 1 }, rect), false)
})

test('distToSegment clamps to the endpoints', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 10, y: 0 }
  assert.equal(distToSegment({ x: 5, y: 3 }, a, b), 3)
  assert.equal(distToSegment({ x: -4, y: 0 }, a, b), 4)
})

test('segmentIntersection reports parameters along both segments', () => {
  const hit = segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 4, y: -2 }, { x: 4, y: 2 })
  assert.ok(hit)
  assert.ok(Math.abs(hit.t - 0.4) < 1e-9)
  assert.ok(Math.abs(hit.u - 0.5) < 1e-9)
  assert.ok(Math.abs(hit.point.x - 4) < 1e-9)
  assert.equal(segmentIntersection({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }), null)
})

test('rectsOverlap detects rotated overlap', () => {
  const a = { cx: 0, cy: 0, w: 2, d: 1, rot: 0 }
  assert.equal(rectsOverlap(a, { cx: 1.2, cy: 0, w: 2, d: 1, rot: 0 }), true)
  assert.equal(rectsOverlap(a, { cx: 3, cy: 0, w: 2, d: 1, rot: 0 }), false)
  assert.equal(rectsOverlap(a, { cx: 0.9, cy: 0.9, w: 2, d: 1, rot: Math.PI / 2 }), true)
})
