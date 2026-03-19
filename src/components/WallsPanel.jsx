import './WallsPanel.css';

const TOOLS = [
  {
    id: 'draw',
    label: 'Draw Wall',
    hint: "Click canvas to place a 5' wall",
  },
  {
    id: 'addDoor',
    label: 'Add Door',
    hint: "Click a wall to add a 2'8\" door",
  },
  {
    id: 'addWindow',
    label: 'Add Window',
    hint: "Click a wall to add a 3' window",
  },
];

export default function WallsPanel({ wallSubTool, onWallSubToolChange }) {
  const active = TOOLS.find(t => t.id === wallSubTool);

  return (
    <div className="wtools-panel">
      <div className="wtools-title">Wall Tools</div>
      <div className="wtools-buttons">
        {TOOLS.map(t => (
          <button
            key={t.id}
            className={`wtools-btn ${wallSubTool === t.id ? 'active' : ''}`}
            title={t.hint}
            onClick={() => onWallSubToolChange(wallSubTool === t.id ? 'select' : t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="wtools-hint">
        {active ? active.hint : 'Select a tool above, or select and drag wall endpoints.'}
      </div>
    </div>
  );
}
