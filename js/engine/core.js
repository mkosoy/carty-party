import { sfxCamera, sfxVinyl } from './sfx.js';
import * as THREE from 'three';

// Third-person follow camera with soft damping.
export class FollowCam {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 3.4, 5.6);
    this.lookOffset = new THREE.Vector3(0, 1.5, 0);
    this.pos = new THREE.Vector3();
    this.shake = 0;
    this.yaw = 0;
    this.pitch = 0;
  }
  setRoom(minX, maxX, minZ, maxZ) {
    this.room = { minX, maxX, minZ, maxZ };
  }
  update(dt, target) {
    // consume orbit input (mouse drag / touch drag on the right half)
    const inp = window.__gameInput;
    if (inp) {
      this.yaw += inp.camDX;
      this.pitch = Math.max(-0.4, Math.min(1.0, this.pitch + inp.camDY));
      inp.camDX = 0; inp.camDY = 0;
    }
    // rotate the follow offset by the yaw, lift/drop with pitch
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const dist = 1 - this.pitch * 0.35;
    const rot = new THREE.Vector3(
      (this.offset.x * cy - this.offset.z * sy) * dist,
      this.offset.y + this.pitch * 3.2,
      (this.offset.x * sy + this.offset.z * cy) * dist
    );
    const desired = target.clone().add(rot);
    if (this.room) {
      const m = 1.1;
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


// Objective guide beacon: a bobbing golden diamond + light column marking
// where the player should go next. Reusable across scenes.
export class GuideMarker {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.36),
      new THREE.MeshBasicMaterial({ color: 0xffd663 })
    );
    diamond.position.y = 5.9;
    this.group.add(diamond);
    this.diamond = diamond;
    // light column down to the ground
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.52, 5.6, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd663, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    col.position.y = 2.8;
    this.group.add(col);
    // pulsing ground ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.05, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd663, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.06;
    this.group.add(ring);
    this.ring = ring;
    const light = new THREE.PointLight(0xffd663, 11, 9);
    light.position.y = 2.6;
    this.group.add(light);
    this.group.visible = false;
    scene.add(this.group);
    this.target = null;
    // breadcrumb trail: little gold arrows marching along the floor toward
    // the target, so you always know which way to walk
    this.arrows = [];
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.ConeGeometry(0.16, 0.42, 4);
      geo.rotateX(Math.PI / 2); // cone axis now points along +z, so yaw alone aims it
      const arrow = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: 0xffd663, transparent: true, opacity: 0.85 })
      );
      arrow.visible = false;
      scene.add(arrow);
      this.arrows.push(arrow);
    }
    this.trailT = 0;
  }
  setTarget(x, z) {
    this.group.position.set(x, 0, z);
    this.group.visible = true;
    this.target = { x, z };
  }
  clear() {
    this.group.visible = false;
    this.target = null;
    for (const a of (this.arrows || [])) a.visible = false;
  }
  update(dt, playerPos) {
    this.trailT = (this.trailT || 0) + dt;
    if (!this.group.visible) {
      for (const a of (this.arrows || [])) a.visible = false;
      return;
    }
    const t = performance.now() / 1000;
    this.diamond.rotation.y += dt * 2.2;
    this.diamond.position.y = 5.9 + Math.sin(t * 2.4) * 0.22;
    const pulse = 1 + Math.sin(t * 3) * 0.18;
    this.ring.scale.set(pulse, pulse, 1);
    this.ring.material.opacity = 0.5 + Math.sin(t * 3) * 0.25;
    // breadcrumb arrows marching from the player toward the target
    if (this.target && playerPos) {
      const dx = this.target.x - playerPos.x;
      const dz = this.target.z - playerPos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.0) {
        const ux = dx / d, uz = dz / d;
        const ang = Math.atan2(dx, dz);
        for (let i = 0; i < this.arrows.length; i++) {
          const span = this.arrows.length * 1.25;
          const f = ((this.trailT * 2.0 + i * 1.25) % span) + 1.0;
          const dist = Math.min(f, d - 1.0);
          const a = this.arrows[i];
          a.visible = dist > 0.5;
          if (a.visible) {
            a.position.set(playerPos.x + ux * dist, 0.07, playerPos.z + uz * dist);
            a.rotation.set(0, ang, 0);
            a.material.opacity = 0.95 - (i / this.arrows.length) * 0.4;
          }
        }
      } else {
        for (const a of this.arrows) a.visible = false;
      }
    }
  }
}

// Walk-over collectibles: drop-in items that bob and spin, pick up on touch.
export class Pickups {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  add(mesh, x, z, id, onPick) {
    mesh.position.set(x, 0.5, z);
    this.scene.add(mesh);
    this.items.push({ mesh, id, onPick, taken: false, baseY: 0.5 });
  }
  update(dt, playerPos) {
    const t = performance.now() / 1000;
    for (const it of this.items) {
      if (it.taken) continue;
      it.mesh.rotation.y += dt * 1.8;
      it.mesh.position.y = it.baseY + Math.sin(t * 2.5 + it.mesh.position.x) * 0.08;
      const dx = playerPos.x - it.mesh.position.x;
      const dz = playerPos.z - it.mesh.position.z;
      const dy = playerPos.y - it.mesh.position.y;
      if (dx * dx + dz * dz < 0.55 && dy < 1.2) {
        it.taken = true;
        this.scene.remove(it.mesh);
        try { (it.id || '').startsWith('camera') ? sfxCamera() : sfxVinyl(); } catch {}
        if (it.onPick) it.onPick(it.id);
      }
    }
  }
  count() { return this.items.filter((i) => i.taken).length; }
  total() { return this.items.length; }
}

export class PlayerController {
  constructor(person, input, bounds) {
    this.person = person;
    this.input = input;
    this.bounds = bounds || []; // {minX,maxX,minZ,maxZ}
    this.speed = 4.1;
    this.vel = new THREE.Vector3();
    this.frozen = false;
    this.vy = 0;
    this.grounded = true;
    this.jumpQueued = false;
  }
  jump() {
    if (this.grounded && !this.frozen) {
      this.vy = 5.2;
      this.grounded = false;
    }
  }
  update(dt) {
    if (this.input.consumeJump && this.input.consumeJump()) this.jump();
    const gg = this.person.group;
    if (!this.grounded || this.vy > 0) {
      this.vy -= 14 * dt;
      gg.position.y += this.vy * dt;
      if (gg.position.y <= 0) {
        gg.position.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }
    if (this.frozen) {
      this.person.animateIdle(performance.now() / 1000);
      return;
    }
    const { x, z } = this.input.axes();
    const g = this.person.group;
    const moving = Math.hypot(x, z) > 0.05;
    const len = Math.min(1, Math.hypot(x, z));
    // velocity smoothing: accelerate toward input direction, glide to stop
    let tvx = 0, tvz = 0;
    if (moving) {
      const targetAngle = Math.atan2(x, z);
      tvx = Math.sin(targetAngle) * this.speed * len;
      tvz = Math.cos(targetAngle) * this.speed * len;
      // face movement direction with shortest-arc easing
      let diff = targetAngle - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 10);
    }
    const accel = moving ? 14 : 11;
    this.vel.x += (tvx - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (tvz - this.vel.z) * Math.min(1, accel * dt);
    const spd = Math.hypot(this.vel.x, this.vel.z);
    if (spd > 0.12) {
      const nx = g.position.x + this.vel.x * dt;
      const nz = g.position.z + this.vel.z * dt;
      // axis-separated collision: try x, then z
      if (!this.collides(nx, g.position.z)) g.position.x = nx; else this.vel.x = 0;
      if (!this.collides(g.position.x, nz)) g.position.z = nz; else this.vel.z = 0;
      this.person.animateWalk(dt, Math.min(1, spd / this.speed) * 1.05);
    } else {
      this.vel.x = 0; this.vel.z = 0;
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
    const keyHandler = (ev) => {
      const n = parseInt(ev.key, 10);
      if (n >= 1 && n <= options.length) {
        window.removeEventListener('keydown', keyHandler);
        box.classList.add('hidden');
        box.innerHTML = '';
        resolve(n - 1);
      }
    };
    window.addEventListener('keydown', keyHandler);
  });
}
