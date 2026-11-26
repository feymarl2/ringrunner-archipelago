// Renderer: chase-view 3D projection of the archipelago, aircraft, cockpit and HUD.
import { VIEW, COLORS } from './config.js';
import { terrainHeight, terrainColor, runwayFrame } from './world.js';
import { headingDegrees } from './flight.js';

export function makeCamera(p) {
  const back = 30;
  return {
    x: p.x - Math.sin(p.heading) * back, z: p.z + Math.cos(p.heading) * back,
    alt: p.alt + 8, heading: p.heading, pitch: p.pitch, bank: p.bank,
  };
}

function project(cam, x, z, alt) {
  const dx = x - cam.x, dz = z - cam.z;
  const fwd = dx * Math.sin(cam.heading) - dz * Math.cos(cam.heading);
  if (fwd < 8) return null;
  const right = dx * Math.cos(cam.heading) + dz * Math.sin(cam.heading);
  const horizon = VIEW.horizonBase + cam.pitch * 240;
  let sx = VIEW.width / 2 + (right / fwd) * VIEW.fov;
  let sy = horizon - ((alt - cam.alt) / fwd) * VIEW.fov;
  // Roll the whole view with the bank.
  const cx = VIEW.width / 2, cy = VIEW.height / 2;
  const roll = -cam.bank * 0.32, c = Math.cos(roll), s = Math.sin(roll);
  const rx = sx - cx, ry = sy - cy;
  sx = cx + rx * c - ry * s; sy = cy + rx * s + ry * c;
  return { x: sx, y: sy, fwd, scale: VIEW.fov / fwd };
}

function drawSky(ctx, cam) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLORS.skyTop); g.addColorStop(0.42, COLORS.skyMid); g.addColorStop(0.62, COLORS.skyLow);
  g.addColorStop(0.63, COLORS.seaLight); g.addColorStop(1, COLORS.seaDeep);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun + a few clouds, fixed in the sky.
  ctx.fillStyle = 'rgba(255,244,190,0.95)';
  ctx.beginPath(); ctx.arc(1080, 92, 34, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [x, y, w] of [[180, 80, 150], [520, 55, 190], [880, 120, 130], [330, 150, 110]]) {
    ctx.beginPath(); ctx.ellipse(x, y, w, 17, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + w * 0.4, y + 8, w * 0.7, 13, 0, 0, 7); ctx.fill();
  }
}

function drawTerrain(ctx, cam) {
  const rows = [];
  for (let f = 60; f <= 2800; f += 95) rows.push(f);
  const cols = [];
  for (let r = -1900; r <= 1900; r += 120) cols.push(r);
  const pt = (fwd, right) => {
    const x = cam.x + Math.sin(cam.heading) * fwd + Math.cos(cam.heading) * right;
    const z = cam.z - Math.cos(cam.heading) * fwd + Math.sin(cam.heading) * right;
    const h = terrainHeight(x, z);
    return { p: project(cam, x, z, Math.max(h, 0)), h };
  };
  for (let i = rows.length - 2; i >= 0; i--) {
    for (let j = 0; j < cols.length - 1; j++) {
      const a = pt(rows[i], cols[j]), b = pt(rows[i], cols[j + 1]);
      const c = pt(rows[i + 1], cols[j + 1]), d = pt(rows[i + 1], cols[j]);
      if (!a.p || !b.p || !c.p || !d.p) continue;
      const hAvg = (a.h + b.h + c.h + d.h) / 4;
      const shade = 1 + (d.h - b.h) * 0.004;
      ctx.fillStyle = terrainColor(hAvg, shade);
      ctx.beginPath();
      ctx.moveTo(a.p.x, a.p.y); ctx.lineTo(b.p.x, b.p.y); ctx.lineTo(c.p.x, c.p.y); ctx.lineTo(d.p.x, d.p.y);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawRunway(ctx, cam, active) {
  const rw = runwayFrame();
  const corners = [
    [rw.x - rw.halfWid, rw.z - rw.halfLen], [rw.x + rw.halfWid, rw.z - rw.halfLen],
    [rw.x + rw.halfWid, rw.z + rw.halfLen], [rw.x - rw.halfWid, rw.z + rw.halfLen],
  ].map(([x, z]) => project(cam, x, z, 6));
  if (corners.some((c) => !c)) return;
  ctx.fillStyle = COLORS.runway;
  ctx.beginPath(); corners.forEach((c, i) => i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = active ? COLORS.green : COLORS.runwayLine; ctx.lineWidth = 3; ctx.stroke();
  // Centreline dashes.
  ctx.fillStyle = COLORS.runwayLine;
  for (let t = -0.42; t < 0.45; t += 0.12) {
    const c = project(cam, rw.x, rw.z + t * rw.length, 6.5);
    if (c) ctx.fillRect(c.x - 2 * c.scale * 0.02, c.y - 1, Math.max(2, c.scale * 0.05), Math.max(2, c.scale * 0.14));
  }
  if (active) {
    const top = project(cam, rw.x, rw.z - rw.halfLen, 40);
    if (top) { ctx.fillStyle = COLORS.green; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('▼ LAND HERE', top.x, top.y); }
  }
}

function drawRings(ctx, cam, rings, activeIdx, t) {
  rings.forEach((ring, i) => {
    if (ring.passed) return;
    const c = project(cam, ring.x, ring.z, ring.alt);
    if (!c) return;
    const r = Math.max(6, ring.r * c.scale * 0.5);
    const active = i === activeIdx;
    ctx.strokeStyle = active ? COLORS.ringNext : COLORS.ring;
    ctx.lineWidth = Math.max(3, r * 0.14);
    ctx.globalAlpha = active ? 0.85 + 0.15 * Math.sin(t * 6) : 0.75;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.92, 0, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1;
    if (active) {
      ctx.fillStyle = COLORS.ringNext; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`RING ${i + 1}`, c.x, c.y - r - 8);
    }
  });
}

function drawAircraft(ctx, p) {
  const cx = VIEW.width / 2, cy = VIEW.height - 215;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.bank * 0.55);
  // Propeller blur + spinner.
  ctx.fillStyle = 'rgba(220,230,240,0.35)';
  ctx.beginPath(); ctx.ellipse(0, -6, 58, 10, 0, 0, 7); ctx.fill();
  // Wings.
  ctx.fillStyle = '#d8433a';
  ctx.beginPath(); ctx.moveTo(-175, 26); ctx.lineTo(-30, 2); ctx.lineTo(30, 2); ctx.lineTo(175, 26); ctx.lineTo(160, 40); ctx.lineTo(-160, 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f2f0e6'; ctx.fillRect(-175, 24, 26, 9); ctx.fillRect(149, 24, 26, 9);
  // Fuselage + tail.
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath(); ctx.moveTo(-16, 44); ctx.lineTo(-11, -34); ctx.lineTo(11, -34); ctx.lineTo(16, 44); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d8433a';
  ctx.beginPath(); ctx.moveTo(-46, 52); ctx.lineTo(0, 40); ctx.lineTo(46, 52); ctx.lineTo(40, 60); ctx.lineTo(-40, 60); ctx.closePath(); ctx.fill();
  // Canopy with lit reflection.
  ctx.fillStyle = '#9fd8f2';
  ctx.beginPath(); ctx.ellipse(0, -8, 12, 20, 0, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(-6, -20, 4, 14);
  // Navigation lights.
  ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(-172, 30, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#39e07a'; ctx.beginPath(); ctx.arc(172, 30, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd94d'; ctx.beginPath(); ctx.arc(0, -36, 4, 0, 7); ctx.fill();
  ctx.restore();
}

function gauge(ctx, x, y, r, label, frac, value, color) {
  ctx.fillStyle = '#12293c'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.75 + i * (Math.PI * 1.5 / 8);
    ctx.strokeStyle = '#cfe9ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8)); ctx.lineTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2)); ctx.stroke();
  }
  const na = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(na) * (r - 10), y + Math.sin(na) * (r - 10)); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, x, y + r - 12);
  ctx.fillStyle = color; ctx.font = 'bold 16px monospace'; ctx.fillText(value, x, y + 6);
}

function drawCockpit(ctx, p) {
  const y0 = VIEW.height - 128;
  ctx.fillStyle = '#0d1f30'; ctx.fillRect(0, y0, VIEW.width, 128);
  ctx.fillStyle = '#17334d'; ctx.fillRect(0, y0, VIEW.width, 8);
  gauge(ctx, 300, y0 + 62, 52, 'ALT ft', p.alt / 400, String(Math.round(p.alt * 3.28)), COLORS.green);
  gauge(ctx, 470, y0 + 62, 52, 'SPD kt', p.speed / 140, String(Math.round(p.speed * 1.94)), COLORS.amber);
  gauge(ctx, 640, y0 + 62, 52, 'HDG', headingDegrees(p.heading) / 360, String(Math.round(headingDegrees(p.heading))).padStart(3, '0') + '°', COLORS.green);
  gauge(ctx, 810, y0 + 62, 52, 'FUEL', p.fuel / 100, String(Math.round(p.fuel)) + '%', p.fuel < 25 ? COLORS.red : COLORS.amber);
  // Throttle + damage bars.
  ctx.fillStyle = '#cfe9ff'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('THR', 940, y0 + 38); ctx.fillText('DMG', 940, y0 + 78);
  ctx.fillStyle = '#24455f'; ctx.fillRect(985, y0 + 26, 180, 14); ctx.fillRect(985, y0 + 66, 180, 14);
  ctx.fillStyle = COLORS.green; ctx.fillRect(985, y0 + 26, 180 * p.throttle, 14);
  ctx.fillStyle = p.damage > 60 ? COLORS.red : COLORS.amber; ctx.fillRect(985, y0 + 66, 180 * Math.min(1, p.damage / 100), 14);
  ctx.fillStyle = '#9fd8f2'; ctx.font = '12px sans-serif';
  ctx.fillText('←→ bank · ↑↓ pitch · Shift/Ctrl throttle · P pause', 940, y0 + 112);
}

function drawHud(ctx, p, mission, ringsTotal) {
  ctx.fillStyle = 'rgba(11,34,51,0.82)'; ctx.fillRect(0, 0, VIEW.width, 54);
  ctx.font = 'bold 21px monospace'; ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.green;
  ctx.fillText(`ALT ${Math.round(p.alt * 3.28)} ft`, 18, 35);
  ctx.fillStyle = COLORS.amber;
  ctx.fillText(`SPD ${Math.round(p.speed * 1.94)} kt`, 240, 35);
  ctx.fillStyle = '#fff';
  ctx.fillText(`HDG ${String(Math.round(headingDegrees(p.heading))).padStart(3, '0')}°`, 460, 35);
  ctx.fillStyle = COLORS.ring;
  ctx.fillText(`RINGS ${p.ringsPassed}/${ringsTotal}`, 680, 35);
  ctx.fillStyle = '#fff';
  ctx.fillText(`SCORE ${p.score}`, 900, 35);
  ctx.fillStyle = p.fuel < 25 ? COLORS.red : COLORS.green;
  ctx.fillText(`FUEL ${Math.round(p.fuel)}%`, 1090, 35);
  ctx.fillStyle = 'rgba(11,34,51,0.65)'; ctx.fillRect(VIEW.width / 2 - 320, 58, 640, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(mission, VIEW.width / 2, 80);
  if (p.speed < 40) { ctx.fillStyle = COLORS.red; ctx.font = 'bold 26px sans-serif'; ctx.fillText('⚠ STALL', VIEW.width / 2, 118); }
  else if (p.fuel < 20) { ctx.fillStyle = COLORS.amber; ctx.font = 'bold 22px sans-serif'; ctx.fillText('LOW FUEL', VIEW.width / 2, 118); }
  if (p.messageT > 0) { ctx.fillStyle = COLORS.green; ctx.font = 'bold 30px sans-serif'; ctx.fillText(p.message, VIEW.width / 2, 160); }
}

function drawMinimap(ctx, p, rings) {
  const mx = VIEW.width - 168, my = 64, mw = 150, mh = 110;
  ctx.fillStyle = 'rgba(11,34,51,0.85)'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#9fd8f2'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
  const toMap = (x, z) => [mx + ((x + 2100) / 4200) * mw, my + ((z + 2100) / 4200) * mh];
  ctx.fillStyle = '#4fae4a';
  for (const [x, z, r] of [[0, -1500, 620], [-1150, -700, 480], [1250, -350, 540], [-650, 450, 420], [800, 800, 500], [-1500, 1300, 460], [150, 1600, 560], [1700, 1500, 400]]) {
    const [px, py] = toMap(x, z);
    ctx.beginPath(); ctx.arc(px, py, Math.max(3, r / 4200 * mw), 0, 7); ctx.fill();
  }
  const rw = runwayFrame(); const [rx, ry] = toMap(rw.x, rw.z);
  ctx.fillStyle = '#fff'; ctx.fillRect(rx - 2, ry - 6, 4, 12);
  rings.forEach((ring, i) => {
    if (ring.passed) return;
    const [px, py] = toMap(ring.x, ring.z);
    ctx.fillStyle = i === p.ringsPassed ? COLORS.ringNext : COLORS.ring;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, 7); ctx.fill();
  });
  const [px, py] = toMap(p.x, p.z);
  ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(px, py, 4, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('MAP', mx + 5, my + 13);
}

export function render(ctx, state, t) {
  const { plane: p, rings, missionText, screen } = state;
  const cam = makeCamera(p);
  drawSky(ctx, cam);
  drawTerrain(ctx, cam);
  drawRunway(ctx, cam, p.ringsPassed >= rings.length);
  drawRings(ctx, cam, rings, p.ringsPassed, t);
  drawAircraft(ctx, p);
  drawCockpit(ctx, p);
  drawHud(ctx, p, missionText, rings.length);
  drawMinimap(ctx, p, rings);
  if (screen !== 'play') drawScreen(ctx, state);
}

function drawScreen(ctx, state) {
  ctx.fillStyle = 'rgba(6,20,34,0.62)'; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d'; ctx.font = 'bold 64px sans-serif';
  const titles = { title: 'RINGRUNNER ARCHIPELAGO', pause: 'PAUSED', crashed: 'CRASHED', landed: 'PERFECT LANDING!' };
  ctx.fillText(titles[state.screen] || '', VIEW.width / 2, 240);
  ctx.fillStyle = '#fff'; ctx.font = '22px sans-serif';
  const lines = {
    title: ['Fly the rings, then land on the home runway.', 'Arrows / WASD steer · Shift throttle up · Ctrl throttle down', 'Mouse steers too. Press SPACE to take off.'],
    pause: ['Press P or SPACE to keep flying.'],
    crashed: [`Score ${state.plane.score} · Rings ${state.plane.ringsPassed}/${state.rings.length}`, 'Press R to fly again.'],
    landed: [`Score ${state.plane.score} · Fuel left ${Math.round(state.plane.fuel)}%`, 'Press R for the next mission.'],
  }[state.screen] || [];
  lines.forEach((ln, i) => ctx.fillText(ln, VIEW.width / 2, 300 + i * 34));
}
