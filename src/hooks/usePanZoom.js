import { useState, useCallback, useRef } from 'react';

export function usePanZoom(initialZoom = 1, initialPan = { x: 0, y: 0 }) {
  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState(initialPan);
  const panningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);

  const startPan = useCallback((clientX, clientY) => {
    panningRef.current = true;
    lastPosRef.current = { x: clientX, y: clientY };
  }, []);

  const handleMouseDown = useCallback((e, tool) => {
    // Middle mouse or Space+left or pan tool
    if (e.button === 1 || (e.button === 0 && (tool === 'pan' || spaceDownRef.current))) {
      startPan(e.clientX, e.clientY);
      e.preventDefault();
      return true;
    }
    return false;
  }, [startPan]);

  const handleMouseMove = useCallback((e) => {
    if (!panningRef.current) return false;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    return true;
  }, []);

  const handleMouseUp = useCallback(() => {
    const wasPanning = panningRef.current;
    panningRef.current = false;
    return wasPanning;
  }, []);

  const handleWheel = useCallback((e, svgRect) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const mouseX = e.clientX - svgRect.left;
    const mouseY = e.clientY - svgRect.top;

    setZoom(prevZoom => {
      const newZoom = Math.max(0.15, Math.min(10, prevZoom * factor));
      const ratio = newZoom / prevZoom;
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * ratio,
        y: mouseY - (mouseY - p.y) * ratio,
      }));
      return newZoom;
    });
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.code === 'Space' && !e.repeat) {
      spaceDownRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (e.code === 'Space') {
      spaceDownRef.current = false;
      panningRef.current = false;
    }
  }, []);

  const fitToRect = useCallback((contentW, contentH, viewW, viewH, padding = 40) => {
    const scaleX = (viewW - padding * 2) / contentW;
    const scaleY = (viewH - padding * 2) / contentH;
    const newZoom = Math.min(scaleX, scaleY, 2);
    const newPanX = (viewW - contentW * newZoom) / 2;
    const newPanY = (viewH - contentH * newZoom) / 2;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, []);

  return {
    zoom,
    pan,
    setPan,
    setZoom,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
    handleKeyUp,
    fitToRect,
    isPanning: () => panningRef.current,
    isSpaceDown: () => spaceDownRef.current,
  };
}
