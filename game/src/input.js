// Input: keyboard flight controls plus mouse steering and buttons.
export function makeInput(canvas) {
  const keys = {};
  const input = { bank: 0, pitch: 0, throttle: 0, paused: false, restart: false, start: false };
  let mouseX = 0.5, mouseY = 0.5, mouseActive = false;

  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'KeyP' || e.code === 'Escape') input.paused = true;
    if (e.code === 'KeyR') input.restart = true;
    if (e.code === 'Space' || e.code === 'Enter') input.start = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) / r.width; mouseY = (e.clientY - r.top) / r.height; mouseActive = true;
  });
  canvas.addEventListener('mousedown', () => { input.start = true; });

  input.poll = () => {
    let bank = 0, pitch = 0, throttle = 0;
    if (keys.ArrowLeft || keys.KeyA) bank -= 1;
    if (keys.ArrowRight || keys.KeyD) bank += 1;
    if (keys.ArrowUp || keys.KeyW) pitch += 1;
    if (keys.ArrowDown || keys.KeyS) pitch -= 1;
    if (keys.ShiftLeft || keys.ShiftRight) throttle += 1;
    if (keys.ControlLeft || keys.ControlRight) throttle -= 1;
    if (keys.Equal) throttle += 1;
    if (keys.Minus) throttle -= 1;
    if (mouseActive && bank === 0 && pitch === 0) {
      bank = Math.max(-1, Math.min(1, (mouseX - 0.5) * 2.4));
      pitch = Math.max(-1, Math.min(1, (0.5 - mouseY) * 2.2));
    }
    input.bank = bank; input.pitch = pitch; input.throttle = throttle;
    const flags = { paused: input.paused, restart: input.restart, start: input.start };
    input.paused = input.restart = input.start = false;
    return flags;
  };
  return input;
}
