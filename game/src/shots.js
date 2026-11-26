// Screenshot states: ?shot=<name> parks the plane in a photogenic moment.
// These are real renders of the game's own code, used to take the entry screenshots.
export function applyShot(state, name) {
  const p = state.plane;
  if (name === 'ring') {
    // Banking toward ring 1 over the west island.
    p.x = -560; p.z = -980; p.alt = 165; p.heading = -0.5; p.bank = -0.45; p.pitch = 0.05;
    p.speed = 74; p.throttle = 0.6; p.fuel = 88; p.score = 0;
    state.screen = 'play';
  } else if (name === 'cruise') {
    // High cruise over the strait, two rings cleared.
    p.x = 180; p.z = 60; p.alt = 265; p.heading = -1.9; p.bank = 0.3; p.pitch = 0.02;
    p.speed = 88; p.throttle = 0.72; p.fuel = 64; p.score = 200;
    state.rings[0].passed = true; state.rings[1].passed = true; p.ringsPassed = 2;
    state.screen = 'play';
  } else if (name === 'landing') {
    // Final approach to the home runway, all rings clear.
    p.x = 6; p.z = -2050; p.alt = 42; p.heading = Math.PI - 0.02; p.bank = 0.04; p.pitch = -0.08;
    p.speed = 52; p.throttle = 0.32; p.fuel = 41; p.score = 500;
    state.rings.forEach((r) => { r.passed = true; }); p.ringsPassed = state.rings.length;
    state.screen = 'play';
  } else if (name === 'title') {
    p.x = 0; p.z = -2350; p.alt = 230; p.heading = Math.PI; p.bank = 0.12; p.speed = 62;
    state.screen = 'title';
  }
  return state;
}
