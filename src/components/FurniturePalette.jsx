import { useState } from 'react';
import './FurniturePalette.css';

export const FURNITURE_TEMPLATES = [
  // Seating
  { label: 'Sofa (3-seat)', width: 7, height: 3, color: '#c4a882', category: 'Seating' },
  { label: 'Sofa (4-seat)', width: 9, height: 3.5, color: '#c4a882', category: 'Seating' },
  { label: 'Loveseat', width: 4.5, height: 3, color: '#c4a882', category: 'Seating' },
  { label: 'Armchair', width: 2.75, height: 2.75, color: '#c4a882', category: 'Seating' },
  { label: 'Chaise', width: 5.5, height: 3, color: '#c4a882', category: 'Seating' },
  // Tables
  { label: 'Coffee Table', width: 4, height: 2, color: '#a07850', category: 'Tables' },
  { label: 'End Table', width: 1.75, height: 1.75, color: '#a07850', category: 'Tables' },
  { label: 'Dining (4-top)', width: 4, height: 3, color: '#a07850', category: 'Tables' },
  { label: 'Dining (6-top)', width: 6, height: 3, color: '#a07850', category: 'Tables' },
  { label: 'Dining (8-top)', width: 8, height: 3.5, color: '#a07850', category: 'Tables' },
  { label: 'Desk', width: 5, height: 2.5, color: '#a07850', category: 'Tables' },
  // Bedroom
  { label: 'Twin Bed', width: 3.17, height: 6.33, color: '#7a9bb8', category: 'Bedroom' },
  { label: 'Full Bed', width: 4.5, height: 6.33, color: '#7a9bb8', category: 'Bedroom' },
  { label: 'Queen Bed', width: 5, height: 6.67, color: '#7a9bb8', category: 'Bedroom' },
  { label: 'King Bed', width: 6.33, height: 6.67, color: '#7a9bb8', category: 'Bedroom' },
  { label: 'Dresser', width: 3.5, height: 1.5, color: '#7a9bb8', category: 'Bedroom' },
  { label: 'Nightstand', width: 1.75, height: 1.5, color: '#7a9bb8', category: 'Bedroom' },
  // Storage
  { label: 'Bookshelf', width: 3, height: 1, color: '#8a7a6a', category: 'Storage' },
  { label: 'TV Stand', width: 5, height: 1.5, color: '#8a7a6a', category: 'Storage' },
  { label: 'Wardrobe', width: 4, height: 2, color: '#8a7a6a', category: 'Storage' },
  // Counters (lower cabinets — 25" standard depth)
  { label: 'Counter 2\'', width: 2, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Counter 3\'', width: 3, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Counter 4\'', width: 4, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Counter 5\'', width: 5, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Counter 6\'', width: 6, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Counter 8\'', width: 8, height: 2.08, color: '#c0b8a8', category: 'Counters' },
  { label: 'Corner Counter', width: 2.5, height: 2.5, color: '#c0b8a8', category: 'Counters' },
  // Kitchen Appliances
  { label: 'Refrigerator (30")', width: 2.5, height: 2.83, color: '#8aacaa', category: 'Appliances' },
  { label: 'Refrigerator (36")', width: 3, height: 2.83, color: '#8aacaa', category: 'Appliances' },
  { label: 'Range (30")', width: 2.5, height: 2.42, color: '#8aacaa', category: 'Appliances' },
  { label: 'Range (36")', width: 3, height: 2.42, color: '#8aacaa', category: 'Appliances' },
  { label: 'Dishwasher', width: 2, height: 2, color: '#8aacaa', category: 'Appliances' },
  { label: 'Kitchen Sink (single)', width: 2, height: 1.75, color: '#8aacaa', category: 'Appliances' },
  { label: 'Kitchen Sink (double)', width: 2.75, height: 1.75, color: '#8aacaa', category: 'Appliances' },
  { label: 'Microwave (countertop)', width: 1.92, height: 1.25, color: '#8aacaa', category: 'Appliances' },
  // Bath Appliances
  { label: 'Toilet', width: 1.5, height: 2.5, color: '#9aaab8', category: 'Appliances' },
  { label: 'Bathroom Sink', width: 1.5, height: 1.5, color: '#9aaab8', category: 'Appliances' },
  { label: 'Vanity (30")', width: 2.5, height: 1.75, color: '#9aaab8', category: 'Appliances' },
  { label: 'Vanity (48")', width: 4, height: 1.75, color: '#9aaab8', category: 'Appliances' },
  { label: 'Vanity (60")', width: 5, height: 1.75, color: '#9aaab8', category: 'Appliances' },
  { label: 'Bathtub (60")', width: 5, height: 2.83, color: '#9aaab8', category: 'Appliances' },
  { label: 'Bathtub (66")', width: 5.5, height: 2.83, color: '#9aaab8', category: 'Appliances' },
  { label: 'Shower (36"×36")', width: 3, height: 3, color: '#9aaab8', category: 'Appliances' },
  { label: 'Shower (48"×36")', width: 4, height: 3, color: '#9aaab8', category: 'Appliances' },
  { label: 'Shower (60"×36")', width: 5, height: 3, color: '#9aaab8', category: 'Appliances' },
  // Laundry
  { label: 'Washer', width: 2.25, height: 2.42, color: '#8aacaa', category: 'Appliances' },
  { label: 'Dryer', width: 2.25, height: 2.42, color: '#8aacaa', category: 'Appliances' },
  { label: 'Washer+Dryer', width: 4.5, height: 2.42, color: '#8aacaa', category: 'Appliances' },
  // Custom
  { label: 'Custom', width: 3, height: 3, color: '#999', category: 'Custom' },
];

const CATEGORIES = [...new Set(FURNITURE_TEMPLATES.map(t => t.category))];

export default function FurniturePalette({ activeTool, pendingTemplate, onSelectTemplate }) {
  const [openCat, setOpenCat] = useState('Seating');

  return (
    <div className="palette">
      <div className="palette-title">Items</div>
      {CATEGORIES.map(cat => (
        <div key={cat} className="palette-category">
          <button
            className={`palette-cat-header ${openCat === cat ? 'open' : ''}`}
            onClick={() => setOpenCat(openCat === cat ? null : cat)}
          >
            {cat}
            <span className="palette-cat-arrow">{openCat === cat ? '▾' : '▸'}</span>
          </button>
          {openCat === cat && (
            <div className="palette-items">
              {FURNITURE_TEMPLATES.filter(t => t.category === cat).map(template => {
                const isActive =
                  activeTool === 'place' &&
                  pendingTemplate?.label === template.label;
                return (
                  <button
                    key={template.label}
                    className={`palette-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectTemplate(template)}
                    title={`${template.width}' × ${template.height}'`}
                  >
                    <span
                      className="palette-swatch"
                      style={{ background: template.color }}
                    />
                    {template.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
