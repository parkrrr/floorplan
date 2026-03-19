import './Toolbar.css';

export default function Toolbar({
  tool,
  onToolChange,
  snap,
  onSnapToggle,
  editWalls,
  onEditWallsToggle,
  onImport,
  onExport,
  floorLoaded,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  darkMode,
  onDarkModeToggle,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="toolbar-brand">FloorPlan</button>
        <button className="toolbar-btn primary" onClick={onImport} title="Import floor plan JSON (plain or enhanced)">
          Import JSON
        </button>
        {floorLoaded && (
          <button className="toolbar-btn" onClick={onExport} title="Export enhanced floor plan JSON with furniture">
            Export JSON
          </button>
        )}
        {floorLoaded && (
          <>
            <button
              className="toolbar-btn icon"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
            >
              ⟲ Undo
            </button>
            <button
              className="toolbar-btn icon"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
            >
              ⟳ Redo
            </button>
          </>
        )}
      </div>

      {floorLoaded && (
        <div className="toolbar-center">
          <div className="toolbar-group">
            <button
              className={`toolbar-btn icon ${tool === 'select' ? 'active' : ''}`}
              onClick={() => onToolChange('select')}
              title="Select & Move (V)"
            >
              ↖ Select
            </button>
            <button
              className={`toolbar-btn icon ${tool === 'pan' ? 'active' : ''}`}
              onClick={() => onToolChange('pan')}
              title="Pan (P) — also: Space+drag or middle mouse"
            >
              ✥ Pan
            </button>
            <button
              className={`toolbar-btn icon ${tool === 'place' ? 'active' : ''}`}
              onClick={() => onToolChange('place')}
              title="Place furniture (choose from palette)"
            >
              + Place
            </button>
            <button
              className={`toolbar-btn icon walls ${editWalls ? 'active' : ''}`}
              onClick={onEditWallsToggle}
              title="Toggle wall editing mode"
            >
              ▦ Walls
            </button>
          </div>
        </div>
      )}

      <div className="toolbar-right">
        {floorLoaded && (
          <label className="toolbar-toggle" title="Snap furniture to 3-inch grid">
            <input
              type="checkbox"
              checked={snap}
              onChange={onSnapToggle}
            />
            Snap
          </label>
        )}
        <div className="toolbar-hint">
          Scroll: zoom · Space+drag or middle mouse: pan
        </div>
        <button
          className="toolbar-theme-btn"
          onClick={onDarkModeToggle}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {darkMode ? '☀' : '☾'}
        </button>
      </div>
    </div>
  );
}
