import test from 'node:test'
import assert from 'node:assert/strict'
import { detectFaces } from '../src/core/rooms.ts'
import type { Vertex, Wall } from '../src/types/house.ts'

interface Graph {
  vertices: Record<string, Vertex>
  walls: Record<string, Wall>
}

function graph(points: Record<string, [number, number]>, edges: [string, string][]): Graph {
  const vertices: Record<string, Vertex> = {}
  for (const [id, [x, y]] of Object.entries(points)) vertices[id] = { id, x, y }
  const walls: Record<string, Wall> = {}
  edges.forEach(([a, b], i) => {
    const id = `w${i}`
    walls[id] = { id, a, b, height: 2.5, thickness: 0.15, color: '#fff' }
  })
  return { vertices, walls }
}

test('a closed rectangle yields one room with the right area', () => {
  const g = graph(
    { a: [0, 0], b: [4, 0], c: [4, 3], d: [0, 3] },
    [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
    ],
  )
  const faces = detectFaces(g.vertices, g.walls)
  assert.equal(faces.length, 1)
  assert.ok(Math.abs(faces[0].area - 12) < 1e-9)
  assert.equal(faces[0].wallIds.length, 4)
})

test('winding direction of the input walls does not matter', () => {
  const g = graph(
    { a: [0, 0], b: [4, 0], c: [4, 3], d: [0, 3] },
    [
      ['b', 'a'],
      ['c', 'b'],
      ['d', 'c'],
      ['a', 'd'],
    ],
  )
  const faces = detectFaces(g.vertices, g.walls)
  assert.equal(faces.length, 1)
  assert.ok(Math.abs(faces[0].area - 12) < 1e-9)
})

test('a shared divider wall yields two rooms', () => {
  const g = graph(
    { a: [0, 0], b: [6, 0], c: [6, 4], d: [0, 4], e: [2, 0], f: [2, 4] },
    [
      ['a', 'e'],
      ['e', 'b'],
      ['b', 'c'],
      ['c', 'f'],
      ['f', 'd'],
      ['d', 'a'],
      ['e', 'f'],
    ],
  )
  const faces = detectFaces(g.vertices, g.walls)
  const areas = faces.map((f) => f.area).sort((x, y) => x - y)
  assert.equal(faces.length, 2)
  assert.ok(Math.abs(areas[0] - 8) < 1e-9)
  assert.ok(Math.abs(areas[1] - 16) < 1e-9)
})

test('an open outline yields no rooms', () => {
  const g = graph(
    { a: [0, 0], b: [4, 0], c: [4, 3], d: [0, 3] },
    [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
    ],
  )
  assert.equal(detectFaces(g.vertices, g.walls).length, 0)
})

test('a dangling interior wall does not break the enclosing room', () => {
  const g = graph(
    { a: [0, 0], b: [4, 0], c: [4, 3], d: [0, 3], e: [2, 1.5] },
    [
      ['a', 'b'],
      ['b', 'c'],
      ['c', 'd'],
      ['d', 'a'],
      ['a', 'e'],
    ],
  )
  const faces = detectFaces(g.vertices, g.walls)
  assert.equal(faces.length, 1)
  assert.ok(Math.abs(faces[0].area - 12) < 1e-9)
})

test('two separate closed rectangles yield two rooms', () => {
  const g = graph(
    {
      a: [0, 0], b: [2, 0], c: [2, 2], d: [0, 2],
      e: [5, 0], f: [8, 0], h: [8, 3], i: [5, 3],
    },
    [
      ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'a'],
      ['e', 'f'], ['f', 'h'], ['h', 'i'], ['i', 'e'],
    ],
  )
  const faces = detectFaces(g.vertices, g.walls)
  const areas = faces.map((f) => f.area).sort((x, y) => x - y)
  assert.deepEqual(areas.map((a) => Math.round(a)), [4, 9])
})
