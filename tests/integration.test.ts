/**
 * Drives the real application store the way the UI does, to check the
 * acceptance criteria that do not need a browser: drawing walls, editing
 * lengths, room detection and classification, openings, furniture placement,
 * undo/redo and JSON round-tripping.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { useStore } from '../src/store/useStore.ts'
import { CATALOG_BY_ID } from '../src/catalog/catalog.ts'
import { houseToJSON, parseHouse } from '../src/core/persistence.ts'
import { addOpening, openingsForWall, wallLength, findWallNear, snapPoint } from '../src/core/house.ts'
import { wallPieces } from '../src/view3d/wallGeometry.ts'
import { resolvePlacement } from '../src/core/placement.ts'
import { hitTest } from '../src/editor2d/hit.ts'

const s = () => useStore.getState()

function drawRectangle(x0: number, y0: number, x1: number, y1: number) {
  s().addWalls({ x: x0, y: y0 }, { x: x1, y: y0 })
  s().addWalls({ x: x1, y: y0 }, { x: x1, y: y1 })
  s().addWalls({ x: x1, y: y1 }, { x: x0, y: y1 })
  s().addWalls({ x: x0, y: y1 }, { x: x0, y: y0 })
}

test('drawing a closed outline creates one room with the correct area', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const house = s().house
  assert.equal(Object.keys(house.walls).length, 4)
  assert.equal(house.rooms.length, 1)
  assert.ok(Math.abs(house.rooms[0].area - 24) < 1e-6)
})

test('room type assignment survives later structural edits', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const roomId = s().house.rooms[0].id
  s().setRoomProp(roomId, { type: 'kitchen', name: 'Kitchen' })

  // Add a divider: the original room splits, and the bigger half keeps the name.
  s().addWalls({ x: 2, y: 0 }, { x: 2, y: 4 })
  const rooms = s().house.rooms
  assert.equal(rooms.length, 2)
  const kitchen = rooms.find((room) => room.name === 'Kitchen')
  assert.ok(kitchen, 'the named room survived the split')
  assert.equal(kitchen.type, 'kitchen')
  const areas = rooms.map((room) => Math.round(room.area)).sort((a, b) => a - b)
  assert.deepEqual(areas, [8, 16])
})

test('editing a wall length moves the shared joint and drags connected walls', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const bottom = Object.values(s().house.walls).find((wall) => {
    const a = s().house.vertices[wall.a]
    const b = s().house.vertices[wall.b]
    return a.y === 0 && b.y === 0
  })
  assert.ok(bottom)
  s().setWallLengthValue(bottom.id, 5)

  const house = s().house
  assert.ok(Math.abs(wallLength(house, house.walls[bottom.id]) - 5) < 1e-9)
  // The shared joint moved to (5, 0), so the right-hand wall followed it and the
  // outline is now a trapezoid of (5 + 6) / 2 * 4 = 22 m² — still one closed room.
  assert.equal(house.rooms.length, 1)
  assert.ok(Math.abs(house.rooms[0].area - 22) < 1e-6, `area was ${house.rooms[0].area}`)
  const movedJoint = house.vertices[house.walls[bottom.id].b]
  assert.deepEqual([movedJoint.x, movedJoint.y], [5, 0])
  const stillConnected = Object.values(house.walls).filter(
    (wall) => wall.a === movedJoint.id || wall.b === movedJoint.id,
  )
  assert.equal(stillConnected.length, 2, 'both walls still meet at the moved joint')
})

test('drawing across an existing wall splits it so rooms still close', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  // A wall drawn past the outline on both sides must split the outline walls.
  s().addWalls({ x: 3, y: -1 }, { x: 3, y: 5 })
  const rooms = s().house.rooms
  assert.equal(rooms.length, 2)
  assert.deepEqual(rooms.map((room) => Math.round(room.area)).sort(), [12, 12])
})

test('doors and windows cut real openings in the 3D wall geometry', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const wall = findWallNear(s().house, { x: 3, y: 0 }, 0.3)
  assert.ok(wall)
  s().addWallOpening(wall.id, 'door', 0.5)
  s().addWallOpening(wall.id, 'window', 0.85)

  const house = s().house
  const openings = openingsForWall(house, wall.id)
  assert.equal(openings.length, 2)
  const pieces = wallPieces(
    wallLength(house, house.walls[wall.id]),
    house.walls[wall.id].height,
    openings,
  )
  const solid = pieces.reduce((sum, piece) => sum + piece.len * piece.h, 0)
  const full = wallLength(house, house.walls[wall.id]) * house.walls[wall.id].height
  const cut = openings.reduce((sum, opening) => sum + opening.width * opening.height, 0)
  assert.ok(Math.abs(solid - (full - cut)) < 1e-6)
})

test('openings accept an explicit width and may fill almost the whole wall', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  // split the bottom wall so there is a short 1 m segment to open up
  s().addWalls({ x: 1, y: 0 }, { x: 1, y: 2 })
  s().addWalls({ x: 2, y: 0 }, { x: 2, y: 2 })
  const segment = findWallNear(s().house, { x: 1.5, y: 0 }, 0.2)
  assert.ok(segment)
  assert.ok(Math.abs(wallLength(s().house, segment) - 1) < 1e-9)

  s().commit((h) => {
    const opening = addOpening(h, segment.id, 'door', 0.5, 0.9)
    assert.ok(opening, 'a 0.9 m door fits a 1 m wall')
    assert.equal(opening.width, 0.9)
  })
  assert.equal(Object.keys(s().house.openings).length, 1)

  // but it must still refuse what cannot fit
  s().commit((h) => {
    assert.equal(addOpening(h, segment.id, 'door', 0.5, 1.2), null)
  })
  assert.equal(Object.keys(s().house.openings).length, 1)
})

test('placement rests objects on the floor, snaps to walls and respects boundaries', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const sofa = CATALOG_BY_ID.sofa

  // Near the bottom wall → snapped flat against it, inside the room.
  const near = resolvePlacement(s().house, sofa, { x: 3, y: 0.4 }, {
    gridSize: 0.25,
    gridSnap: true,
    snapToWalls: true,
    constrainToHouse: true,
    rotation: 0,
  })
  assert.ok(near.snappedToWall)
  assert.equal(near.position.y, 0)
  assert.ok(near.valid)
  assert.ok(near.position.z > 0, 'pushed inside the room, not through the wall')

  // Well outside the house → rejected while the constraint is on.
  const outside = resolvePlacement(s().house, sofa, { x: 20, y: 20 }, {
    gridSize: 0.25,
    gridSnap: true,
    snapToWalls: true,
    constrainToHouse: true,
    rotation: 0,
  })
  assert.equal(outside.valid, false)
  assert.equal(outside.reason, 'Outside the house')
})

test('placing furniture records the room, and overlaps are reported', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const roomId = s().house.rooms[0].id
  s().setRoomProp(roomId, { type: 'living', name: 'Living Room' })

  s().beginPlacing(CATALOG_BY_ID.sofa)
  s().placeObject({ x: 3, y: 0, z: 2 }, 0)
  const objects = Object.values(s().house.objects)
  assert.equal(objects.length, 1)
  assert.equal(objects[0].roomId, roomId)
  assert.equal(s().selection.kind, 'object')

  // A second object dropped on top of the first is detected as overlapping.
  const probe = resolvePlacement(s().house, CATALOG_BY_ID.armchair, { x: 3, y: 2 }, {
    gridSize: 0.25,
    gridSnap: false,
    snapToWalls: false,
    constrainToHouse: true,
    rotation: 0,
  })
  assert.ok(probe.collisions.length > 0)
  assert.equal(probe.reason, 'Overlaps another object')
})

test('object properties can be edited numerically', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  s().beginPlacing(CATALOG_BY_ID['double-bed'])
  s().placeObject({ x: 3, y: 0, z: 2 }, 0)
  const id = Object.keys(s().house.objects)[0]

  s().setObjectProp(id, { size: { w: 1.8, h: 0.9, d: 2.1 }, rotation: Math.PI / 2 })
  s().setObjectProp(id, { position: { x: 1.5, y: 0, z: 1.25 }, color: '#334455' })

  const obj = s().house.objects[id]
  assert.deepEqual(obj.size, { w: 1.8, h: 0.9, d: 2.1 })
  assert.ok(Math.abs(obj.rotation - Math.PI / 2) < 1e-9)
  assert.deepEqual(obj.position, { x: 1.5, y: 0, z: 1.25 })
  assert.equal(obj.color, '#334455')
})

test('objects can be tilted around X and Z, and tilt survives a round trip', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  s().beginPlacing(CATALOG_BY_ID.tv)
  s().placeObject({ x: 3, y: 0.5, z: 2 }, 0)
  const id = Object.keys(s().house.objects)[0]
  assert.deepEqual(s().house.objects[id].tilt, { x: 0, z: 0 })

  s().setObjectProp(id, { rotation: Math.PI / 4, tilt: { x: 0.15, z: -0.3 } })
  const tilted = s().house.objects[id]
  assert.ok(Math.abs(tilted.rotation - Math.PI / 4) < 1e-9)
  assert.deepEqual(tilted.tilt, { x: 0.15, z: -0.3 })

  const restored = parseHouse(houseToJSON(s().house))
  assert.deepEqual(Object.values(restored.objects)[0].tilt, { x: 0.15, z: -0.3 })

  // duplicates get their own tilt, not a shared reference
  s().duplicateSelected()
  const copyId = Object.keys(s().house.objects).find((other) => other !== id)
  assert.ok(copyId)
  s().setObjectProp(copyId, { tilt: { x: 0, z: 0 } })
  assert.deepEqual(s().house.objects[id].tilt, { x: 0.15, z: -0.3 })
})

test('projects saved before tilt existed still load', () => {
  const legacy = {
    meta: { name: 'Legacy' },
    vertices: { a: { x: 0, y: 0 }, b: { x: 3, y: 0 } },
    walls: { w: { a: 'a', b: 'b', height: 2.5, thickness: 0.15, color: '#fff' } },
    objects: {
      o: { catalogId: 'sofa', name: 'Sofa', category: 'living', position: { x: 1, y: 0, z: 1 }, rotation: 0.5, size: { w: 2, h: 0.8, d: 0.9 }, color: '#888' },
    },
  }
  const restored = parseHouse(JSON.stringify(legacy))
  assert.deepEqual(Object.values(restored.objects)[0].tilt, { x: 0, z: 0 })
})

test('clicking beside a door picks what is actually there', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const bottom = findWallNear(s().house, { x: 3, y: 4 }, 0.2)
  assert.ok(bottom)
  s().addWallOpening(bottom.id, 'door', 0.5)
  s().beginPlacing(CATALOG_BY_ID.sofa)
  s().placeObject({ x: 3.4, y: 0, z: 3.4 }, 0)

  const house = s().house
  // on the wall, inside the door span → the door
  assert.equal(hitTest(house, { x: 3, y: 4 }, 0.08).kind, 'opening')
  // 0.6 m off the wall, on the sofa → the sofa, not the door
  const beside = hitTest(house, { x: 3.4, y: 3.4 }, 0.08)
  assert.equal(beside.kind, 'object')
  assert.equal(house.objects[beside.id].name, 'Sofa')
})

test('undo and redo step through structural and furniture edits', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  s().beginPlacing(CATALOG_BY_ID.sofa)
  s().placeObject({ x: 3, y: 0, z: 2 }, 0)
  assert.equal(Object.keys(s().house.objects).length, 1)

  s().undo()
  assert.equal(Object.keys(s().house.objects).length, 0)
  assert.equal(s().house.rooms.length, 1)

  s().redo()
  assert.equal(Object.keys(s().house.objects).length, 1)

  // undo back past every wall
  for (let i = 0; i < 10; i++) s().undo()
  assert.equal(Object.keys(s().house.walls).length, 0)
  assert.equal(s().canUndo(), false)
})

test('snapping finds existing joints and wall surfaces', () => {
  s().newProject()
  drawRectangle(0, 0, 6, 4)
  const house = s().house
  const toVertex = snapPoint(house, { x: 0.08, y: -0.06 }, { gridSize: 0.25, snapEnabled: true })
  assert.equal(toVertex.kind, 'vertex')
  assert.deepEqual([toVertex.point.x, toVertex.point.y], [0, 0])

  const toWall = snapPoint(house, { x: 2.63, y: 0.05 }, { gridSize: 0.25, snapEnabled: true })
  assert.equal(toWall.kind, 'wall')
  assert.ok(Math.abs(toWall.point.y) < 1e-9)

  const toGrid = snapPoint(house, { x: 2.61, y: 2.07 }, { gridSize: 0.25, snapEnabled: true })
  assert.equal(toGrid.kind, 'grid')
  assert.deepEqual([toGrid.point.x, toGrid.point.y], [2.5, 2])
})

test('a project survives a JSON export/import round trip', () => {
  s().newProject()
  s().renameProject('Round Trip House')
  drawRectangle(0, 0, 6, 4)
  s().addWalls({ x: 2, y: 0 }, { x: 2, y: 4 })
  const divider = findWallNear(s().house, { x: 2, y: 2 }, 0.2)
  assert.ok(divider)
  s().addWallOpening(divider.id, 'door', 0.5)
  const [small, large] = [...s().house.rooms].sort((a, b) => a.area - b.area)
  s().setRoomProp(small.id, { type: 'bathroom', name: 'Bathroom' })
  s().setRoomProp(large.id, { type: 'living', name: 'Living Room' })
  s().beginPlacing(CATALOG_BY_ID.bathtub)
  s().placeObject({ x: 1, y: 0, z: 1.2 }, Math.PI / 2)

  const before = s().house
  const restored = parseHouse(houseToJSON(before))

  assert.equal(restored.meta.name, 'Round Trip House')
  assert.equal(Object.keys(restored.walls).length, Object.keys(before.walls).length)
  assert.equal(Object.keys(restored.openings).length, 1)
  assert.equal(restored.rooms.length, 2)
  assert.deepEqual(
    restored.rooms.map((room) => `${room.name}:${room.type}`).sort(),
    ['Bathroom:bathroom', 'Living Room:living'],
  )
  const originalObject = Object.values(before.objects)[0]
  const restoredObject = Object.values(restored.objects)[0]
  assert.deepEqual(restoredObject.position, originalObject.position)
  assert.deepEqual(restoredObject.size, originalObject.size)
  assert.equal(restoredObject.rotation, originalObject.rotation)
  assert.equal(restoredObject.roomId, restored.rooms.find((r) => r.name === 'Bathroom')?.id)
})

test('loading a project replaces the session and clears history', () => {
  s().newProject()
  drawRectangle(0, 0, 4, 3)
  const exported = houseToJSON(s().house)
  s().newProject()
  assert.equal(s().house.rooms.length, 0)
  s().loadHouse(parseHouse(exported))
  assert.equal(s().house.rooms.length, 1)
  assert.equal(s().canUndo(), false)
})

test('rejects files that are not house projects', () => {
  assert.throws(() => parseHouse('{"hello":"world"}'), /missing walls or vertices/)
  assert.throws(() => parseHouse('[]'), /Not a house project/)
  assert.throws(() => parseHouse('"nope"'), /Not a house project/)
})
