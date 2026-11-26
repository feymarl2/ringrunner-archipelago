// Flight model: plane state, physics step, ring passes, landing and crash checks.
import { PLANE } from './config.js';
import { terrainHeight, runwayFrame } from './world.js';

export function newPlane() {
  return {
    x: 0, z: -2350, alt: 230, heading: Math.PI, pitch: 0, bank: 0,
    speed: PLANE.startSpeed, throttle: 0.55, fuel: PLANE.startFuel, damage: 0,
    score: 0, ringsPassed: 0, airborne: true, message: '', messageT: 0,
  };
}

export function stepPlane(p, input, dt, rings, missionDone) {
  const events = [];
  // Controls: bank turns the plane, pitch climbs/dives, throttle sets target speed.
  p.bank += ((input.bank * 0.9) - p.bank) * Math.min(1, dt * 5);
  p.pitch += ((input.pitch * 0.55) - p.pitch) * Math.min(1, dt * 4);
  p.throttle = Math.max(0, Math.min(1, p.throttle + input.throttle * dt * 0.5));
  const targetSpeed = PLANE.minSpeed + p.throttle * (PLANE.maxSpeed - PLANE.minSpeed) - p.pitch * 18;
  p.speed += (targetSpeed - p.speed) * Math.min(1, dt * 0.7);
  p.heading += Math.sin(p.bank) * PLANE.turnRate * dt * (62 / Math.max(30, p.speed));
  p.alt += Math.sin(p.pitch) * PLANE.climbRate * dt * (p.speed / 60);
  if (p.speed < PLANE.stallSpeed) p.alt -= (PLANE.stallSpeed - p.speed) * dt * 1.4;
  p.x += Math.sin(p.heading) * p.speed * dt;
  p.z -= Math.cos(p.heading) * p.speed * dt;
  p.fuel = Math.max(0, p.fuel - PLANE.fuelBurn * dt * (0.4 + p.throttle));
  if (p.fuel <= 0) { p.throttle = 0; p.alt -= dt * 6; }

  const ground = terrainHeight(p.x, p.z);
  const agl = p.alt - ground;

  // Ring pass: close to the ring centre in 3D while it is the active ring.
  const ring = rings[p.ringsPassed];
  if (ring) {
    const dx = p.x - ring.x, dz = p.z - ring.z, da = p.alt - ring.alt;
    if (dx * dx + dz * dz < ring.r * ring.r && Math.abs(da) < ring.r * 0.8) {
      ring.passed = true; p.ringsPassed++; p.score += 100;
      events.push('ring');
    }
  }

  // Landing: over the runway, low, slow, aligned, gentle descent.
  const rw = runwayFrame();
  const onRunway = Math.abs(p.x - rw.x) < rw.halfWid && Math.abs(p.z - rw.z) < rw.halfLen;
  let dh = Math.abs(((p.heading - rw.heading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  if (onRunway && agl < 10) {
    if (missionDone && p.speed < 58 && dh < 0.4 && p.pitch > -0.25) events.push('landed');
    else if (p.speed >= 58 || dh >= 0.4) { p.damage += 34; events.push('hard'); p.alt = ground + 12; p.pitch = 0.15; }
  } else if (agl <= 1.5) {
    if (p.speed < 46 && p.pitch > -0.2 && ground > 0) { p.damage += 18; events.push('bump'); p.alt = ground + 10; p.pitch = 0.2; }
    else events.push('crashed');
  }
  if (p.damage >= 100) events.push('crashed');
  if (p.messageT > 0) p.messageT -= dt;
  return events;
}

export function headingDegrees(heading) {
  return ((heading * 180 / Math.PI) % 360 + 360) % 360;
}
