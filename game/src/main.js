// Ringrunner Archipelago — main loop and screen state machine.
import { VIEW } from './config.js';
import { newPlane, stepPlane } from './flight.js';
import { startMission, missionText, landingScore } from './missions.js';
import { makeInput } from './input.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width; canvas.height = VIEW.height;
const ctx = canvas.getContext('2d');
const input = makeInput(canvas);

function freshState(missionIndex = 0) {
  const mission = startMission(missionIndex);
  return { plane: newPlane(), rings: mission.rings, mission, screen: 'title', missionText: '' };
}

let state = freshState(0);
const shot = new URLSearchParams(location.search).get('shot');
if (shot) state = applyShot(state, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const flags = input.poll();
  const p = state.plane;

  if (state.screen === 'title' && flags.start) state.screen = 'play';
  else if (state.screen === 'play' && flags.paused) state.screen = 'pause';
  else if (state.screen === 'pause' && (flags.paused || flags.start)) state.screen = 'play';
  if (flags.restart && state.screen !== 'play') {
    const next = state.screen === 'landed' ? state.mission.index + 1 : state.mission.index;
    state = freshState(next); state.screen = 'play';
  }

  if (state.screen === 'play') {
    const done = p.ringsPassed >= state.rings.length;
    const events = stepPlane(p, input, dt, state.rings, done);
    for (const ev of events) {
      if (ev === 'ring') { p.message = `RING ${p.ringsPassed} CLEAR! +100`; p.messageT = 1.6; }
      if (ev === 'hard') { p.message = 'HARD TOUCHDOWN!'; p.messageT = 1.6; }
      if (ev === 'bump') { p.message = 'ROUGH BUMP!'; p.messageT = 1.4; }
      if (ev === 'landed') { p.score = landingScore(p, state.mission); state.screen = 'landed'; }
      if (ev === 'crashed') state.screen = 'crashed';
    }
  }
  state.missionText = missionText(state);
  render(ctx, state, now / 1000);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
