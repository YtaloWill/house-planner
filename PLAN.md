# 3D House Planner — Interactive Web Application

## 1. Project Goal

Build a browser-based 3D house planning application that allows users to design residential floor plans from scratch, customize room dimensions, furnish rooms with procedural 3D furniture, and explore their designs through an interactive 3D environment.

The application must provide two synchronized editing modes:

- **2D Floor Plan:** For drawing walls, creating rooms, and precisely editing dimensions.
- **3D View:** For visualizing the house, placing furniture, adjusting objects, and exploring the interior.

Changes made in either mode must immediately reflect in the other.

This is an interactive design tool, not a static architectural visualization.

Prioritize a functional MVP with reliable editing capabilities over visual complexity.

---

## 2. Application Layout

Create a desktop-first interface with the following structure:

- **Left Sidebar:** Tool selection, room management, and furniture catalog.
- **Main Workspace:** Switchable 2D and 3D editing views.
- **Right Sidebar:** Contextual properties panel for selected walls, rooms, or objects.
- **Top Toolbar:** Project controls, undo/redo, view switching, camera controls, and save/export actions.
- **Status Bar:** Current tool, cursor coordinates, selected object dimensions, and measurement units.

The workspace should occupy most of the available screen.

Use a modern, minimal architectural software aesthetic. Keep controls accessible without obstructing the workspace.

---

## 3. 2D Floor Plan Editor

The 2D editor is the primary tool for creating the house structure.

### Wall drawing

Users must be able to draw walls freely using their mouse.

Interaction:
1. Select the wall drawing tool.
2. Click a starting point on the canvas.
3. Move the cursor to preview a wall.
4. Display the current wall length dynamically.
5. Click to establish the endpoint.
6. Continue drawing connected walls.
7. Double-click or press Escape to finish drawing.

Requirements:
- Support horizontal, vertical, and diagonal walls.
- Snap endpoints to existing walls and vertices.
- Display measurements while drawing.
- Allow precise wall length input.
- Support wall selection and deletion.
- Allow individual walls to be moved or resized.
- Automatically detect enclosed areas and generate rooms.
- Allow walls to be extended or connected to existing structures.

### Wall properties

Each wall must have configurable:
- Length.
- Height.
- Thickness.
- Position.
- Rotation.
- Color and material.

Wall lengths must use real-world measurements.

Changing a wall's dimensions must update connected geometry appropriately.

### Room detection

Automatically identify enclosed spaces created by connected walls.

Allow users to select an enclosed area and assign a room type:
- Living Room.
- Kitchen.
- Bedroom.
- Bathroom.
- Laundry Room.

Display each room's name, dimensions, and calculated floor area.

Support multiple rooms connected through shared walls.

### Editing tools

Include:
- Select.
- Draw walls.
- Move.
- Delete.
- Measure.
- Zoom.
- Pan.
- Undo/redo.

Provide a configurable grid and snapping system.

---

## 4. Synchronized 3D Environment

Generate a 3D representation of the floor plan automatically.

The 3D environment must reflect all structural changes made in the 2D editor.

### House visualization

- Generate floors and walls from the floor plan.
- Maintain accurate real-world dimensions.
- Generate openings for doors and windows.
- Support wall materials and colors.
- Show furniture and objects in their actual positions.
- Allow individual rooms to be visually inspected.

### Camera controls

Support:
- Orbit around the house.
- Zoom in/out.
- Pan.
- Perspective and orthographic cameras.
- Top-down view.
- Front and side views.
- Isometric view.
- First-person walkthrough.

### Visibility controls

Allow users to:
- Hide all walls.
- Hide individual walls.
- Hide the roof.
- Isolate a room.
- Focus the camera on a selected room.
- Toggle between complete-house and interior views.

Camera navigation should feel natural and responsive.

---

## 5. Furniture and Object Catalog

Provide a catalog of procedural 3D models organized by room.

All models should be generated programmatically using reusable geometries and materials.

Do not represent every object as a simple cube. Models should be recognizable through their shapes, proportions, and details.

### Living Room
- Sofa.
- Armchair.
- Coffee table.
- TV.
- TV stand.
- Bookshelf.
- Floor lamp.
- Rug.

### Kitchen
- Refrigerator/freezer.
- Kitchen cabinets.
- Countertop.
- Kitchen sink.
- Stove/oven.
- Microwave.
- Dishwasher.
- Dining table.
- Chairs.

### Bedroom
- Single bed.
- Double bed.
- Wardrobe.
- Nightstand.
- Desk.
- Chair.
- Dresser.
- Floor lamp.

### Bathroom
- Toilet.
- Bathroom sink.
- Bathroom cabinet.
- Shower enclosure.
- Bathtub.
- Mirror.

### Laundry Room
- Washing machine.
- Dryer.
- Laundry sink.
- Storage cabinets.
- Shelves.

### Model requirements

Every catalog item must have:
- A recognizable 3D representation.
- Default realistic dimensions.
- Configurable width, height, and depth.
- Position and rotation.
- Appropriate materials and colors.
- A descriptive name and category.

Use reusable procedural modeling functions to generate furniture components.

For example, a sofa should consist of a seat, backrest, armrests, and legs rather than a single box.

Prioritize a smaller collection of good-quality procedural models over a large collection of primitive placeholders.

---

## 6. Object Placement and Manipulation

Users must be able to place furniture directly into the 3D environment.

### Placement workflow

1. Open the furniture catalog.
2. Select an object.
3. Enter placement mode.
4. Move the object using the mouse.
5. Preview its position before confirming.
6. Click to place it in the house.

### Manipulation

Selected objects must support:
- Translation on X, Y, and Z axes.
- Rotation.
- Resizing.
- Deletion.
- Duplication.
- Precise numerical adjustments.

Provide standard 3D transformation gizmos.

### Properties panel

When selecting an object, display:
- Object name.
- Category.
- Width.
- Height.
- Depth.
- Position (X, Y, Z).
- Rotation.
- Color and material options.

All property changes must immediately update the 3D model.

### Placement constraints

- Objects should rest on the floor by default.
- Support snapping to walls.
- Support grid snapping.
- Display placement previews.
- Prevent objects from being placed outside the house boundaries by default.
- Provide basic collision detection and overlap warnings.
- Allow users to disable snapping when needed.

---

## 7. Room-Aware Catalog

The furniture catalog should adapt to the selected room.

For example:
- Selecting the kitchen prioritizes appliances and kitchen furniture.
- Selecting the bedroom prioritizes beds, wardrobes, and nightstands.
- Selecting the bathroom prioritizes toilets, sinks, showers, and bathtubs.

Users should still be able to access the complete catalog regardless of the selected room.

---

## 8. Project Data and Persistence

Represent the house as structured application data, independent of the rendering engine.

The data model should include:

**House**
- Project metadata.
- Walls.
- Rooms.
- Doors and windows.
- Furniture and objects.

**Wall**
- Unique ID.
- Start and end coordinates.
- Height.
- Thickness.
- Material.

**Room**
- Unique ID.
- Name.
- Room type.
- Boundary references.
- Floor area.

**Object**
- Unique ID.
- Catalog identifier.
- Position.
- Rotation.
- Dimensions.
- Material configuration.

Implement:
- New project.
- Save project.
- Load project.
- Export project to JSON.
- Import project from JSON.
- Reset project.

Use local persistence for the MVP. A backend and user authentication are not required.

Ensure that projects can be restored without losing object positions, dimensions, or structural information.

---

## 9. Technical Architecture

Use a modular architecture.

Suggested technologies:
- React.
- TypeScript.
- Three.js.
- React Three Fiber.
- Drei for common 3D helpers and controls.
- A suitable 2D canvas or SVG-based editor.
- Zustand or an equivalent state management solution.

Separate application responsibilities into modules:

- Floor plan editor.
- Wall and room management.
- 3D scene generation.
- Camera management.
- Furniture catalog.
- Procedural model generation.
- Object manipulation.
- Project serialization.
- UI and properties panels.

Maintain a single source of truth for the house data.

The 2D editor and 3D renderer must consume the same underlying model rather than maintaining independent representations.

Use consistent world coordinates and measurement units throughout the application.

Suggested convention:
- 1 world unit = 1 meter.
- X and Z represent horizontal floor coordinates.
- Y represents vertical height.

---

## 10. MVP Implementation Priorities

Build the application incrementally.

### Phase 1 — Foundation
- Application layout.
- 2D canvas.
- 3D viewport.
- Shared house data model.
- Basic camera navigation.
- Grid and measurement system.

### Phase 2 — House Construction
- Free-form wall drawing.
- Wall snapping.
- Wall length editing.
- Enclosed room detection.
- Room classification.
- Automatic 3D floor and wall generation.

### Phase 3 — Furniture
- Procedural model generation.
- Room-based furniture catalog.
- Object placement.
- Translation and rotation.
- Dimension editing.
- Properties panel.

### Phase 4 — Project Management
- Undo/redo.
- Local saving.
- Project loading.
- JSON import/export.

### Phase 5 — Polish
- Collision warnings.
- Improved snapping.
- Materials and colors.
- Additional camera modes.
- Performance improvements.

Do not attempt to implement all phases simultaneously. Ensure each phase produces a working application before proceeding.

---

## 11. Acceptance Criteria

The MVP is considered functional when a user can:

1. Open the application and start a new project.
2. Draw a house layout by freely connecting walls.
3. Define and modify individual wall lengths.
4. Create multiple enclosed rooms.
5. Assign room types.
6. See the house generated automatically in 3D.
7. Switch between 2D and 3D without losing editing state.
8. Navigate the 3D scene using the camera.
9. Select furniture from the catalog.
10. Place furniture inside rooms.
11. Move, rotate, and resize furniture.
12. Modify object properties numerically.
13. Save and reload the house design.
14. Export and import the project as JSON.

All these interactions must work. Do not substitute non-functional buttons, mock controls, or static demonstrations for actual features.

## Final Instruction

Prioritize correctness of geometry, editing interactions, coordinate systems, and synchronization between 2D and 3D.

Build a usable architectural planning tool with a focused MVP.

Avoid unnecessary features such as authentication, social sharing, multiplayer editing, cloud synchronization, or advanced photorealistic rendering.

Deliver working functionality before expanding the feature set.
