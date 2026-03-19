export const M_TO_FT = 3.28084;
export const PX_PER_FT = 10; // base pixels per foot at zoom=1

export function mToFt(m) {
  return m * M_TO_FT;
}

export function ftToPx(ft) {
  return ft * PX_PER_FT;
}

export function mToPx(m) {
  return m * M_TO_FT * PX_PER_FT;
}

// Convert meter world coord to unzoomed SVG pixel coord
// JSON uses screen coords: Y increases downward, yMin is top of building
export function mToSVG(mx, my, bounds) {
  const x = (mx - bounds.xMin) * M_TO_FT * PX_PER_FT;
  const y = (my - bounds.yMin) * M_TO_FT * PX_PER_FT;
  return [x, y];
}

// Convert unzoomed SVG pixel coord back to meters
export function svgToM(svgX, svgY, bounds) {
  const mx = svgX / (M_TO_FT * PX_PER_FT) + bounds.xMin;
  const my = svgY / (M_TO_FT * PX_PER_FT) + bounds.yMin;
  return [mx, my];
}

// Convert unzoomed SVG pixel to feet (relative length, no offset)
export function pxToFt(px) {
  return px / PX_PER_FT;
}

// Polygon of meter pairs → SVG points attribute string
export function polygonPoints(polygon, bounds) {
  return polygon
    .map(([mx, my]) => mToSVG(mx, my, bounds).join(','))
    .join(' ');
}

// Floor plan pixel dimensions at zoom=1
export function getFloorDimensions(bounds) {
  const width = (bounds.xMax - bounds.xMin) * M_TO_FT * PX_PER_FT;
  const height = (bounds.yMax - bounds.yMin) * M_TO_FT * PX_PER_FT;
  return { width, height };
}

// Snap a foot value to the nearest increment (default: 3 inches = 0.25ft)
export function snapToGrid(ft, increment = 0.25) {
  return Math.round(ft / increment) * increment;
}

// Format feet as X' Y" string
export function formatFeet(ft) {
  const totalInches = Math.round(Math.abs(ft) * 12);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  if (inches === 0) return `${feet}'`;
  return `${feet}' ${inches}"`;
}
