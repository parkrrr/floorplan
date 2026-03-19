import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

// Manages undo/redo for a combined { walls, furniture } state.
// Drag operations (many rapid updates) are collapsed into a single history entry:
//   beginDrag() → snapshot state before drag
//   update()    → update present without recording (called on every mousemove)
//   endDrag()   → compare present to snapshot; record one entry if anything changed
// Non-drag operations use record() which always adds an entry.
export function useHistory(initialState) {
  const [past, setPast] = useState([]);
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState([]);
  const dragSnapshotRef = useRef(null);

  // Record an immediate action (place, delete, swing direction, etc.)
  const record = useCallback((newPresent) => {
    setPast(prev => [...prev.slice(-(MAX_HISTORY - 1)), present]);
    setPresent(newPresent);
    setFuture([]);
  }, [present]);

  // Update present during a drag without recording (called on mousemove)
  const update = useCallback((newPresent) => {
    setPresent(newPresent);
  }, []);

  // Snapshot state at drag start
  const beginDrag = useCallback(() => {
    dragSnapshotRef.current = present;
  }, [present]);

  // Commit drag: record a single history entry if anything changed
  const endDrag = useCallback(() => {
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;
    if (snapshot === null) return;
    // Use functional updater to compare against latest present
    setPresent(currentPresent => {
      if (snapshot.walls !== currentPresent.walls || snapshot.furniture !== currentPresent.furniture) {
        setPast(prev => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);
        setFuture([]);
      }
      return currentPresent; // present is already correct
    });
  }, []);

  const undo = useCallback(() => {
    setPast(prev => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1];
      const newPast = prev.slice(0, -1);
      setFuture(f => [present, ...f]);
      setPresent(target);
      return newPast;
    });
  }, [present]);

  const redo = useCallback(() => {
    setFuture(prev => {
      if (prev.length === 0) return prev;
      const [target, ...newFuture] = prev;
      setPast(p => [...p, present]);
      setPresent(target);
      return newFuture;
    });
  }, [present]);

  // Called on fresh import — wipes history
  const reset = useCallback((newPresent) => {
    setPast([]);
    setPresent(newPresent);
    setFuture([]);
    dragSnapshotRef.current = null;
  }, []);

  return {
    present,
    record,
    update,
    beginDrag,
    endDrag,
    undo,
    redo,
    reset,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
