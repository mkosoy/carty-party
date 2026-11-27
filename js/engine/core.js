import { sfxCamera, sfxVinyl, sfxStep } from './sfx.js';
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
  setRoom(minX, maxX, minZ, maxZ, maxY = 3.1) {
    this.room = { minX, maxX, minZ, maxZ, maxY };
  }
  update(dt, target) {
    // consume orbit input (mouse drag / touch drag on the right half)
    const inp = window.__gameInput;
    if (inp) {
      const dragging = Math.abs(inp.camDX) > 0.0001 || Math.abs(inp.camDY) > 0.0001;
      if (dragging) {
        this.yaw += inp.camDX * 0.85;
        this.pitch = Math.max(-0.4, Math.min(1.0, this.pitch + inp.camDY * 0.85));
        this.lastDragT = performance.now() / 1000;
      }
      inp.camDX = 0; inp.camDY = 0;
      // auto-align: if the player is walking and hasn't dragged for 2s, ease behind them
      const nowT = performance.now() / 1000;
      const moving = inp.axes && (Math.abs(inp.axes().x) > 0.1 || Math.abs(inp.axes().z) > 0.1);
      if (moving && (!this.lastDragT || nowT - this.lastDragT > 0.9) && window.__playerFacing !== undefined) {
        let targetYaw = window.__playerFacing;
        let d = targetYaw - this.yaw;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.yaw += d * Math.min(1, dt * 2.1);
      }
    }
    window.__camYaw = this.yaw;
    // rotate the follow offset by the yaw, lift/drop with pitch
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const dist = 1 - this.pitch * 0.35;
    const rot = new THREE.Vector3(
      (this.offset.x * cy - this.offset.z * sy) * dist,
      this.offset.y + this.pitch * 3.2,
      (this.offset.x * sy + this.offset.z * cy) * dist
    );
    let desired = target.clone().add(rot);
    if (this.room) {
      const m = 1.1;
      // pull-in instead of wall-slide: if the orbit position would leave the room,
      // shrink the camera distance toward the player until it fits — this keeps
      // rotation smooth in small venues instead of the camera grinding along walls
      for (let shrink = 0; shrink < 6; shrink++) {
        const cx = Math.max(this.room.minX + m, Math.min(this.room.maxX - m, desired.x));
        const cz = Math.max(this.room.minZ + m, Math.min(this.room.maxZ - m, desired.z));
        if (cx === desired.x && cz === desired.z) break;
        desired = target.clone().add(rot.clone().multiplyScalar(1 - (shrink + 1) * 0.13));
        desired.y = Math.max(desired.y, target.y + 1.1);
      }
      desired.x = Math.max(this.room.minX + m, Math.min(this.room.maxX - m, desired.x));
      desired.z = Math.max(this.room.minZ + m, Math.min(this.room.maxZ - m, desired.z));
    }
    // camera collision-lite: if the desired spot is inside a collision box, pull toward the player
    const obs = window.__playerBounds;
    if (obs && obs.length) {
      let guard = 0;
      const inside = (p) => obs.some((b) => p.x > b.minX - 0.15 && p.x < b.maxX + 0.15 && p.z > b.minZ - 0.15 && p.z < b.maxZ + 0.15 && p.y < 2.6);
      while (inside(desired) && guard < 12) {
        desired.lerp(target.clone().add(new THREE.Vector3(0, 1.8, 0)), 0.28);
        guard++;
      }
    }
    this.pos.lerp(desired, Math.min(1, dt * 4.5));
    this.camera.position.copy(this.pos);
    if (this.room) {
      this.camera.position.y = Math.min(this.camera.position.y, this.room.maxY);
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
      new THREE.CylinderGeometry(0.16, 0.3, 5.6, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd663, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false })
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
    if (this.bursts && this.bursts.length) {
      for (let bi = this.bursts.length - 1; bi >= 0; bi--) {
        const b = this.bursts[bi];
        b.t += dt;
        b.m.scale.setScalar(1 + b.t * 5);
        b.m.material.opacity = Math.max(0, 0.95 - b.t * 2.2);
        b.m.position.y = 0.12 + b.t * 0.8;
        if (b.t > 0.5) { this.scene.remove(b.m); this.bursts.splice(bi, 1); }
      }
    }
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
        // burst: expanding gold ring so the pickup feels rewarding
        if (!this.bursts) this.bursts = [];
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.3, 0.035, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xffd770, transparent: true, opacity: 0.95 })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(it.mesh.position.x, 0.12, it.mesh.position.z);
        this.scene.add(ring);
        this.bursts.push({ m: ring, t: 0 });
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
    window.__playerBounds = this.bounds;
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
      const joyMag = Math.hypot(this.input.joyX || 0, this.input.joyY || 0);
      const sprint = (this.input.keys.has('ShiftLeft') || this.input.keys.has('ShiftRight') || joyMag > 0.94) ? 1.55 : 1;
      tvx = Math.sin(targetAngle) * this.speed * len * sprint;
      tvz = Math.cos(targetAngle) * this.speed * len * sprint;
      // face movement direction with shortest-arc easing
      let diff = targetAngle - g.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      g.rotation.y += diff * Math.min(1, dt * 10);
      window.__playerFacing = targetAngle;
    }
    // sprint dust: little puffs at your heels when going fast
    const sprinting = moving && (this.input.keys.has('ShiftLeft') || this.input.keys.has('ShiftRight') || Math.hypot(this.input.joyX || 0, this.input.joyY || 0) > 0.94);
    if (sprinting && this.grounded) {
      this.puffT = (this.puffT || 0) - dt;
      if (this.puffT <= 0) {
        this.puffT = 0.16;
        const sc = this.person.group.parent;
        if (sc) {
          const puff = new THREE.Mesh(
            new THREE.SphereGeometry(0.09, 6, 6),
            new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.5 })
          );
          puff.position.set(g.position.x, 0.08, g.position.z);
          sc.add(puff);
          this.puffs = this.puffs || [];
          this.puffs.push({ m: puff, t: 0, sc });
        }
      }
    }
    if (this.puffs && this.puffs.length) {
      for (let pi = this.puffs.length - 1; pi >= 0; pi--) {
        const p = this.puffs[pi];
        p.t += dt;
        p.m.scale.setScalar(1 + p.t * 3);
        p.m.position.y += dt * 0.7;
        p.m.material.opacity = Math.max(0, 0.5 - p.t * 1.1);
        if (p.t > 0.5) { p.sc.remove(p.m); this.puffs.splice(pi, 1); }
      }
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
      // footsteps on each stride half-cycle
      const phase = this.person.walkPhase || 0;
      if (this.__lastStepPhase !== undefined && Math.floor(phase / Math.PI) !== Math.floor(this.__lastStepPhase / Math.PI)) {
        try { sfxStep(spd > this.speed * 0.8); } catch {}
      }
      this.__lastStepPhase = phase;
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
let sparkleTex = null;
function getSparkleTex() {
  if (sparkleTex) return sparkleTex;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 64;
  const x = cv.getContext('2d');
  const grad = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,235,170,1)');
  grad.addColorStop(0.4, 'rgba(255,210,110,0.55)');
  grad.addColorStop(1, 'rgba(255,210,110,0)');
  x.fillStyle = grad;
  x.fillRect(0, 0, 64, 64);
  sparkleTex = new THREE.CanvasTexture(cv);
  return sparkleTex;
}

export class Interactions {
  constructor(scene) { this.items = []; this.scene = scene || null; }
  add(item) {
    this.items.push(item);
    // floating gold glint so interactive spots are visible in the world
    if (this.scene && !item.noSparkle) {
      const smat = new THREE.SpriteMaterial({ map: getSparkleTex(), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
      const spr = new THREE.Sprite(smat);
      spr.scale.set(0.45, 0.45, 1);
      spr.position.copy(item.pos).add(new THREE.Vector3(0, 1.7, 0));
      this.scene.add(spr);
      window.__sparkles = window.__sparkles || [];
      window.__sparkles.push({ spr, base: spr.position.y, phase: Math.random() * 6.28 });
    }
    return item;
  }
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
    const skipEl = document.getElementById('dialogue-skip');
    if (skipEl) skipEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.input.escapeQueued = true;
    });
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
        if (this.input.consumeEscape && this.input.consumeEscape()) {
          // ESC = skip the whole conversation — fast-forward to the last line
          i = lines.length - 1;
          show();
        }
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


// Text-message toast: slides in, auto-dismisses, tap to dismiss early.
export function phoneText(sender, text, ms = 5200) {
  let box = document.getElementById('phone-text-toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'phone-text-toast';
    box.style.cssText = 'position:fixed;top:104px;left:50%;transform:translate(-50%,-80px);background:rgba(20,24,34,0.94);border:1px solid rgba(255,255,255,0.25);border-radius:14px;padding:8px 14px;max-width:250px;z-index:60;transition:transform 0.35s ease;color:#fff;font-family:inherit;box-shadow:0 4px 18px rgba(0,0,0,0.5);cursor:pointer;';
    document.body.appendChild(box);
    box.addEventListener('click', () => { box.style.transform = 'translate(-50%,-80px)'; });
  }
  if (window.__ptTimer) clearTimeout(window.__ptTimer);
  box.innerHTML = '<div style="font-size:11px;color:#8fd0ff;font-weight:700;margin-bottom:2px;">💬 ' + sender + '</div><div style="font-size:13px;line-height:1.35;">' + text + '</div>';
  requestAnimationFrame(() => { box.style.transform = 'translate(-50%,0)'; });
  window.__ptTimer = setTimeout(() => { box.style.transform = 'translate(-50%,-80px)'; }, ms);
  if (window.__sfxBuzz) window.__sfxBuzz();
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

// NPCs turn to face the player when close — makes the world feel aware.
export function npcFacePlayer(npc, player, radius = 3.4, lerp = 5, dt = 0.016) {
  if (!npc?.group || !player?.group) return;
  const dx = player.group.position.x - npc.group.position.x;
  const dz = player.group.position.z - npc.group.position.z;
  const dist = Math.hypot(dx, dz);
  if (dist < radius) {
    const target = Math.atan2(dx, dz);
    let diff = target - npc.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    npc.group.rotation.y += diff * Math.min(1, lerp * dt);
  }
}
