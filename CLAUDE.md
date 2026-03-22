# FloorPlan — Claude Context

## What this project is

A frontend-only React + Vite + SVG floor plan designer. No backend. Users start from an empty canvas or import a floor plan JSON, edit rooms/walls/doors/windows and place furniture, then export an enhanced JSON.

## Tech stack

- React 19, Vite 8, SVG rendering (no Canvas API)
- CSS custom properties for all theming (`src/index.css`)
- No external UI libraries, no TypeScript

## Key architecture notes

- All state lives in `src/App.jsx` — walls, furniture, history, mode, selection, pan/zoom
- Coordinate system: JSON uses meters, Y-down (screen coords, no Y-flip). Display converts to feet (`M_TO_FT = 3.28084`, `PX_PER_FT = 10`)
- Dimension display toggles between decimal feet and ft/in (state: `useFtIn`, toggled in toolbar)
- Two modes toggled from toolbar: **Furniture mode** (default) and **Walls mode** (styled orange to distinguish it)
- Furniture z-order (bring to front / send to back) is controlled via the Properties panel; order is determined by array position in `furniture` state
- Undo/redo via `useHistory` hook — `record()` for discrete actions, `beginDrag()`/`endDrag()` collapse drag sequences to one entry
- Module-level ID counters (`nextId`, `nextWallId`, `nextChildId`) must be bumped on import to avoid collisions

## File map

| File | Purpose |
|---|---|
| `src/App.jsx` | All state, handlers, layout |
| `src/hooks/useHistory.js` | Undo/redo (max 50 snapshots of `{ walls, furniture }`) |
| `src/hooks/usePanZoom.js` | Pan/zoom logic |
| `src/utils/transform.js` | `mToSVG`, `svgToM`, `snapToGrid`, `formatFeet`, etc. |
| `src/components/Canvas.jsx` | SVG viewport, wall/child drag math, wall drawing/placement |
| `src/components/FloorPlanLayer.jsx` | Rooms, walls, doors, windows rendering |
| `src/components/FurnitureLayer.jsx` | Furniture drag/resize |
| `src/components/FurniturePalette.jsx` | Item templates + `FURNITURE_TEMPLATES` export |
| `src/components/Toolbar.jsx` | Top bar |
| `src/components/WallsPanel.jsx` | Left sidebar in walls mode |
| `src/components/WallChildPanel.jsx` | Right sidebar for selected door/window |
| `src/components/PropertiesPanel.jsx` | Right sidebar for selected furniture |
| `src/index.css` | All CSS custom properties (light + dark themes) |

## Floor plan JSON format

Units are **meters**, Y-axis is screen coords (Y-down).

```json
{
  "floors": [{
    "bounds": { "xMin": 0, "xMax": 10, "yMin": 0, "yMax": 8 },
    "rooms": [
      { "id": "r1", "type": "finished", "shape": { "polygon": [[x,y], ...] } }
    ],
    "walls": [
      {
        "id": "w1", "thickness": 0.15,
        "spine": { "segment": [[x1,y1],[x2,y2]] },
        "children": [
          {
            "id": "c1", "type": "door",
            "shape": { "rectangle": { "center": [cx,cy], "size": [w,h], "rotation": 0 } },
            "swingDir": 1,
            "mirrored": false
          }
        ]
      }
    ]
  }]
}
```

Enhanced JSON adds `"enhanced": true` and a `"furniture"` array (furniture coords in **feet**, not meters).

A working example is at `example-floor-plan.json`.

## Deployment

- GitHub Actions workflow at `.github/workflows/deploy.yml` deploys to GitHub Pages on push to `main`
- Skips deploy for pushes that only change `.md` files or `.gitignore`
- Vite base path set to `/floorplan/` in `vite.config.js` to match the GitHub Pages subpath
- GitHub repo Pages source must be set to "GitHub Actions" in repo settings

## Responsiveness

The app is desktop-only. Sidebars are fixed-width (`180px` left, `200px` right). No media queries exist. Making it tablet-friendly would be a CSS-only effort (collapsible sidebars, toolbar overflow). Full mobile support would also require touch event handling in `usePanZoom.js`. Not currently planned.
