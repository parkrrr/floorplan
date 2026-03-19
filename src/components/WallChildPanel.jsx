import './WallChildPanel.css';

const SWING_OPTIONS = [
  { value: 1,  label: 'Side A' },
  { value: 0,  label: 'None'   },
  { value: -1, label: 'Side B' },
];

export default function WallChildPanel({ wallChild, onUpdateSwingDir, onToggleMirror, onDeleteChild }) {
  if (!wallChild) {
    return (
      <div className="wcp-panel wcp-empty">
        <p>Select a door or window in Walls mode to edit it.</p>
      </div>
    );
  }

  const isDoor = wallChild.type === 'door';
  const swingDir = wallChild.swingDir ?? 1;
  const mirrored = wallChild.mirrored ?? false;

  return (
    <div className="wcp-panel">
      <div className="wcp-title">{isDoor ? 'Door' : 'Window'}</div>

      <div className="wcp-info">
        <div className="wcp-info-row">
          <span>Width</span>
          <strong>
            {formatInches(wallChild.shape.rectangle.size[0])}
          </strong>
        </div>
        <div className="wcp-info-row">
          <span>Drag along wall to reposition</span>
        </div>
      </div>

      {isDoor && (
        <>
          <div className="wcp-section">
            <div className="wcp-section-label">Swing Direction</div>
            <div className="wcp-swing-buttons">
              {SWING_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`wcp-swing-btn ${swingDir === opt.value ? 'active' : ''}`}
                  onClick={() => onUpdateSwingDir(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="wcp-swing-hint">
              {swingDir === 0
                ? 'No swing arc shown'
                : `Arc swings toward ${swingDir === 1 ? 'side A' : 'side B'}`}
            </div>
          </div>

          <div className="wcp-section">
            <div className="wcp-section-label">Hinge Side</div>
            <button
              className={`wcp-swing-btn${mirrored ? ' active' : ''}`}
              style={{ flex: 'none' }}
              onClick={onToggleMirror}
            >
              {mirrored ? '⇄ Mirrored' : '⇄ Mirror'}
            </button>
          </div>
        </>
      )}
      <button className="props-delete" onClick={onDeleteChild}>
        Delete {isDoor ? 'Door' : 'Window'}
      </button>
    </div>
  );
}

function formatInches(meters) {
  const totalInches = Math.round(meters * 39.3701);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (inches === 0) return `${feet}'`;
  return `${feet}' ${inches}"`;
}
