import { mToSVG, polygonPoints, M_TO_FT, PX_PER_FT } from '../utils/transform';

const ROOM_VARS = {
  finished: 'var(--room-finished)',
  inaccessible: 'var(--room-inaccessible)',
};

const WALL_ENDPOINT_COLOR = '#c0392b';

function RoomPolygon({ room, bounds }) {
  const points = polygonPoints(room.shape.polygon, bounds);
  const fill = ROOM_VARS[room.type] ?? ROOM_VARS.finished;
  return <polygon points={points} style={{ fill }} stroke="none" />;
}

// Window drawn relative to (0,0) — caller provides transform
function WindowBody({ w, h }) {
  const laneH = h / 3;
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} style={{ fill: 'var(--window-fill)' }} />
      <line x1={-w / 2} y1={-laneH} x2={w / 2} y2={-laneH} stroke="#7ab" strokeWidth={0.8} />
      <line x1={-w / 2} y1={0}      x2={w / 2} y2={0}      stroke="#7ab" strokeWidth={0.8} />
      <line x1={-w / 2} y1={laneH}  x2={w / 2} y2={laneH}  stroke="#7ab" strokeWidth={0.8} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke="#5599bb" strokeWidth={0.8} />
    </>
  );
}

// Door drawn relative to (0,0) — caller provides transform
// swingDir: 1 = arc toward +local Y, -1 = toward -local Y, 0 = no arc
// mirrored: flips hinge from left end to right end
function DoorBody({ w, h, swingDir = 1, mirrored = false }) {
  const arcY = swingDir * w;
  // Not mirrored: hinge at (-w/2,0), free end sweeps from (w/2,0)
  // Mirrored:     hinge at ( w/2,0), free end sweeps from (-w/2,0)
  const startX = mirrored ? -w / 2 : w / 2;
  const endX   = mirrored ?  w / 2 : -w / 2;
  const sweepFlag = mirrored ? (swingDir > 0 ? 0 : 1) : (swingDir > 0 ? 1 : 0);
  const arcPath = swingDir !== 0
    ? `M ${startX},0 A ${w},${w} 0 0 ${sweepFlag} ${endX},${arcY}`
    : null;
  return (
    <>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} style={{ fill: 'var(--door-fill)' }} />
      <line x1={-w / 2} y1={0} x2={w / 2} y2={0} stroke="#888" strokeWidth={1} />
      {arcPath && (
        <path d={arcPath} fill="none" stroke="#888" strokeWidth={0.7} strokeDasharray="3,2" />
      )}
    </>
  );
}

function WallChild({ child, bounds, wallThickness, wallId, selected, editMode, onSelect, onStartDrag }) {
  const { center, size, rotation } = child.shape.rectangle;
  const [cx, cy] = mToSVG(center[0], center[1], bounds);
  const w = size[0] * M_TO_FT * PX_PER_FT;
  const h = wallThickness;

  const handleMouseDown = (e) => {
    if (!editMode || e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    onStartDrag(e);
  };

  return (
    <g
      transform={`translate(${cx},${cy}) rotate(${rotation})`}
      onMouseDown={handleMouseDown}
      style={{ cursor: editMode ? 'grab' : 'default' }}
    >
      {child.type === 'window' && <WindowBody w={w} h={h} />}
      {child.type === 'door'   && <DoorBody   w={w} h={h} swingDir={child.swingDir ?? 1} mirrored={child.mirrored ?? false} />}

      {/* Selection highlight */}
      {selected && editMode && (
        <rect
          x={-w / 2 - 2} y={-h / 2 - 2}
          width={w + 4} height={h + 4}
          fill="none"
          stroke="#2196F3"
          strokeWidth={1.5}
          strokeDasharray="4,2"
          rx={2}
          style={{ pointerEvents: 'none' }}
        />
      )}
    </g>
  );
}

function WallEndpoint({ cx, cy, wallId, endpointIdx, onDrag }) {
  return (
    <circle
      cx={cx} cy={cy} r={4}
      fill={WALL_ENDPOINT_COLOR}
      stroke="white"
      strokeWidth={1}
      style={{ cursor: 'move' }}
      onMouseDown={(e) => { e.stopPropagation(); onDrag(wallId, endpointIdx, e); }}
    />
  );
}

function WallSegment({ wall, bounds, editMode, wallSubTool, selectedWallId, onDragEndpoint, selectedWallChild, onSelectChild, onStartChildDrag, onWallLineClick, onSelectWall }) {
  const [[x1m, y1m], [x2m, y2m]] = wall.spine.segment;
  const [x1, y1] = mToSVG(x1m, y1m, bounds);
  const [x2, y2] = mToSVG(x2m, y2m, bounds);
  const thickness = wall.thickness * M_TO_FT * PX_PER_FT;

  const isSelected = selectedWallId === wall.id;
  const selectMode = editMode && wallSubTool === 'select';

  return (
    <g>
      {/* Selection halo */}
      {isSelected && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="#2196F3"
          strokeWidth={thickness + 6}
          strokeLinecap="square"
          strokeOpacity={0.35}
          style={{ pointerEvents: 'none' }}
        />
      )}
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke="var(--wall-color)"
        strokeWidth={thickness}
        strokeLinecap="square"
        style={{ cursor: selectMode ? 'pointer' : 'default' }}
        onMouseDown={selectMode ? (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          onSelectWall(wall.id);
        } : undefined}
      />

      {wall.children.map(child => (
        <WallChild
          key={child.id}
          child={child}
          bounds={bounds}
          wallThickness={thickness}
          wallId={wall.id}
          selected={
            selectedWallChild?.wallId === wall.id &&
            selectedWallChild?.childId === child.id
          }
          editMode={editMode}
          onSelect={() => onSelectChild(wall.id, child.id)}
          onStartDrag={(e) => onStartChildDrag(wall.id, child.id, child.shape.rectangle, wall.spine.segment, e)}
        />
      ))}

      {editMode && (
        <>
          <WallEndpoint cx={x1} cy={y1} wallId={wall.id} endpointIdx={0} onDrag={onDragEndpoint} />
          <WallEndpoint cx={x2} cy={y2} wallId={wall.id} endpointIdx={1} onDrag={onDragEndpoint} />
        </>
      )}

      {/* Transparent wide hit area for placing doors/windows — rendered last so it sits on top */}
      {editMode && (wallSubTool === 'addDoor' || wallSubTool === 'addWindow') && (
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="transparent"
          strokeWidth={Math.max(thickness + 10, 18)}
          style={{ cursor: 'crosshair' }}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            onWallLineClick(wall.id, wall.spine.segment, wall.thickness, e);
          }}
        />
      )}
    </g>
  );
}

export default function FloorPlanLayer({
  floorPlan,
  editWalls,
  onDragWallEndpoint,
  selectedWallChild,
  onSelectWallChild,
  onStartWallChildDrag,
  wallSubTool,
  onWallLineClick,
  selectedWallId,
  onSelectWall,
}) {
  if (!floorPlan) return null;
  const floor = floorPlan.floors[0];
  const { bounds } = floor;

  return (
    <g>
      {floor.rooms.map(room => (
        <RoomPolygon key={room.id} room={room} bounds={bounds} />
      ))}
      {floor.walls.map(wall => (
        <WallSegment
          key={wall.id}
          wall={wall}
          bounds={bounds}
          editMode={editWalls}
          wallSubTool={wallSubTool}
          selectedWallId={selectedWallId}
          onDragEndpoint={onDragWallEndpoint}
          selectedWallChild={selectedWallChild}
          onSelectChild={onSelectWallChild}
          onStartChildDrag={onStartWallChildDrag}
          onWallLineClick={onWallLineClick}
          onSelectWall={onSelectWall}
        />
      ))}
    </g>
  );
}
