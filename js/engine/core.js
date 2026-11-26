import * as THREE from 'three';

// Third-person follow camera with soft damping.
export class FollowCam {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 3.4, 5.6);
    this.lookOffset = new THREE.Vector3(0, 1.5, 0);
    this.pos = new THREE.Vector3();
    this.shake = 0;
  }
  setRoom(minX, maxX, minZ, maxZ) {
    this.room = { minX, maxX, minZ, maxZ };
  }
  update(dt, target) {
    const desired = target.clone().add(this.offset);
    if (this.room) {
      const m = 0.45;
      desired.x = Math.max(this.room.minX + m, Math.min(this.room.maxX - m, desired.x));
      desired.z = Math.max(this.room.minZ + m, Math.min(this.room.maxZ - m, desired.z));
    }
    this.pos.lerp(desired, Math.min(1, dt * 4.5));
    this.camera.position.copy(this.pos);
    if (this.room) {
      this.camera.position.y = Math.min(this.camera.position.y, 3.1);
    }
    if (this.shake > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.5);
    }
    this.camera.lookAt(target.clone().add(this.lookOffset));
  }
  snap(target) {
    this.pos.copy(target.clone().add(this.offset));
    if (this.room) {
      const m = 0.45;
      this.pos.x = Math.max(this.room.minX + m, Math.min(this.room.maxX - m, this.pos.x));
      this.pos.z = Math.max(this.room.minZ + m, Math.min(this.room.maxZ - m, this.pos.z));
    }
  }
}

// Player controller: screen-relative movement (camera looks north-ish),
// wall collision against AABB list, procedural walk anim.
export class PlayerController {
  constructor(person, input, bounds) {
    this.person = person;
    this.input = input;
    this.bounds = bounds || []; // {minX,maxX,minZ,maxZ}
    this.speed = 4.1;
    this.vel = new THREE.Vector3();
    this.frozen = false;
  }
  update(dt) {
    if (this.frozen) {
      this.person.animateIdle(performance.now() / 1000);
      return;
    }
    const { x, z } = this.input.axes();
    const g = this.person.group;
    const moving = Math.hypot(x, z) > 0.05;
    if (moving) {
      const targetAngle = Math.atan2(x, z);
      // shortest-arc rotation
      let diff = targetAngle - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 10);

      const len = Math.min(1, Math.hypot(x, z));
      const step = this.speed * len * dt;
      const nx = g.position.x + Math.sin(targetAngle) * step;
      const nz = g.position.z + Math.cos(targetAngle) * step;
      // axis-separated collision: try x, then z
      if (!this.collides(nx, g.position.z)) g.position.x = nx;
      if (!this.collides(g.position.x, nz)) g.position.z = nz;
      this.person.animateWalk(dt, len);
    } else {
      this.person.animateIdle(performance.now() / 1000);
    }
  }
  collides(x, z) {
    const r = 0.34;
    for (const b of this.bounds) {
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  }
}

// Interaction registry: points in the world the player can walk up to and
// press E on. Each: {pos: Vector3, radius, label, action, once, done}.
export class Interactions {
  constructor() { this.items = []; }
  add(item) { this.items.push(item); return item; }
  nearest(pos) {
    let best = null, bestD = Infinity;
    for (const it of this.items) {
      if (it.done && it.once) continue;
      const d = pos.distanceTo(it.pos);
      if (d < it.radius && d < bestD) { best = it; bestD = d; }
    }
    return best;
  }
}

// Dialogue sequence player. Lines: [{speaker, text}]. Resolves a promise
// when finished. Blocks player movement meanwhile (scene decides).
export class Dialogue {
  constructor(input) {
    this.input = input;
    this.box = document.getElementById('dialogue-box');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.textEl = document.getElementById('dialogue-text');
    this.active = false;
  }
  play(lines) {
    return new Promise((resolve) => {
      this.active = true;
      this.box.classList.remove('hidden');
      let i = 0;
      const show = () => {
        const line = lines[i];
        this.speakerEl.textContent = line.speaker || '';
        this.textEl.textContent = line.text;
        const portraitEl = document.getElementById('dialogue-portrait');
        if (portraitEl && this.faceMap) {
          const src = this.faceMap[line.speaker];
          if (src) { portraitEl.src = src; portraitEl.style.display = 'block'; }
          else portraitEl.style.display = 'none';
        }
        if (this.voiceManifest) {
          const file = this.voiceManifest[(line.speaker || '') + '|' + line.text];
          if (file) {
            if (this.currentAudio) { this.currentAudio.pause(); }
            const a = new Audio(file);
            a.volume = 0.9;
            a.play().catch(() => {});
            this.currentAudio = a;
          }
        }
      };
      show();
      this.input.clear();
      const tick = () => {
        if (this.input.consumeAdvance()) {
          i++;
          if (i >= lines.length) {
            this.box.classList.add('hidden');
            this.active = false;
            if (this.currentAudio) { this.currentAudio.pause(); }
            resolve();
            return;
          }
          show();
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }
}

export function showObjective(text, ms = 5000) {
  const el = document.getElementById('objective-banner');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(el._t);
  if (ms) el._t = setTimeout(() => el.classList.add('hidden'), ms);
}

export function phoneOverlay(caller, show) {
  const el = document.getElementById('phone-overlay');
  document.getElementById('phone-caller').textContent = caller;
  el.classList.toggle('hidden', !show);
}

// Choice prompt: rows of buttons, resolves index picked.
export function choice(options) {
  return new Promise((resolve) => {
    const box = document.getElementById('choice-box');
    box.innerHTML = '';
    box.classList.remove('hidden');
    options.forEach((label, i) => {
      const b = document.createElement('button');
      b.className = 'choice-btn';
      b.textContent = label;
      b.onclick = () => {
        box.classList.add('hidden');
        box.innerHTML = '';
        resolve(i);
      };
      box.appendChild(b);
    });
  });
}
