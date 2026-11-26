// Unified keyboard + touch input: movement axes and an interact action.
export class Input {
  constructor() {
    this.keys = new Set();
    this.joyX = 0;
    this.joyY = 0;
    this.interactQueued = false;
    this.advanceQueued = false;
    this.jumpQueued = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') {
        this.interactQueued = true;
        this.advanceQueued = true;
      }
      if (e.code === 'Space') this.jumpQueued = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('touch');

    // camera orbit input: mouse drag anywhere, or right-half touch drag on mobile.
    // deltas accumulate here and the follow cam consumes them.
    this.camDX = 0;
    this.camDY = 0;
    window.__gameInput = this;
    let dragging = false, lx = 0, ly = 0;
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('#joystick-zone') || e.target.closest('.hud')) return;
      dragging = true; lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      this.camDX += (e.clientX - lx) * 0.0052;
      this.camDY += (e.clientY - ly) * 0.0042;
      lx = e.clientX; ly = e.clientY;
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    let camTouchId = null, ctx0 = 0, cty0 = 0;
    document.addEventListener('touchstart', (e) => {
      for (const t of e.changedTouches) {
        if (t.clientX < window.innerWidth * 0.45) continue;
        if (t.target.closest('button') || t.target.closest('.hud') || t.target.closest('#joystick-zone')) continue;
        if (camTouchId !== null) continue;
        camTouchId = t.identifier; ctx0 = t.clientX; cty0 = t.clientY;
      }
    }, { passive: true });
    document.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== camTouchId) continue;
        this.camDX += (t.clientX - ctx0) * 0.007;
        this.camDY += (t.clientY - cty0) * 0.005;
        ctx0 = t.clientX; cty0 = t.clientY;
      }
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === camTouchId) camTouchId = null;
      }
    }, { passive: true });

    // Floating joystick: appears where the thumb lands in the left zone.
    const zone = document.getElementById('joystick-zone');
    const base = document.getElementById('joystick-base');
    const stick = document.getElementById('joystick-stick');
    let joyId = null, cx = 0, cy = 0;
    const radius = 52;

    zone.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0];
      joyId = t.identifier;
      cx = t.clientX; cy = t.clientY;
      base.style.display = 'block';
      base.style.left = (cx - 55) + 'px';
      base.style.top = (cy - 55) + 'px';
      base.style.bottom = 'auto';
      e.preventDefault();
    }, { passive: false });

    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        let dx = t.clientX - cx, dy = t.clientY - cy;
        const len = Math.hypot(dx, dy);
        if (len > radius) { dx = dx / len * radius; dy = dy / len * radius; }
        stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.joyX = dx / radius;
        this.joyY = dy / radius;
      }
      e.preventDefault();
    }, { passive: false });

    const joyEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier !== joyId) continue;
        joyId = null;
        this.joyX = 0; this.joyY = 0;
        stick.style.transform = 'translate(-50%,-50%)';
        base.style.display = 'none';
      }
    };
    zone.addEventListener('touchend', joyEnd);
    zone.addEventListener('touchcancel', joyEnd);

    const jumpBtn = document.getElementById('jump-button');
    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => {
        this.jumpQueued = true;
        e.preventDefault();
      }, { passive: false });
      jumpBtn.addEventListener('click', () => { this.jumpQueued = true; });
    }

    const actionBtn = document.getElementById('action-button');
    actionBtn.addEventListener('touchstart', (e) => {
      this.interactQueued = true;
      this.advanceQueued = true;
      e.preventDefault();
    }, { passive: false });
    actionBtn.addEventListener('click', () => {
      this.interactQueued = true;
      this.advanceQueued = true;
    });

    // Taps anywhere advance dialogue too.
    document.getElementById('dialogue-box').addEventListener('click', () => {
      this.advanceQueued = true;
    });
  }

  // Movement axes in screen space: x right, z toward camera-down.
  axes() {
    let x = this.joyX, z = this.joyY;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    // camera-relative: input is in screen space, rotate by the orbit yaw so
    // "up" always walks away from the camera no matter how you've dragged it
    const yaw = window.__camYaw || 0;
    if (yaw !== 0) {
      // forward (away from camera) is (sin(yaw), -cos(yaw)); right is (cos(yaw), sin(yaw))
      const sy = Math.sin(yaw), cy = Math.cos(yaw);
      const wx = x * cy + (-z) * sy;
      const wz = x * sy + (-z) * -cy;
      return { x: wx, z: wz };
    }
    return { x, z };
  }

  consumeJump() {
    const v = this.jumpQueued;
    this.jumpQueued = false;
    return v;
  }
  consumeInteract() {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }
  consumeAdvance() {
    const v = this.advanceQueued;
    this.advanceQueued = false;
    return v;
  }
  clear() {
    this.interactQueued = false;
    this.advanceQueued = false;
    this.jumpQueued = false;
  }
}
