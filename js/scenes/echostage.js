import * as THREE from 'three';
import { makePerson, playerIdentity } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective } from '../engine/core.js';

// ECHOSTAGE DC — the warehouse cathedral of dance music on Queens Chapel Rd.
// You are working the bar tonight: customers step up with orders, pour the
// right drink before their patience runs out. Streaks earn tips.
export async function echostageScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x060509);
  scene.fog = new THREE.Fog(0x0a0812, 14, 42);
  scene.add(new THREE.AmbientLight(0x453f5e, 2.0));
  const keyL = new THREE.DirectionalLight(0x8090c0, 0.5);
  keyL.position.set(-6, 10, 4);
  scene.add(keyL);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c });

  // ---- warehouse shell: 36 x 24, tall dark walls, concrete floor ----
  const floor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.2, 24), new THREE.MeshStandardMaterial({ color: 0x141318, roughness: 0.5, metalness: 0.3 }));
  floor.receiveShadow = true;
  scene.add(floor);
  for (const [w, h, d, x, z] of [
    [36, 9, 0.4, 0, -12], [36, 9, 0.4, 0, 12], [0.4, 9, 24, -18, 0], [0.4, 9, 24, 18, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x0d0b12));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -18, maxX: 18, minZ: -12.4, maxZ: -11.9 }, { minX: -18, maxX: 18, minZ: 11.9, maxZ: 12.4 },
    { minX: -18.4, maxX: -17.9, minZ: -12.4, maxZ: 12.4 }, { minX: 17.9, maxX: 18.4, minZ: -12.4, maxZ: 12.4 },
  ];
  // ceiling trusses with moving-head fixtures
  for (let tx = -14; tx <= 14; tx += 7) {
    const truss = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 24), mat(0x2a2a30));
    truss.position.set(tx, 8.2, 0);
    scene.add(truss);
  }
  const beamMats = [];
  const beams = [];
  for (const [bx, hue] of [[-10, 0xff2a8a], [-4, 0x40e8ff], [4, 0xa040ff], [10, 0x40ff88]]) {
    const bm = new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8, 12, 1, true), bm);
    cone.position.set(bx, 4.6, -6);
    scene.add(cone);
    beamMats.push(bm); beams.push(cone);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat(0x1a1a20));
    head.position.set(bx, 8.0, -6);
    scene.add(head);
  }

  // ---- the stage: raised platform, massive LED wall, performer silhouette ----
  const stage = new THREE.Mesh(new THREE.BoxGeometry(16, 1.0, 5), mat(0x101018));
  stage.position.set(0, 0.5, -9.5);
  scene.add(stage);
  bounds.push({ minX: -8, maxX: 8, minZ: -12, maxZ: -7.4 });
  // LED wall — animated waveform canvas
  const ledC = document.createElement('canvas');
  ledC.width = 256; ledC.height = 128;
  const ledX = ledC.getContext('2d');
  const ledT = new THREE.CanvasTexture(ledC);
  ledT.colorSpace = THREE.SRGBColorSpace;
  const led = new THREE.Mesh(new THREE.PlaneGeometry(18, 5.5), new THREE.MeshBasicMaterial({ map: ledT }));
  led.position.set(0, 4.6, -11.7);
  scene.add(led);
  // ECHOSTAGE letters over the wall
  const sgC = document.createElement('canvas');
  sgC.width = 1024; sgC.height = 128;
  const sg = sgC.getContext('2d');
  sg.fillStyle = '#08070c'; sg.fillRect(0, 0, 1024, 128);
  sg.font = 'bold 84px Arial'; sg.textAlign = 'center';
  sg.fillStyle = '#ffffff';
  sg.shadowColor = '#40e8ff'; sg.shadowBlur = 26;
  sg.fillText('E C H O S T A G E', 512, 92);
  const sgT = new THREE.CanvasTexture(sgC);
  sgT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 1.75), new THREE.MeshBasicMaterial({ map: sgT, transparent: true }));
  sign.position.set(0, 7.6, -11.6);
  scene.add(sign);
  // performer on stage — silhouette bouncing
  const performer = makePerson({ top: 0x101010, bottom: 0x101010, hair: 0x0a0a0a, skin: 0x8a6a52 });
  performer.group.position.set(0, 1.0, -9.8);
  scene.add(performer.group);

  // ---- the dance crowd — dense, moving with the beat ----
  const crowd = [];
  const palette = [0x8a3a4a, 0x3a5a8a, 0x4a7a4a, 0x6a3a6a, 0xa06a30, 0x3a8a8a, 0xb0b0b0];
  for (let i = 0; i < 14; i++) {
    const p = makePerson({ top: palette[i % palette.length], bottom: 0x1a1a22, hair: [0x2a1a12, 0x1a1a1a, 0x6a5a4a, 0x4a3a20][i % 4], skin: [0xd0a080, 0xc89878, 0x8a5a3a, 0xe0b090][i % 4], party: true });
    const cx = -8 + (i % 5) * 4 + (Math.random() - 0.5) * 1.6;
    const cz = -4 + Math.floor(i / 5) * 3.4 + (Math.random() - 0.5) * 1.4;
    p.group.position.set(cx, 0, cz);
    p.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.8;
    scene.add(p.group);
    crowd.push({ p, off: Math.random() * 6.28 });
  }

  // ---- the bar: long counter along the east wall, back bar glowing ----
  const barX = 14.5;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.05, 14), new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.35, metalness: 0.2 }));
  counter.position.set(barX, 0.55, 0);
  scene.add(counter);
  bounds.push({ minX: barX - 0.9, maxX: barX + 0.9, minZ: -7, maxZ: 7 });
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 14.4), new THREE.MeshStandardMaterial({ color: 0x3a2c1e, roughness: 0.2, metalness: 0.4 }));
  counterTop.position.set(barX, 1.11, 0);
  scene.add(counterTop);
  // back bar shelving with glowing bottles
  const backBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 14), mat(0x14100c));
  backBar.position.set(17.5, 2.4, 0);
  scene.add(backBar);
  const bottleColors = [0xffa040, 0x40ff88, 0xff4a6a, 0x40c8ff, 0xf0e060, 0xa060ff];
  for (let shelf = 0; shelf < 3; shelf++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 13), mat(0x2a2018));
    board.position.set(17.2, 1.5 + shelf * 1.2, 0);
    scene.add(board);
    for (let b = 0; b < 16; b++) {
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.3, 6), new THREE.MeshStandardMaterial({ color: bottleColors[(b + shelf) % bottleColors.length], emissive: bottleColors[(b + shelf) % bottleColors.length], emissiveIntensity: 0.3, roughness: 0.3 }));
      bt.position.set(17.2, 1.72 + shelf * 1.2, -6 + b * 0.8);
      scene.add(bt);
    }
  }
  // shelf backlight wash
  const wash = new THREE.PointLight(0x60c8ff, 26, 12);
  wash.position.set(15.8, 3.2, 0);
  scene.add(wash);
  // taps on the counter
  for (const tz of [-2, 0, 2]) {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8), mat(0xb0b0b8));
    tap.position.set(barX, 1.4, tz);
    scene.add(tap);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glow(0xffd770));
    handle.position.set(barX, 1.68, tz);
    scene.add(handle);
  }
  // bar signage
  function neonSign(text, color, w, x, y, z, ry = 0) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 128;
    const x2 = c.getContext('2d');
    x2.font = 'bold 72px Arial'; x2.textAlign = 'center';
    x2.shadowColor = color; x2.shadowBlur = 24;
    x2.fillStyle = '#ffffff';
    x2.fillText(text, 256, 90);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
  }
  neonSign('ECHOSTAGE', '#40e8ff', 7, -17.6, 6.4, 0, Math.PI / 2);
  neonSign('queens chapel rd — dc', '#ff2a8a', 5, 0, 6.2, 11.6, Math.PI);
  const washA = new THREE.PointLight(0xff2a8a, 30, 20);
  washA.position.set(-6, 5, 0);
  scene.add(washA);
  const washB = new THREE.PointLight(0x40e8ff, 30, 20);
  washB.position.set(6, 5, 2);
  scene.add(washB);
  // overhead practicals
  for (const [lx, lz] of [[-8, 4], [0, 4], [8, 4], [12, 0]]) {
    const pt = new THREE.PointLight(0xffe8c0, 46, 24);
    pt.position.set(lx, 6.8, lz);
    scene.add(pt);
  }

  // ---- player: the bartender, behind the counter ----
  const christian = makePerson({ photo: faces.christian, top: 0x181818, bottom: 0x22222a, hair: 0x2a1a12, skin: 0xd0a080, ...playerIdentity(faces) });
  christian.group.position.set(4, 0, 6);
  christian.group.rotation.y = Math.PI;
  scene.add(christian.group);
  const player = new PlayerController(christian, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.setRoom(-17.5, 17.5, -11.5, 11.5);
  followCam.snap(christian.group.position);

  // ---- the bartending minigame ----
  const DRINKS = [
    { key: '1', emoji: '🍺', name: 'beer', color: 0xffa040 },
    { key: '2', emoji: '🍸', name: 'martini', color: 0x40ff88 },
    { key: '3', emoji: '🥃', name: 'whiskey', color: 0xd08030 },
    { key: '4', emoji: '🍹', name: 'cocktail', color: 0xff4a8a },
  ];
  const state = { active: false, score: 0, streak: 0, served: 0, missed: 0, timeLeft: 0, customers: [], shiftDone: false };
  const barSlots = [-5, -2.5, 0, 2.5, 5]; // z positions along the bar front

  // overlay UI
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:40;display:none;pointer-events:none;font-family:Arial,sans-serif';
  overlay.innerHTML = `
    <div style="display:flex;justify-content:center;gap:10px;padding:12px;flex-wrap:wrap">
      ${DRINKS.map((d, i) => `<button data-drink="${i}" style="pointer-events:auto;font-size:30px;padding:12px 18px;border-radius:12px;border:2px solid rgba(255,255,255,.25);background:rgba(10,10,20,.8);cursor:pointer;touch-action:manipulation;min-width:74px;color:#fff">${d.emoji}<div style="font-size:11px;opacity:.7;margin-top:2px">${d.key}</div></button>`).join('')}
    </div>`;
  document.body.appendChild(overlay);
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:40;display:none;color:#fff;font:bold 17px Arial;text-shadow:0 2px 6px #000;text-align:center';
  document.body.appendChild(hud);

  function spawnCustomer() {
    const free = barSlots.filter((z) => !state.customers.some((c) => c.slot === z));
    if (!free.length) return;
    const slot = free[Math.floor(Math.random() * free.length)];
    const order = DRINKS[Math.floor(Math.random() * DRINKS.length)];
    const p = makePerson({ top: palette[Math.floor(Math.random() * palette.length)], bottom: 0x22222a, hair: 0x2a1a12, skin: [0xd0a080, 0x8a5a3a, 0xe0b090][Math.floor(Math.random() * 3)], party: true });
    p.group.position.set(12.6, 0, slot + 2.5);
    p.group.rotation.y = Math.PI / 2;
    scene.add(p.group);
    // order bubble
    const bc = document.createElement('canvas');
    bc.width = 128; bc.height = 128;
    const bx = bc.getContext('2d');
    bx.fillStyle = 'rgba(255,255,255,0.95)';
    bx.beginPath(); bx.arc(64, 54, 44, 0, 6.29); bx.fill();
    bx.font = '54px Arial'; bx.textAlign = 'center';
    bx.fillText(order.emoji, 64, 74);
    bx.beginPath(); bx.moveTo(52, 92); bx.lineTo(76, 92); bx.lineTo(60, 116); bx.fill();
    const bt = new THREE.CanvasTexture(bc);
    const bub = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: bt, transparent: true }));
    bub.position.set(12.6, 2.1, slot + 2.5);
    scene.add(bub);
    state.customers.push({ p, slot: slot + 2.5, targetZ: slot, order, patience: 1.0, bub, phase: 'arriving' });
  }

  function serve(drinkIdx) {
    if (!state.active) return;
    // serve the most impatient waiting customer
    const waiting = state.customers.filter((c) => c.phase === 'waiting').sort((a, b) => a.patience - b.patience)[0];
    if (!waiting) return;
    if (DRINKS[drinkIdx] === waiting.order) {
      state.streak++;
      const tip = 10 + Math.min(state.streak * 2, 20) + Math.round(waiting.patience * 10);
      state.score += tip;
      state.served++;
      waiting.phase = 'served';
      waiting.leaveT = 0;
      showObjective(`✅ ${waiting.order.emoji} +$${tip}${state.streak > 2 ? ' — streak x' + state.streak + '!' : ''}`, 1200);
    } else {
      state.streak = 0;
      waiting.phase = 'served';
      waiting.leaveT = 0;
      waiting.wrong = true;
      showObjective('❌ wrong drink!', 1200);
    }
    scene.remove(waiting.bub);
  }
  overlay.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => serve(parseInt(b.dataset.drink))));
  window.addEventListener('keydown', (e) => {
    const di = DRINKS.findIndex((d) => d.key === e.key);
    if (di >= 0 && state.active) serve(di);
  });

  const interactions = new Interactions(scene);
  interactions.add({
    pos: new THREE.Vector3(12.9, 0, 0), radius: 2.6, label: 'Start your shift',
    once: false,
    action: async () => {
      if (state.active) return;
      if (state.shiftDone) {
        await dialogue.play([{ speaker: 'Christian', text: 'Shift is done. I am off the clock — the dance floor calls.' }]);
        return;
      }
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Manager', text: 'Christian! Tonight you are behind the stick at the biggest club in DC. Orders up top — pour fast, pour right.' },
        { speaker: 'Christian', text: 'One night only. Let us make it legendary.' },
      ]);
      player.frozen = false;
      christian.group.position.set(16.2, 0, 0);
      christian.group.rotation.y = -Math.PI / 2;
      state.active = true;
      state.timeLeft = 75;
      overlay.style.display = 'block';
      hud.style.display = 'block';
      showObjective('Pour drinks! Keys 1-4 or tap — match each order before patience runs out', 4000);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(0, 0, -4), radius: 3.4, label: 'Feel the bass',
    action: async () => {
      await dialogue.play([{ speaker: 'Christian', text: 'Echostage. Voted best club in the world, and standing in front of that wall you understand exactly why.' }]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-14, 0, 0), radius: 2.6, label: 'The west wall neon',
    action: async () => {
      await dialogue.play([{ speaker: 'Christian', text: 'Warehouse outside, cathedral inside. Queens Chapel Rd keeps its secrets well.' }]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(0, 0, 9), radius: 2.8, label: 'Watch the crowd',
    action: async () => {
      await dialogue.play([{ speaker: 'Christian', text: 'Nobody in here is thinking about tomorrow. That is the whole point of this place.' }]);
    },
  });

  let spawnT = 0;
  window.__sceneHint = 'WASD — move · E — interact · 1-4 — pour drinks on shift';

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian, self: this };
      player.update(dt);
      if (state.active || christian.group.position.x > 14.8) {
        // cinema camera: high behind the bar looking across the counter into the club
        const cz = Math.max(-5.5, Math.min(5.5, christian.group.position.z));
        camera.position.x += ((16.9) - camera.position.x) * Math.min(1, dt * 5);
        camera.position.y += ((3.1) - camera.position.y) * Math.min(1, dt * 5);
        camera.position.z += ((cz + 2.2) - camera.position.z) * Math.min(1, dt * 5);
        camera.lookAt(11.8, 1.0, cz - 0.5);
      } else {
        followCam.update(dt, christian.group.position);
      }
      const nearI = interactions.nearest(christian.group.position);
      const promptEl = document.getElementById('interact-prompt');
      if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) {
        promptEl.classList.add('hidden');
      }
      if (nearI && !player.frozen && input.consumeInteract()) nearI.action();
      const t = performance.now() / 1000;
      // crowd bounces to the beat
      for (const c of crowd) {
        c.p.group.position.y = Math.abs(Math.sin(t * 2.6 + c.off)) * 0.14;
        c.p.group.rotation.y += Math.sin(t * 1.3 + c.off) * dt * 0.4;
      }
      performer.group.position.y = 1.0 + Math.abs(Math.sin(t * 2.6)) * 0.18;
      performer.animateWalk(dt, 0.5);
      // beams sweep
      for (let i = 0; i < beams.length; i++) {
        beams[i].rotation.z = Math.sin(t * 0.7 + i * 1.6) * 0.5;
        beams[i].rotation.x = Math.cos(t * 0.5 + i) * 0.3;
        beamMats[i].opacity = 0.03 + Math.abs(Math.sin(t * 2.6 + i)) * 0.03;
      }
      // LED wall waveform
      ledX.fillStyle = '#05060e';
      ledX.fillRect(0, 0, 256, 128);
      for (let x = 0; x < 256; x += 4) {
        const h = 20 + Math.abs(Math.sin(x * 0.09 + t * 4.2)) * 60 + Math.sin(x * 0.02 + t) * 14;
        const hue = (x * 1.4 + t * 80) % 360;
        ledX.fillStyle = `hsl(${hue},90%,55%)`;
        ledX.fillRect(x, 128 - h, 3, h);
      }
      ledT.needsUpdate = true;
      // ---- shift logic ----
      if (state.active) {
        state.timeLeft -= dt;
        spawnT -= dt;
        if (spawnT <= 0 && state.customers.length < 4) {
          spawnCustomer();
          spawnT = 3.2 - Math.min(state.score / 400, 1.4);
        }
        hud.innerHTML = `⏱ ${Math.max(0, Math.ceil(state.timeLeft))}s &nbsp;·&nbsp; 💰 $${state.score} &nbsp;·&nbsp; served ${state.served}`;
        if (state.timeLeft <= 0) {
          state.active = false;
          state.shiftDone = true;
          overlay.style.display = 'none';
          hud.style.display = 'none';
          for (const c of state.customers) { scene.remove(c.p.group); scene.remove(c.bub); }
          state.customers = [];
          (async () => {
            player.frozen = true;
            const grade = state.served >= 12 ? 'You are HIRED any night you want. Legend of the stick.' : state.served >= 7 ? 'Respectable shift, rookie. Very respectable.' : 'Well. You kept the glasses full. Mostly.';
            christian.group.position.set(12.8, 0, 0);
            christian.group.rotation.y = Math.PI / 2;
            await dialogue.play([
              { speaker: 'Manager', text: `Shift over! ${state.served} drinks served, $${state.score} in tips. ${grade}` },
              { speaker: 'Christian', text: 'Echostage bartender: one night only. What a room to do it in.' },
            ]);
            player.frozen = false;
          })();
        }
      }
      // customer movement + patience
      for (let i = state.customers.length - 1; i >= 0; i--) {
        const c = state.customers[i];
        if (c.phase === 'arriving') {
          c.p.group.position.z -= dt * 2.2;
          c.p.animateWalk(dt, 2.2);
          if (c.p.group.position.z <= c.slot) { c.phase = 'waiting'; c.p.group.position.z = c.slot; }
        } else if (c.phase === 'waiting') {
          c.patience -= dt / 14;
          c.bub.position.y = 2.1 + Math.sin(t * 3) * 0.05;
          c.bub.material.color.setHSL(0.3 * Math.max(c.patience, 0), 0.9, 0.65);
          if (c.patience <= 0) {
            c.phase = 'leaving';
            state.missed++;
            state.streak = 0;
            scene.remove(c.bub);
            showObjective('😤 customer walked off…', 1200);
          }
        } else if (c.phase === 'served') {
          c.leaveT += dt;
          if (c.leaveT > (c.wrong ? 0.4 : 1.2)) c.phase = 'leaving';
          if (!c.wrong) c.p.group.position.y = Math.abs(Math.sin(t * 6)) * 0.08;
        } else if (c.phase === 'leaving') {
          c.p.group.position.z += dt * 2.4;
          c.p.group.rotation.y = -Math.PI / 2;
          c.p.animateWalk(dt, 2.4);
          if (c.p.group.position.z > 10.5) {
            scene.remove(c.p.group);
            state.customers.splice(i, 1);
          }
        }
      }
    },
  };
}
