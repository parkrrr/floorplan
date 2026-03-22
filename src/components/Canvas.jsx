import { useRef, useCallback, useEffect, useState } from 'react';
import { usePanZoom } from '../hooks/usePanZoom';
import FloorPlanLayer from './FloorPlanLayer';
import FurnitureLayer from './FurnitureLayer';
import { PX_PER_FT, svgToM, pxToFt, snapToGrid, getFloorDimensions, M_TO_FT } from '../utils/transform';

const GRID_FT = PX_PER_FT;
const GRID_5FT = PX_PER_FT * 5;

const DEFAULT_WALL_THICKNESS = 0.1;                    // meters ≈ 4"
const WALL_HALF_LENGTH_M = 2.5 / M_TO_FT;             // half of 5' in meters
const DOOR_WIDTH_M = (8 / 3) / M_TO_FT;               // 2'8" = 32" in meters
const WINDOW_WIDTH_M = 3 / M_TO_FT;                   // 3'0" in meters
const SNAP_THRESHOLD_M = 1 / M_TO_FT;                 // 1 foot snap radius

function GhostFurniture({ template, mousePos, snap }) {
  if (!template || !mousePos) return null;
  let x = mousePos.x;
  let y = mousePos.y;
  if (snap) {
    x = snapToGrid(x);
    y = snapToGrid(y);
  }
  const px = x * PX_PER_FT;
  const py = y * PX_PER_FT;
  const pw = template.width * PX_PER_FT;
  const ph = template.height * PX_PER_FT;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect
        x={px - pw / 2} y={py - ph / 2} width={pw} height={ph}
        fill={template.color} fillOpacity={0.5}
        stroke="#2196F3" strokeWidth={1} strokeDasharray="4,2" rx={1}
      />
      <text x={px} y={py} textAnchor="middle" dominantBaseline="middle" fontSize={8} fill="#333">
        {template.label}
      </text>
    </g>
  );
}

export default function Canvas({
  floorPlan,
  furniture,
  selectedId,
  tool,
  pendingTemplate,
  snap,
  editWalls,
  selectedWallChild,
  onSelectFurniture,
  onUpdateFurniture,
  onPlaceFurniture,
  onDragWallEndpoint,
  onSelectWallChild,
  onUpdateWallChild,
  onBeginDrag,
  onEndDrag,
  wallSubTool,
  onAddWall,
  onAddWallChild,
  selectedWallId,
  onSelectWall,
  unit = 'ft',
}) {
  const svgRef = useRef(null);
  const { zoom, pan, fitToRect, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleKeyDown, handleKeyUp } = usePanZoom(1);
  const [mouseFloorPos, setMouseFloorPos] = useState(null);
  const wallDragRef = useRef(null);
  const wallChildDragRef = useRef(null);
  const wasPanningRef = useRef(false);
  const didFitRef = useRef(false);

  useEffect(() => {
    if (!floorPlan || didFitRef.current) return;
    const svg = svgRef.current;
    if (!svg) return;
    const { width: fw, height: fh } = getFloorDimensions(floorPlan.floors[0].bounds);
    const { width: vw, height: vh } = svg.getBoundingClientRect();
    if (vw === 0 || vh === 0) return;
    fitToRect(fw, fh, vw, vh);
    didFitRef.current = true;
  }, [floorPlan, fitToRect]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const screenToSVG = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top  - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const svgToFeet = useCallback(({ x, y }) => ({
    x: pxToFt(x),
    y: pxToFt(y),
  }), []);

  // Start dragging a wall child (door or window) along its wall
  const startWallChildDrag = useCallback((wallId, childId, rect, spine, e) => {
    e.stopPropagation();
    wallChildDragRef.current = {
      wallId,
      childId,
      spine,           // [[x1m,y1m],[x2m,y2m]] — immutable during drag
      halfWidthM: rect.size[0] / 2,
      originalRect: rect,
    };
    onBeginDrag?.();
  }, [onBeginDrag]);

  const handleSVGMouseDown = useCallback((e) => {
    if (handleMouseDown(e, tool)) {
      wasPanningRef.current = true;
      return;
    }
    wasPanningRef.current = false;

    if (tool === 'place' && pendingTemplate && e.button === 0) return;

    if (e.button === 0 && e.target === svgRef.current) {
      onSelectFurniture(null);
      if (editWalls) {
        onSelectWallChild(null, null);
        onSelectWall(null);
      }
    }
  }, [handleMouseDown, tool, pendingTemplate, onSelectFurniture, editWalls, onSelectWallChild, onSelectWall]);

  const handleSVGMouseMove = useCallback((e) => {
    if (handleMouseMove(e)) return;

    // Wall endpoint drag
    if (wallDragRef.current) {
      const pos = screenToSVG(e.clientX, e.clientY);
      const { bounds } = floorPlan.floors[0];
      let [mx, my] = svgToM(pos.x, pos.y, bounds);

      // Axis-snap to nearby wall endpoints (15 screen-pixel threshold)
      const { wallId, endpointIdx } = wallDragRef.current;
      const snapM = 15 / (zoom * M_TO_FT * PX_PER_FT);
      let bestDx = snapM, bestDy = snapM;
      for (const wall of floorPlan.floors[0].walls) {
        for (let i = 0; i < wall.spine.segment.length; i++) {
          if (wall.id === wallId && i === endpointIdx) continue; // skip self
          const [px, py] = wall.spine.segment[i];
          const dx = Math.abs(px - mx);
          const dy = Math.abs(py - my);
          if (dx < bestDx) { bestDx = dx; mx = px; }
          if (dy < bestDy) { bestDy = dy; my = py; }
        }
      }

      onDragWallEndpoint(wallId, endpointIdx, mx, my);
      return;
    }

    // Wall child (door/window) drag — project mouse onto wall spine
    if (wallChildDragRef.current) {
      const { wallId, childId, spine, halfWidthM, originalRect } = wallChildDragRef.current;
      const pos = screenToSVG(e.clientX, e.clientY);
      const { bounds } = floorPlan.floors[0];
      const [mx, my] = svgToM(pos.x, pos.y, bounds);

      const [[x1, y1], [x2, y2]] = spine;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      const wallLen = Math.sqrt(lenSq);

      let t = lenSq > 0 ? ((mx - x1) * dx + (my - y1) * dy) / lenSq : 0.5;
      const tMin = wallLen > 0 ? halfWidthM / wallLen : 0;
      const tMax = wallLen > 0 ? 1 - halfWidthM / wallLen : 1;
      t = Math.max(tMin, Math.min(tMax, t));

      const newCenter = [x1 + t * dx, y1 + t * dy];
      onUpdateWallChild(wallId, childId, {
        shape: { rectangle: { ...originalRect, center: newCenter } },
      });
      return;
    }

    // Ghost furniture preview
    if (tool === 'place' && pendingTemplate) {
      const pos = screenToSVG(e.clientX, e.clientY);
      setMouseFloorPos(svgToFeet(pos));
    }
  }, [handleMouseMove, screenToSVG, svgToFeet, tool, pendingTemplate, floorPlan,
      onDragWallEndpoint, onUpdateWallChild]);

  // Handle click on a wall line to place a door or window
  const handleWallLineClick = useCallback((wallId, spine, wallThickness, e) => {
    const type = wallSubTool === 'addDoor' ? 'door' : 'window';
    const widthM = type === 'door' ? DOOR_WIDTH_M : WINDOW_WIDTH_M;

    const pos = screenToSVG(e.clientX, e.clientY);
    const { bounds } = floorPlan.floors[0];
    const [mx, my] = svgToM(pos.x, pos.y, bounds);

    const [[x1, y1], [x2, y2]] = spine;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const wallLen = Math.sqrt(lenSq);

    let t = lenSq > 0 ? ((mx - x1) * dx + (my - y1) * dy) / lenSq : 0.5;
    const halfW = widthM / 2;
    t = Math.max(halfW / wallLen, Math.min(1 - halfW / wallLen, t));

    const center = [x1 + t * dx, y1 + t * dy];
    const rotation = Math.atan2(dy, dx) * 180 / Math.PI;

    onAddWallChild(wallId, type, {
      center,
      size: [widthM, wallThickness],
      rotation,
    });
  }, [wallSubTool, screenToSVG, floorPlan, onAddWallChild]);

  const handleSVGMouseUp = useCallback((e) => {
    const didPan = wasPanningRef.current;
    wasPanningRef.current = false;
    handleMouseUp();

    const wasWallDrag = !!(wallDragRef.current || wallChildDragRef.current);
    if (wallDragRef.current || wallChildDragRef.current) {
      onEndDrag?.();
    }
    wallDragRef.current = null;
    wallChildDragRef.current = null;

    if (tool === 'place' && pendingTemplate && e.button === 0) {
      const pos = screenToSVG(e.clientX, e.clientY);
      let ft = svgToFeet(pos);
      if (snap) {
        ft.x = snapToGrid(ft.x);
        ft.y = snapToGrid(ft.y);
      }
      onPlaceFurniture({ ...pendingTemplate, x: ft.x, y: ft.y });
      return;
    }

    // Draw new wall on click (not after a drag or pan)
    if (!didPan && !wasWallDrag && editWalls && wallSubTool === 'draw' && e.button === 0 && floorPlan) {
      const pos = screenToSVG(e.clientX, e.clientY);
      const { bounds } = floorPlan.floors[0];
      let [mx, my] = svgToM(pos.x, pos.y, bounds);

      // Snap center to nearest existing wall endpoint within 1 foot
      let bestDist = SNAP_THRESHOLD_M;
      for (const wall of floorPlan.floors[0].walls) {
        for (const pt of wall.spine.segment) {
          const d = Math.hypot(pt[0] - mx, pt[1] - my);
          if (d < bestDist) {
            bestDist = d;
            mx = pt[0];
            my = pt[1];
          }
        }
      }

      onAddWall({
        spine: { segment: [[mx - WALL_HALF_LENGTH_M, my], [mx + WALL_HALF_LENGTH_M, my]] },
        thickness: DEFAULT_WALL_THICKNESS,
      });
    }
  }, [handleMouseUp, tool, pendingTemplate, screenToSVG, svgToFeet, snap, onPlaceFurniture,
      editWalls, wallSubTool, floorPlan, onAddWall, onEndDrag]);

  const handleSVGWheel = useCallback((e) => {
    handleWheel(e, svgRef.current.getBoundingClientRect());
  }, [handleWheel]);

  const startWallEndpointDrag = useCallback((wallId, endpointIdx, e) => {
    e.stopPropagation();
    wallDragRef.current = { wallId, endpointIdx };
    onBeginDrag?.();
  }, [onBeginDrag]);

  const bounds = floorPlan?.floors[0]?.bounds;
  const { width: floorW, height: floorH } = floorPlan
    ? getFloorDimensions(bounds)
    : { width: 0, height: 0 };

  const isWallAddMode = wallSubTool === 'draw' || wallSubTool === 'addDoor' || wallSubTool === 'addWindow';
  const cursor = tool === 'pan' ? 'grab'
    : tool === 'place' ? 'crosshair'
    : isWallAddMode ? 'crosshair'
    : 'default';

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', display: 'block', background: 'var(--bg-canvas)', cursor }}
      onMouseDown={handleSVGMouseDown}
      onMouseMove={handleSVGMouseMove}
      onMouseUp={handleSVGMouseUp}
      onWheel={handleSVGWheel}
      onMouseLeave={() => setMouseFloorPos(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern id="smallGrid" width={GRID_FT} height={GRID_FT} patternUnits="userSpaceOnUse">
          <path d={`M ${GRID_FT} 0 L 0 0 0 ${GRID_FT}`} fill="none" stroke="var(--grid-minor)" strokeWidth={0.4} />
        </pattern>
        <pattern id="bigGrid" width={GRID_5FT} height={GRID_5FT} patternUnits="userSpaceOnUse">
          <rect width={GRID_5FT} height={GRID_5FT} fill="url(#smallGrid)" />
          <path d={`M ${GRID_5FT} 0 L 0 0 0 ${GRID_5FT}`} fill="none" stroke="var(--grid-major)" strokeWidth={0.8} />
        </pattern>
      </defs>

      <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
        <rect x={-200} y={-200} width={floorW + 400} height={floorH + 400} fill="url(#bigGrid)" />

        {floorPlan && (
          <FloorPlanLayer
            floorPlan={floorPlan}
            editWalls={editWalls}
            onDragWallEndpoint={startWallEndpointDrag}
            selectedWallChild={selectedWallChild}
            onSelectWallChild={onSelectWallChild}
            onStartWallChildDrag={startWallChildDrag}
            wallSubTool={wallSubTool}
            onWallLineClick={handleWallLineClick}
            selectedWallId={selectedWallId}
            onSelectWall={onSelectWall}
          />
        )}

        <FurnitureLayer
          furniture={furniture}
          selectedId={selectedId}
          zoom={zoom}
          onSelect={onSelectFurniture}
          onUpdateItem={onUpdateFurniture}
          onBeginDrag={onBeginDrag}
          onEndDrag={onEndDrag}
          unit={unit}
        />

        {tool === 'place' && (
          <GhostFurniture template={pendingTemplate} mousePos={mouseFloorPos} snap={snap} />
        )}
      </g>
    </svg>
  );
}
