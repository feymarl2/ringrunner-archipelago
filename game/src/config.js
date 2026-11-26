// Ringrunner Archipelago — shared constants for the flight game.
export const VIEW = { width: 1280, height: 720, fov: 620, horizonBase: 300 };
export const WORLD = { size: 4200, seaLevel: 0, gridStep: 90, gridAhead: 26, gridSide: 15 };
export const PLANE = {
  startSpeed: 62, minSpeed: 34, maxSpeed: 128, stallSpeed: 40,
  climbRate: 26, turnRate: 0.85, throttleRate: 26, fuelBurn: 0.55,
  startFuel: 100, startAltitude: 180,
};
export const COLORS = {
  skyTop: '#2e6fd8', skyMid: '#7db8ee', skyLow: '#cfe9ff',
  seaDeep: '#14507e', seaLight: '#2b7fb8', sand: '#e8d28a',
  grass: '#4fae4a', grassDark: '#35823a', rock: '#8a7a68', peak: '#e8e4da',
  runway: '#3c4148', runwayLine: '#f5f2e8', ring: '#ffc21f', ringNext: '#ff7a1a',
  hud: '#0b2233', amber: '#ffb52e', green: '#39e07a', red: '#ff4d4d',
};
export const MISSIONS = [
  { name: 'Island Hop', rings: 3, par: 150 },
  { name: 'Ringrunner', rings: 5, par: 260 },
  { name: 'Storm Circuit', rings: 7, par: 380 },
];
export const RUNWAY = { x: 0, z: -1500, heading: Math.PI, length: 520, width: 46 };
