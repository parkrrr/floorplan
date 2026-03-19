import { useRef, useCallback } from 'react';
import { ftToPx, pxToFt, formatFeet } from '../utils/transform';

const HANDLE_SIZE = 6; // resize handle size in unzoomed px
const MIN_SIZE_FT = 0.5;

function ResizeHandle({ x, y, cursor, onMouseDown }) {
  return (
    <rect
      x={x - HANDLE_SIZE / 2}
      y={y - HANDLE_SIZE / 2}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill="white"
      stroke="#2196F3"
      strokeWidth={1}
      style={{ cursor }}
      onMouseDown={onMouseDown}
    />
  );
}

function DimensionLabel({ x, y, text, above = true }) {
  return (
    <text
      x={x}
      y={above ? y - 4 : y + 12}
      textAnchor="middle"
      fontSize={8}
      fill="#333"
      style={{ userSelect: 'none', pointerEvents: 'none' }}
    >
      {text}
    </text>
  );
}

function FurnitureItem({ item, selected, zoom, onSelect, onStartMove, onStartResize }) {
  const px = ftToPx(item.x);
  const py = ftToPx(item.y);
  const pw = ftToPx(item.width);
  const ph = ftToPx(item.height);

  const handleItemMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(item.id);
    onStartMove(item.id, e);
  };

  const handleResizeMouseDown = (corner) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    onStartResize(item.id, corner, e);
  };

  // Resize handle positions (corners)
  const handles = [
    { id: 'nw', x: px - pw / 2, y: py - ph / 2, cursor: 'nw-resize' },
    { id: 'ne', x: px + pw / 2, y: py - ph / 2, cursor: 'ne-resize' },
    { id: 'se', x: px + pw / 2, y: py + ph / 2, cursor: 'se-resize' },
    { id: 'sw', x: px - pw / 2, y: py + ph / 2, cursor: 'sw-resize' },
  ];

  return (
    <g transform={`rotate(${item.rotation ?? 0}, ${px}, ${py})`}>
      {/* Body */}
      <rect
        x={px - pw / 2}
        y={py - ph / 2}
        width={pw}
        height={ph}
        fill={item.color ?? '#c8a882'}
        fillOpacity={0.85}
        stroke={selected ? '#2196F3' : '#7a6048'}
        strokeWidth={selected ? 1.5 : 1}
        rx={1}
        style={{ cursor: 'move' }}
        onMouseDown={handleItemMouseDown}
      />
      {/* Label */}
      <text
        x={px}
        y={py}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={Math.max(6, Math.min(10, pw / item.label.length * 1.4))}
        fill="#3a2a1a"
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {item.label}
      </text>
      {/* Selection state */}
      {selected && (
        <>
          {/* Dimensions */}
          <DimensionLabel x={px} y={py - ph / 2} text={formatFeet(item.width)} above={true} />
          <text
            x={px + pw / 2 + 4}
            y={py}
            textAnchor="start"
            dominantBaseline="middle"
            fontSize={8}
            fill="#333"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {formatFeet(item.height)}
          </text>
          {/* Resize handles */}
          {handles.map(h => (
            <ResizeHandle
              key={h.id}
              x={h.x}
              y={h.y}
              cursor={h.cursor}
              onMouseDown={handleResizeMouseDown(h.id)}
            />
          ))}
        </>
      )}
    </g>
  );
}

export default function FurnitureLayer({
  furniture,
  selectedId,
  zoom,
  onSelect,
  onUpdateItem,
  onBeginDrag,
  onEndDrag,
}) {
  const dragRef = useRef(null);

  const getSVGCoords = useCallback((e, svgEl) => {
    const rect = svgEl.getBoundingClientRect();
    return {
      clientX: e.clientX,
      clientY: e.clientY,
    };
  }, []);

  const startMove = useCallback((id, e) => {
    const item = furniture.find(f => f.id === id);
    if (!item) return;
    dragRef.current = {
      type: 'move',
      id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: item.x,
      startY: item.y,
    };
    onBeginDrag?.();
  }, [furniture, onBeginDrag]);

  const startResize = useCallback((id, corner, e) => {
    const item = furniture.find(f => f.id === id);
    if (!item) return;
    dragRef.current = {
      type: 'resize',
      id,
      corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: item.x,
      startY: item.y,
      startWidth: item.width,
      startHeight: item.height,
    };
    onBeginDrag?.();
  }, [furniture, onBeginDrag]);

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const dx = pxToFt((e.clientX - dragRef.current.startMouseX) / zoom);
    const dy = pxToFt((e.clientY - dragRef.current.startMouseY) / zoom);

    if (dragRef.current.type === 'move') {
      onUpdateItem(dragRef.current.id, {
        x: dragRef.current.startX + dx,
        y: dragRef.current.startY + dy,
      });
    } else if (dragRef.current.type === 'resize') {
      const { corner, startX, startY, startWidth, startHeight } = dragRef.current;
      let newW = startWidth;
      let newH = startHeight;
      let newX = startX;
      let newY = startY;

      if (corner.includes('e')) newW = Math.max(MIN_SIZE_FT, startWidth + dx);
      if (corner.includes('w')) { newW = Math.max(MIN_SIZE_FT, startWidth - dx); newX = startX + (startWidth - newW) / 2; }
      if (corner.includes('s')) newH = Math.max(MIN_SIZE_FT, startHeight + dy);
      if (corner.includes('n')) { newH = Math.max(MIN_SIZE_FT, startHeight - dy); newY = startY + (startHeight - newH) / 2; }

      onUpdateItem(dragRef.current.id, { x: newX, y: newY, width: newW, height: newH });
    }
  }, [zoom, onUpdateItem]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      onEndDrag?.();
    }
    dragRef.current = null;
  }, [onEndDrag]);

  return (
    <g
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {furniture.map(item => (
        <FurnitureItem
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          zoom={zoom}
          onSelect={onSelect}
          onStartMove={startMove}
          onStartResize={startResize}
        />
      ))}
    </g>
  );
}
