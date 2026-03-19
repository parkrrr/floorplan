# FloorPlan

A browser-based floor plan designer built with React, Vite, and SVG.

## Features

### Floor Plan Import / Export
- Import a floor plan JSON (coordinates in meters) to populate rooms, walls, doors, and windows
- Export an enhanced JSON that preserves all edits — re-importable without data loss

### Furniture
- Place furniture from a categorized palette: Seating, Tables, Bedroom, Storage, Counters, Appliances, Custom
- Drag to move, drag corners to resize, rotate via Properties panel slider
- Nudge selected item 1 inch at a time with arrow keys
- Delete selected item with Delete / Backspace
- Properties panel shows label, dimensions, rotation, color, area, and position

### Walls Mode
- Draw new walls (click to place, snaps to nearby endpoints)
- Add doors (2'8" default) or windows (3' default) to any wall
- Drag wall endpoints with axis-snap alignment to other nearby endpoints
- Edit doors: swing direction (Side A / None / Side B), mirror hinge side
- Delete walls, doors, or windows from the Properties panel or with Delete / Backspace

### Undo / Redo
- Full history for all actions: place, delete, move, resize, rotate, wall edits, door/window edits
- Drag sequences collapse to a single undo entry
- Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z, or toolbar buttons

### Pan & Zoom
- Scroll to zoom toward cursor
- Space+drag, middle-mouse drag, or Pan tool to pan
- Snap-to-grid toggle (3-inch increments)

### Dark Mode
- Toggle between light and dark themes; preference saved to localStorage

## Tech Stack

- React 19 + Vite 8
- SVG rendering (no Canvas API)
- CSS custom properties for theming

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Other Scripts

```bash
npm run build    # production build
npm run preview  # preview production build
npm run lint     # ESLint
```
