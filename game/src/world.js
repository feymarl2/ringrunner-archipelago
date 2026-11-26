// World: island heightfield, runway flattening, and the ring course.
import { WORLD, RUNWAY } from './config.js';

const ISLANDS = [
  { x: 0, z: -1500, r: 620, h: 95 }, { x: -1150, z: -700, r: 480, h: 185 },
  { x: 1250, z: -350, r: 540, h: 155 }, { x: -650, z: 450, r: 420, h: 125 },
  { x: 800, z: 800, r: 500, h: 200 }, { x: -1500, z: 1300, r: 460, h: 145 },
  { x: 150, z: 1600, r: 560, h: 110 }, { x: 1700, z: 1500, r: 400, h: 135 },
];

function bump(x, z, isl) {
  const dx = x - isl.x, dz = z - isl.z;
  const d2 = (dx * dx + dz * dz) / (isl.r * isl.r);
  if (d2 > 2.4) return 0;
  const base = Math.exp(-d2 * 1.15);
  const ridge = 0.22 * Math.sin(x * 0.011 + isl.x) * Math.cos(z * 0.013 - isl.z);
  return isl.h * Math.max(0, base + ridge * base);
}

export function terrainHeight(x, z) {
  let h = -14;
  for (const isl of ISLANDS) h += bump(x, z, isl);
  // Flatten the runway strip on the home island.
  const dx = x - RUNWAY.x, dz = z - RUNWAY.z;
  const along = Math.abs(dz), across = Math.abs(dx);
  if (along < RUNWAY.length / 2 + 90 && across < RUNWAY.width + 70) {
    const t = Math.min(1, Math.max(0, (RUNWAY.width + 70 - across) / 70));
    h = h * (1 - t) + 6 * t;
  }
  return h;
}

export function terrainColor(h, shade) {
  const s = Math.max(0.55, Math.min(1.15, shade));
  const mix = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * s), g = Math.min(255, ((n >> 8) & 255) * s), b = Math.min(255, (n & 255) * s);
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  };
  if (h <= 0.4) return mix('#2b7fb8');
  if (h < 4) return mix('#e8d28a');
  if (h < 55) return mix('#4fae4a');
  if (h < 110) return mix('#35823a');
  if (h < 165) return mix('#8a7a68');
  return mix('#e8e4da');
}

// Ring course: a loop around the archipelago, ending back at the runway.
export function ringCourse(count) {
  const spots = [
    [-700, -1150, 150], [-1250, -650, 190], [-500, 150, 160], [500, 350, 210],
    [1100, 950, 170], [350, 1500, 200], [-900, 1150, 180], [-250, -250, 140],
  ];
  return spots.slice(0, count).map(([x, z, alt], i) => ({ x, z, alt, r: 46, id: i, passed: false }));
}

export function runwayFrame() {
  return { ...RUNWAY, halfLen: RUNWAY.length / 2, halfWid: RUNWAY.width / 2 };
}

export { WORLD };
