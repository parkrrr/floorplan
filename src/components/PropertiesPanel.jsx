import './PropertiesPanel.css';
import { formatDimension } from '../utils/transform';

export default function PropertiesPanel({ item, onUpdate, onDelete, onReorder, unit = 'ft' }) {
  if (!item) {
    return (
      <div className="props-panel props-empty">
        <p>Select a furniture item to edit its properties.</p>
      </div>
    );
  }

  const handleChange = (field) => (e) => {
    let val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      if (unit === 'in') val = val / 12;
      onUpdate(item.id, { [field]: val });
    }
  };

  const handleLabelChange = (e) => {
    onUpdate(item.id, { label: e.target.value });
  };

  const handleRotationChange = (e) => {
    onUpdate(item.id, { rotation: parseFloat(e.target.value) || 0 });
  };

  const handleColorChange = (e) => {
    onUpdate(item.id, { color: e.target.value });
  };

  return (
    <div className="props-panel">
      <div className="props-title">Properties</div>

      <div className="props-field">
        <label>Label</label>
        <input
          type="text"
          value={item.label}
          onChange={handleLabelChange}
          className="props-input"
        />
      </div>

      <div className="props-row">
        <div className="props-field">
          <label>Width</label>
          <div className="props-input-group">
            <input
              type="number"
              value={unit === 'in' ? Math.round(item.width * 12) : Math.round(item.width * 12) / 12}
              min={unit === 'in' ? 6 : 0.5}
              step={unit === 'in' ? 3 : 0.25}
              onChange={handleChange('width')}
              className="props-input"
            />
            <span className="props-unit">{unit}</span>
          </div>
          <span className="props-hint">{formatDimension(item.width, unit)}</span>
        </div>
        <div className="props-field">
          <label>Depth</label>
          <div className="props-input-group">
            <input
              type="number"
              value={unit === 'in' ? Math.round(item.height * 12) : Math.round(item.height * 12) / 12}
              min={unit === 'in' ? 6 : 0.5}
              step={unit === 'in' ? 3 : 0.25}
              onChange={handleChange('height')}
              className="props-input"
            />
            <span className="props-unit">{unit}</span>
          </div>
          <span className="props-hint">{formatDimension(item.height, unit)}</span>
        </div>
      </div>

      <div className="props-field">
        <label>Rotation</label>
        <div className="props-input-group">
          <input
            type="number"
            value={item.rotation ?? 0}
            step={15}
            min={-180}
            max={180}
            onChange={handleRotationChange}
            className="props-input"
          />
          <span className="props-unit">°</span>
        </div>
        <input
          type="range"
          min={-180}
          max={180}
          step={15}
          value={item.rotation ?? 0}
          onChange={handleRotationChange}
          className="props-slider"
        />
      </div>

      <div className="props-field">
        <label>Color</label>
        <div className="props-input-group">
          <input
            type="color"
            value={item.color ?? '#c4a882'}
            onChange={handleColorChange}
            className="props-color"
          />
          <span className="props-colorlabel">{item.color ?? '#c4a882'}</span>
        </div>
      </div>

      <div className="props-stats">
        <div className="props-stat">
          <span>Area</span>
          <strong>{(item.width * item.height).toFixed(1)} sq ft</strong>
        </div>
        <div className="props-stat">
          <span>Position</span>
          <strong>{formatDimension(item.x, unit)}, {formatDimension(item.y, unit)}</strong>
        </div>
      </div>

      <div className="props-field">
        <label>Layer order</label>
        <div className="props-order-row">
          <button className="props-order-btn" onClick={() => onReorder(item.id, 'back')} title="Send to Back">
            ↙ Back
          </button>
          <button className="props-order-btn" onClick={() => onReorder(item.id, 'front')} title="Bring to Front">
            ↗ Front
          </button>
        </div>
      </div>

      <button className="props-delete" onClick={() => onDelete(item.id)}>
        Delete
      </button>
    </div>
  );
}
