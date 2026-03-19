import { useState, useCallback, useRef, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import FurniturePalette from './components/FurniturePalette';
import PropertiesPanel from './components/PropertiesPanel';
import WallChildPanel from './components/WallChildPanel';
import { useHistory } from './hooks/useHistory';
import WallsPanel from './components/WallsPanel';
import './App.css';

let nextId = 1;
let nextWallId = 1;
let nextChildId = 1;

function parseFloorPlan(json) {
  if (!json.floors || !Array.isArray(json.floors) || json.floors.length === 0) {
    throw new Error('Invalid floor plan: missing floors array');
  }
  const floor = json.floors[0];
  if (!floor.bounds || !floor.rooms || !floor.walls) {
    throw new Error('Invalid floor plan: missing bounds, rooms, or walls');
  }
  return json;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const [floorPlan, setFloorPlan] = useState(null);
  const history = useHistory({ walls: [], furniture: [] });
  const walls = history.present.walls;
  const furniture = history.present.furniture;
  const isDraggingRef = useRef(false);
  const [selectedId, setSelectedId] = useState(null);          // furniture
  const [selectedWallChild, setSelectedWallChild] = useState(null); // { wallId, childId }
  const [tool, setTool] = useState('select');
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [snap, setSnap] = useState(true);
  const [editWalls, setEditWalls] = useState(false);
  const [wallSubTool, setWallSubTool] = useState('select');
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [error, setError] = useState(null);

  const handleNewCanvas = useCallback(() => {
    const emptyFloorPlan = {
      floors: [{ bounds: { xMin: 0, xMax: 20, yMin: 0, yMax: 15 }, rooms: [], walls: [] }],
    };
    setFloorPlan(emptyFloorPlan);
    history.reset({ walls: [], furniture: [] });
    setSelectedId(null);
    setSelectedWallChild(null);
    setTool('select');
    setPendingTemplate(null);
    setError(null);
  }, [history.reset]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        const parsed = parseFloorPlan(json);
        const isEnhanced = parsed.enhanced === true;

        const wallsCopy = parsed.floors[0].walls.map(w => ({
          ...w,
          spine: { segment: w.spine.segment.map(p => [...p]) },
          children: w.children.map(c => ({
            ...c,
            shape: { rectangle: { ...c.shape.rectangle, center: [...c.shape.rectangle.center] } },
            // Enhanced: preserve saved swingDir. Plain: initialize defaults.
            swingDir: isEnhanced
              ? (c.swingDir ?? (c.type === 'door' ? 1 : 0))
              : (c.type === 'door' ? 1 : 0),
            mirrored: isEnhanced ? (c.mirrored ?? false) : false,
          })),
        }));

        const loadedFurniture = isEnhanced && Array.isArray(parsed.furniture)
          ? parsed.furniture
          : [];

        // Keep nextId above any existing furniture IDs to avoid collisions
        if (loadedFurniture.length > 0) {
          const maxNum = loadedFurniture.reduce((max, f) => {
            const n = parseInt(String(f.id).replace(/\D/g, ''), 10);
            return isNaN(n) ? max : Math.max(max, n);
          }, 0);
          if (maxNum >= nextId) nextId = maxNum + 1;
        }

        // Keep nextWallId / nextChildId above existing IDs
        const maxWallNum = wallsCopy.reduce((max, w) => {
          const n = parseInt(String(w.id).replace(/\D/g, ''), 10);
          return isNaN(n) ? max : Math.max(max, n);
        }, 0);
        if (maxWallNum >= nextWallId) nextWallId = maxWallNum + 1;

        const maxChildNum = wallsCopy.reduce((max, w) =>
          w.children.reduce((m, c) => {
            const n = parseInt(String(c.id).replace(/\D/g, ''), 10);
            return isNaN(n) ? m : Math.max(m, n);
          }, max), 0);
        if (maxChildNum >= nextChildId) nextChildId = maxChildNum + 1;

        setFloorPlan(parsed);
        history.reset({ walls: wallsCopy, furniture: loadedFurniture });
        setSelectedId(null);
        setSelectedWallChild(null);
        setTool('select');
        setPendingTemplate(null);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };
    input.click();
  }, [history.reset]);

  const handleToolChange = useCallback((newTool) => {
    setTool(newTool);
    if (newTool !== 'place') setPendingTemplate(null);
    if (newTool === 'pan') {
      setSelectedId(null);
      setSelectedWallChild(null);
    }
  }, []);

  const handleSelectTemplate = useCallback((template) => {
    setTool('place');
    setPendingTemplate(template);
  }, []);

  const handleBeginDrag = useCallback(() => {
    if (!isDraggingRef.current) {
      isDraggingRef.current = true;
      history.beginDrag();
    }
  }, [history]);

  const handleEndDrag = useCallback(() => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      history.endDrag();
    }
  }, [history]);

  const handlePlaceFurniture = useCallback(({ x, y, label, width, height, color }) => {
    const newItem = { id: `f${nextId++}`, label, x, y, width, height, color, rotation: 0 };
    history.record({ walls, furniture: [...furniture, newItem] });
  }, [history, walls, furniture]);

  // Furniture selection — clears wall child selection
  const handleSelectFurniture = useCallback((id) => {
    setSelectedId(id);
    if (id !== null) setSelectedWallChild(null);
  }, []);

  const handleUpdateFurniture = useCallback((id, updates) => {
    const newFurniture = furniture.map(f => f.id === id ? { ...f, ...updates } : f);
    if (isDraggingRef.current) {
      history.update({ walls, furniture: newFurniture });
    } else {
      history.record({ walls, furniture: newFurniture });
    }
  }, [history, walls, furniture]);

  const handleDeleteFurniture = useCallback((id) => {
    history.record({ walls, furniture: furniture.filter(f => f.id !== id) });
    setSelectedId(null);
  }, [history, walls, furniture]);

  const handleDragWallEndpoint = useCallback((wallId, endpointIdx, newMx, newMy) => {
    const newWalls = walls.map(wall => {
      if (wall.id !== wallId) return wall;
      return {
        ...wall,
        spine: { segment: wall.spine.segment.map((pt, i) => i === endpointIdx ? [newMx, newMy] : [...pt]) },
      };
    });
    if (isDraggingRef.current) {
      history.update({ walls: newWalls, furniture });
    } else {
      history.record({ walls: newWalls, furniture });
    }
  }, [history, walls, furniture]);

  // Wall child selection — clears furniture and wall selection
  const handleSelectWallChild = useCallback((wallId, childId) => {
    if (wallId && childId) {
      setSelectedWallChild({ wallId, childId });
      setSelectedId(null);
      setSelectedWallId(null);
    } else {
      setSelectedWallChild(null);
    }
  }, []);

  // Wall body selection — clears furniture and child selection
  const handleSelectWall = useCallback((wallId) => {
    setSelectedWallId(wallId);
    setSelectedWallChild(null);
    setSelectedId(null);
  }, []);

  // Update a wall child (position or swingDir)
  const handleUpdateWallChild = useCallback((wallId, childId, updates) => {
    const newWalls = walls.map(wall => {
      if (wall.id !== wallId) return wall;
      return {
        ...wall,
        children: wall.children.map(child => {
          if (child.id !== childId) return child;
          if (updates.shape?.rectangle) {
            return {
              ...child,
              ...updates,
              shape: { rectangle: { ...child.shape.rectangle, ...updates.shape.rectangle } },
            };
          }
          return { ...child, ...updates };
        }),
      };
    });
    // Position drags go through update(); swingDir (no active drag) goes through record()
    if (isDraggingRef.current) {
      history.update({ walls: newWalls, furniture });
    } else {
      history.record({ walls: newWalls, furniture });
    }
  }, [history, walls, furniture]);

  const handleEditWallsToggle = useCallback(() => {
    setEditWalls(e => !e);
    setSelectedWallChild(null);
    setSelectedWallId(null);
    setWallSubTool('select');
  }, []);

  const handleDeleteWall = useCallback((wallId) => {
    history.record({ walls: walls.filter(w => w.id !== wallId), furniture });
    setSelectedWallId(null);
    setSelectedWallChild(null);
  }, [history, walls, furniture]);

  const handleDeleteWallChild = useCallback((wallId, childId) => {
    const newWalls = walls.map(w =>
      w.id === wallId ? { ...w, children: w.children.filter(c => c.id !== childId) } : w
    );
    history.record({ walls: newWalls, furniture });
    setSelectedWallChild(null);
  }, [history, walls, furniture]);

  const handleAddWall = useCallback((wallData) => {
    const newWall = { id: `w${nextWallId++}`, ...wallData, children: [] };
    history.record({ walls: [...walls, newWall], furniture });
  }, [history, walls, furniture]);

  const handleAddWallChild = useCallback((wallId, type, geom) => {
    const newChild = {
      id: `c${nextChildId++}`,
      type,
      shape: { rectangle: { center: geom.center, size: geom.size, rotation: geom.rotation } },
      swingDir: type === 'door' ? 1 : 0,
      mirrored: false,
    };
    const newWalls = walls.map(w =>
      w.id === wallId ? { ...w, children: [...w.children, newChild] } : w
    );
    history.record({ walls: newWalls, furniture });
  }, [history, walls, furniture]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        history.undo();
      } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  // Arrow key nudge — 1 inch per press; held keys collapse to one history entry
  const arrowDragActiveRef = useRef(false);
  useEffect(() => {
    const STEP = 1 / 12; // 1 inch in feet

    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteFurniture(selectedId);
        } else if (selectedWallChild) {
          e.preventDefault();
          handleDeleteWallChild(selectedWallChild.wallId, selectedWallChild.childId);
        } else if (selectedWallId) {
          e.preventDefault();
          handleDeleteWall(selectedWallId);
        }
        return;
      }

      // Arrow nudge — furniture only
      if (!selectedId) return;

      const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const dir = dirs[e.key];
      if (!dir) return;
      e.preventDefault();

      if (!e.repeat && !arrowDragActiveRef.current) {
        arrowDragActiveRef.current = true;
        history.beginDrag();
      }

      history.update({
        walls,
        furniture: furniture.map(f =>
          f.id === selectedId ? { ...f, x: f.x + dir[0] * STEP, y: f.y + dir[1] * STEP } : f
        ),
      });
    };

    const onKeyUp = (e) => {
      const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (!arrows.includes(e.key)) return;
      if (arrowDragActiveRef.current) {
        arrowDragActiveRef.current = false;
        history.endDrag();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [history, selectedId, selectedWallChild, selectedWallId, walls, furniture,
      handleDeleteFurniture, handleDeleteWallChild, handleDeleteWall]);

  // Merge edited walls back into floor plan for rendering
  const mergedFloorPlan = floorPlan ? {
    ...floorPlan,
    floors: floorPlan.floors.map((floor, i) =>
      i === 0 ? { ...floor, walls } : floor
    ),
  } : null;

  const selectedItem = furniture.find(f => f.id === selectedId) ?? null;

  // Resolve selectedWallChild to its actual object for the panel
  const resolvedWallChild = selectedWallChild
    ? walls.find(w => w.id === selectedWallChild.wallId)
        ?.children.find(c => c.id === selectedWallChild.childId) ?? null
    : null;

  const handleExport = useCallback(() => {
    if (!mergedFloorPlan) return;
    const exportData = { ...mergedFloorPlan, enhanced: true, furniture };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floor-plan-enhanced.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [mergedFloorPlan, furniture]);

  const showWallChildPanel = editWalls && selectedWallChild != null;
  const showWallPanel = editWalls && selectedWallId != null && !selectedWallChild;

  return (
    <div className="app">
      <Toolbar
        tool={tool}
        onToolChange={handleToolChange}
        snap={snap}
        onSnapToggle={() => setSnap(s => !s)}
        editWalls={editWalls}
        onEditWallsToggle={handleEditWallsToggle}
        onImport={handleImport}
        onExport={handleExport}
        floorLoaded={!!floorPlan}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        darkMode={darkMode}
        onDarkModeToggle={() => setDarkMode(d => !d)}
      />

      <div className="app-body">
        {floorPlan && (
          <div className="sidebar sidebar-left">
            {editWalls ? (
              <WallsPanel
                wallSubTool={wallSubTool}
                onWallSubToolChange={setWallSubTool}
              />
            ) : (
              <FurniturePalette
                activeTool={tool}
                pendingTemplate={pendingTemplate}
                onSelectTemplate={handleSelectTemplate}
              />
            )}
          </div>
        )}

        <div className="canvas-wrapper">
          {!floorPlan ? (
            <div className="empty-state">
              <div className="empty-icon">⬜</div>
              <h2>No floor plan loaded</h2>
              <p>Start with an empty canvas or import an existing floor plan.</p>
              <button className="empty-import-btn" onClick={handleNewCanvas}>
                New Empty Canvas
              </button>
              <button className="empty-secondary-btn" onClick={handleImport}>
                Import JSON
              </button>
              {error && <div className="empty-error">{error}</div>}
            </div>
          ) : (
            <Canvas
              floorPlan={mergedFloorPlan}
              furniture={furniture}
              selectedId={selectedId}
              tool={tool}
              pendingTemplate={pendingTemplate}
              snap={snap}
              editWalls={editWalls}
              selectedWallChild={selectedWallChild}
              onSelectFurniture={handleSelectFurniture}
              onUpdateFurniture={handleUpdateFurniture}
              onPlaceFurniture={handlePlaceFurniture}
              onDragWallEndpoint={handleDragWallEndpoint}
              onSelectWallChild={handleSelectWallChild}
              onUpdateWallChild={handleUpdateWallChild}
              onBeginDrag={handleBeginDrag}
              onEndDrag={handleEndDrag}
              wallSubTool={wallSubTool}
              onAddWall={handleAddWall}
              onAddWallChild={handleAddWallChild}
              selectedWallId={selectedWallId}
              onSelectWall={handleSelectWall}
            />
          )}
        </div>

        {floorPlan && (
          <div className="sidebar sidebar-right">
            {showWallChildPanel ? (
              <WallChildPanel
                wallChild={resolvedWallChild}
                onUpdateSwingDir={(dir) =>
                  handleUpdateWallChild(
                    selectedWallChild.wallId,
                    selectedWallChild.childId,
                    { swingDir: dir }
                  )
                }
                onToggleMirror={() =>
                  handleUpdateWallChild(
                    selectedWallChild.wallId,
                    selectedWallChild.childId,
                    { mirrored: !(resolvedWallChild?.mirrored ?? false) }
                  )
                }
                onDeleteChild={() =>
                  handleDeleteWallChild(
                    selectedWallChild.wallId,
                    selectedWallChild.childId,
                  )
                }
              />
            ) : showWallPanel ? (
              <div className="wcp-panel">
                <div className="wcp-title">Wall</div>
                <div className="wcp-info">
                  <div className="wcp-info-row">
                    <span>Click and drag endpoints to resize</span>
                  </div>
                </div>
                <button
                  className="props-delete"
                  onClick={() => handleDeleteWall(selectedWallId)}
                >
                  Delete Wall
                </button>
              </div>
            ) : (
              <PropertiesPanel
                item={selectedItem}
                onUpdate={handleUpdateFurniture}
                onDelete={handleDeleteFurniture}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
