# House Planner

A browser-based 3D house planning tool: draw a floor plan, let the app detect
rooms, furnish them with procedural 3D models, and walk through the result.

The 2D plan and the 3D view are two renderings of **one** house model, so every
edit shows up in both immediately.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build into dist/
npm test         # geometry, room detection, wall openings, store integration
```

Requires Node 20+.

### With Nix

A flake provides the toolchain and builds the site:

```bash
nix develop            # dev shell with Node 22, npm and language servers
nix develop -c npm ci  # then npm run dev / npm test / npm run build as above
nix build              # production build; the static site lands in ./result
nix flake check        # evaluate every output
```

The dev shell exports `LD_LIBRARY_PATH` for the prebuilt native addons npm
installs (the rolldown bindings), which otherwise fail to `dlopen` on NixOS.
After changing dependencies, refresh the lock hash in `flake.nix`:

```bash
nix run nixpkgs#prefetch-npm-deps -- package-lock.json
```

## Using it

### Drawing the house

1. Pick the **Wall** tool (or press `W`).
2. Click a start point, move the mouse — the live length and angle are shown —
   and click again to set the end point. Walls keep chaining until you
   double-click or press `Esc`.
3. For exact walls, type a **Length** and **Angle** in the panel at the top-left
   of the canvas and press Enter.
4. Close a loop and the enclosed area becomes a room automatically. Give it a
   type (Living Room, Kitchen, Bedroom, Bathroom, Laundry Room) in the left
   sidebar or the properties panel.

Walls snap to existing joints, to other walls, to 15° angles and to the grid.
Toggle snapping with the **Snap** checkbox or `G`. Drawing across an existing
wall splits it, so T-junctions and crossings still close rooms properly.

### Editing

- **Select** (`V`) — click a wall, joint, room, door/window or object; the right
  sidebar shows its properties. Every number there is editable.
- **Move** (`M`) — drag walls, joints and furniture. Dragging a joint stretches
  every wall attached to it.
- **Door** (`O`) / **Window** (`I`) — click a wall to cut a real opening; the 3D
  geometry is rebuilt around it (jambs, header, sill, glass).
- **Delete** (`X`), **Measure** (`L`), **Pan** (`P`), mouse wheel to zoom.
- `Ctrl+Z` / `Ctrl+Shift+Z` (or `Ctrl+Y`) undo and redo, `Ctrl+D` duplicates,
  `Delete` removes the selection, `2` and `3` switch views.

### Furnishing

Open the catalog in the left sidebar. It re-orders itself around the selected
room — picking a kitchen puts appliances first — while the full catalog stays
available. Click an item to enter placement mode, move the pointer over the
house to preview it (green = fine, amber = overlapping, red = outside the
house), press `R` to rotate, and click to drop it. Objects rest on the floor,
snap flat against nearby walls, and report overlaps.

Selected objects get a transform gizmo (Move / Rotate / Scale in the toolbar)
and full numeric control in the properties panel: size, position, rotation and
colour.

### Viewing

Iso / Top / Front / Side / Fit camera presets, perspective or orthographic
cameras, and a first-person **Walk** mode (click the scene to capture the
mouse, `WASD` to move, `Shift` to run, `Esc` to leave). Walls can be hidden
globally or one at a time, the roof toggled, and any room isolated or focused.

### Projects

**Save** stores the project in this browser under its name, **Load** reopens
one, **Export** / **Import** move it as a JSON file, **Reset** clears
everything. Work is autosaved continuously and restored on reload.

## Architecture

```
src/
  types/house.ts        the house data model (the single source of truth)
  core/geometry.ts      2D vector / polygon maths
  core/rooms.ts         planar-graph face finding → enclosed rooms
  core/house.ts         wall, opening and object operations + snapping
  core/placement.ts     furniture placement rules (floor, walls, collisions)
  core/persistence.ts   validation, localStorage, JSON import/export
  store/useStore.ts     Zustand store: house + history + UI state
  catalog/              catalog data and procedural furniture models
  editor2d/             SVG floor-plan editor
  view3d/               React Three Fiber scene, cameras, gizmos
  ui/                   toolbar, sidebars, status bar, form fields
```

Conventions: **1 unit = 1 meter** everywhere. The floor plan is 2D `(x, y)`;
it maps to world space as `X = x`, `Z = y`, with `Y` as height. A wall at
plan angle `a` is drawn in 3D rotated `-a` about Y, which keeps both views in
the same coordinate system.

Rooms are derived, never hand-maintained: the walls form a planar graph, and
`detectFaces` walks its minimal cycles to find enclosed areas. When walls
change, rooms are recomputed and user-assigned names, types and floor colours
are carried over to the matching areas.

Wall geometry with openings is computed by `wallPieces`, which splits a wall
into solid boxes around each door and window instead of doing CSG.

## Tests

`npm test` runs typechecking plus four suites: geometry primitives, room
detection (including dividers, dangling walls and open outlines), wall opening
geometry, and an integration suite that drives the real store through the
acceptance criteria — drawing, resizing, room typing, openings, placement,
undo/redo and a JSON round trip.
