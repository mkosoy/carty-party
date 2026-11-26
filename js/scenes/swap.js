import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, choice } from '../engine/core.js';

// Scene 4 — the swap. A Baltimore brewery venue: brick + string lights +
// shade sails outside the window, clothing racks everywhere, DJ booth,
// yoga corner, NPCs browsing. Stacy is filming a TikTok. Minigames: hang
// the clothes, then optional dance / yoga before the DC teleport.
export async function swapScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x241d18);
  scene.add(new THREE.AmbientLight(0xffd9b0, 1.0));
  const warm = new THREE.PointLight(0xffc080, 90, 60);
  scene.add(new THREE.PointLight(0xffd0a0, 40, 45));
  scene.children[scene.children.length-1].position.set(-10, 4.5, 5);
  warm.position.set(0, 5, 0);
  scene.add(warm);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const bounds = [];

  // big open brewery floor: brick walls, industrial windows, string lights
  const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 24), mat(0x6e5238));
  floor.receiveShadow = true;
  scene.add(floor);
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 0.4), mat(0x7a4436));
  wallN.position.set(0, 3, -12);
  scene.add(wallN);
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 0.4), mat(0x7a4436));
  wallS.position.set(0, 3, 12);
  scene.add(wallS);
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 24), mat(0x74402f));
    w.position.set(sx * 17, 3, 0);
    scene.add(w);
  }
  bounds.push(
    { minX: -17, maxX: 17, minZ: -12.5, maxZ: -11.7 },
    { minX: -17, maxX: 17, minZ: 11.7, maxZ: 12.5 },
    { minX: -17.5, maxX: -16.7, minZ: -12, maxZ: 12 },
    { minX: 16.7, maxX: 17.5, minZ: -12, maxZ: 12 },
  );

  // industrial windows along the north wall (harbor dusk behind glass)
  for (let i = -3; i <= 3; i++) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.MeshBasicMaterial({ color: 0x3a5570 }));
    win.position.set(i * 4.4, 3.4, -11.78);
    scene.add(win);
  }
  // string lights zigzag
  for (let row = -2; row <= 2; row++) {
    const pts = [];
    for (let x = -14; x <= 14; x += 1) {
      pts.push(new THREE.Vector3(x, 5.1 + Math.sin(x * 0.8) * 0.25, row * 4.4));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x554433 })));
    for (let x = -13; x <= 14; x += 2.2) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }));
      bulb.position.set(x, 5 + Math.sin(x * 0.8) * 0.25 - 0.12, row * 4.4);
      scene.add(bulb);
    }
  }

  // brewing tanks in the back corner (it's a brewery)
  for (let i = 0; i < 3; i++) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 14), mat(0xb8bcc4));
    tank.position.set(12.5 + i * 2.6, 1.7, -9.5);
    scene.add(tank);
    bounds.push({ minX: tank.position.x - 1.3, maxX: tank.position.x + 1.3, minZ: -10.8, maxZ: -8.2 });
  }

  // clothing racks — the heart of the swap (swap.season reference look)
  const rackPositions = [
    [-8, -4], [-1, -4], [6, -4],
    [-8, 2], [-1, 2], [6, 2],
  ];
  const clothColors = [0xc0526a, 0x5a8ac0, 0xe8e0d0, 0x3a3a3a, 0x7ab06a, 0x9a6ac0, 0xd0d0d0, 0x224, 0xa0522d];
  for (const [rx, rz] of rackPositions) {
    const rack = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 8), mat(0x999999));
    bar.rotation.z = Math.PI / 2;
    bar.position.y = 1.7;
    rack.add(bar);
    for (const lx of [-2.1, 2.1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), mat(0x999999));
      leg.position.set(lx, 0.85, 0);
      rack.add(leg);
    }
    // hanging clothes
    for (let i = 0; i < 8; i++) {
      const c = clothColors[Math.floor(Math.random() * clothColors.length)];
      const item = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9 + Math.random() * 0.4, 0.08), mat(c));
      item.position.set(-1.9 + i * 0.55, 1.25, 0);
      rack.add(item);
    }
    rack.position.set(rx, 0, rz);
    scene.add(rack);
    bounds.push({ minX: rx - 2.4, maxX: rx + 2.4, minZ: rz - 0.5, maxZ: rz + 0.5 });
  }

  // DJ booth east side
  const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.2), mat(0x1c1c24));
  booth.position.set(14, 0.55, 3);
  scene.add(booth);
  bounds.push({ minX: 12.7, maxX: 15.3, minZ: 2.4, maxZ: 3.6 });
  const djGlow = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0x50ffd0 }));
  djGlow.position.set(14, 1.25, 2.4);
  scene.add(djGlow);
  const dj = makePerson({ top: 0x222228, bottom: 0x222228, skin: 0x8a5a3a, hair: 0x111111 });
  dj.group.position.set(14, 0, 4.2);
  dj.group.rotation.y = Math.PI;
  scene.add(dj.group);

  // yoga corner west side: mats on the floor
  for (let i = 0; i < 4; i++) {
    const ym = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 2), mat([0xc0526a, 0x5a8ac0, 0x7ab06a, 0x9a6ac0][i]));
    ym.position.set(-14 + (i % 2) * 1.4, 0.02, -6 + Math.floor(i / 2) * 2.6);
    scene.add(ym);
  }

  // NPCs milling around the racks
  const npcs = [];
  const npcLooks = [
    { top: 0xd0d0d0, skin: 0xe8c098, hair: 0x6a4a26, hairStyle: 'long', height: 0.96 },
    { top: 0x7ab06a, skin: 0x8a5a3a, hair: 0x14100c, hairStyle: 'short', height: 1.04 },
    { top: 0xc0526a, skin: 0xd8a878, hair: 0x2a1a12, hairStyle: 'bun', height: 0.94 },
    { top: 0x334466, skin: 0xb87a50, hair: 0x0e0c0a, hairStyle: 'short', height: 1.06 },
    { top: 0x9a6ac0, skin: 0xe0b088, hair: 0x8a6a3a, hairStyle: 'long', height: 0.97 },
    { top: 0xd0894a, skin: 0xe8c098, hair: 0x4a3524, hairStyle: 'short', height: 1.0 },
  ];
  for (let i = 0; i < 6; i++) {
    const n = makePerson(npcLooks[i]);
    const home = rackPositions[i % rackPositions.length];
    n.group.position.set(home[0] + (Math.random() - 0.5) * 2, 0, home[1] + 1.4 + Math.random());
    scene.add(n.group);
    npcs.push({ p: n, t: Math.random() * 10 });
  }

  // player + Stacy (filming a tiktok with her friend near the entrance)
  const christian = makePerson({ photo: faces.christian, top: 0x8a6d4b, bottom: 0x2e2e38, hair: 0x54382a, hairStyle: 'short', skin: 0xe0b088 });
  christian.group.position.set(0, 0, 4);
  scene.add(christian.group);

  const stacy = makePerson({ photo: faces.stacy, top: 0x1a1a1a, bottom: 0x1a1a1a, hair: 0x2a1a12, hairStyle: 'long', skin: 0xe8c098 });
  stacy.group.position.set(-4, 0, 8);
  scene.add(stacy.group);
  const friend = makePerson({ top: 0xd0a0b8, skin: 0xd8a878, hair: 0x5a3a1a, hairStyle: 'long' });
  friend.group.position.set(-5.4, 0, 8.3);
  scene.add(friend.group);

  const followCam = new FollowCam(camera);
  followCam.offset.set(0, 2.8, 4.6);
  followCam.setRoom(-16.5, 16.5, -11.5, 11.5);
  followCam.snap(christian.group.position);
  const player = new PlayerController(christian, input, bounds);
  const interactions = new Interactions();

  const state = { met: false, hung: 0, dancing: false, danceScore: 0 };

  // --- Stacy ---
  interactions.add({
    pos: new THREE.Vector3(-4, 0, 8), radius: 2.4, label: 'Stacy ❤️', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Stacy', text: '— and THAT is why you come to the swap this weekend — oh. You finally made it, babe! What took you so long?' },
        { speaker: 'Christian', text: 'I don’t even know where to start. Anyway — where do you want these?' },
        { speaker: 'Stacy', text: 'Just drop them over there, babe.' },
      ]);
      state.met = true;
      showObjective('Hang the clothes on the marked rack — 4 pieces.', 5000);
      hangInt.hidden = false;
      player.frozen = false;
    },
  });

  // --- hang-clothes minigame: walk to the drop rack, press E 4 times with timing ---
  const dropRack = new THREE.Group();
  const drBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.4, 8), mat(0xcca050));
  drBar.rotation.z = Math.PI / 2;
  drBar.position.y = 1.7;
  dropRack.add(drBar);
  for (const lx of [-2.1, 2.1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), mat(0x999999));
    leg.position.set(lx, 0.85, 0);
    dropRack.add(leg);
  }
  dropRack.position.set(6, 0, 8);
  scene.add(dropRack);
  bounds.push({ minX: 3.6, maxX: 8.4, minZ: 7.5, maxZ: 8.5 });

  const hungItems = [];
  const hangInt = interactions.add({
    pos: new THREE.Vector3(6, 0, 8), radius: 2.4, label: 'Hang clothes',
    action: async () => {
      player.frozen = true;
      state.hung++;
      const c = clothColors[(state.hung * 3) % clothColors.length];
      const item = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1, 0.09), mat(c));
      item.position.set(-1.5 + state.hung * 0.85, 1.25, 0);
      dropRack.add(item);
      hungItems.push(item);
      if (state.hung >= 4) {
        await dialogue.play([
          { speaker: 'Christian', text: 'That’s everything — even Tre’s blanket-cardigan. May it find a loving home.' },
          { speaker: 'Stacy', text: 'You’re the best. Okay — enjoy the party! DJ’s actually good tonight.' },
        ]);
        hangInt.done = true;
        danceInt.hidden = false;
        yogaInt.hidden = false;
        stacy2Int.hidden = false;
        showObjective('The swap is yours — dance, do yoga, or talk to Stacy when ready for DC.', 6000);
      } else {
        showObjective(`Hung ${state.hung}/4 — press E again for the next piece.`, 2500);
      }
      player.frozen = false;
    },
  });
  hangInt.hidden = true;

  // --- dance minigame: rhythm-free "press E in the glow window" ---
  const danceInt = interactions.add({
    pos: new THREE.Vector3(12.6, 0, 3), radius: 2.4, label: 'Dance at the DJ booth',
    action: async () => {
      if (state.dancing) return;
      state.dancing = true;
      player.frozen = true;
      await dialogue.play([{ speaker: 'DJ', text: 'Y’all ready?? Match the beat — hit E when the ring closes!' }]);
      // simple beat game: 6 beats, ring shrinks, press E in window
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;left:50%;top:40%;transform:translate(-50%,-50%);z-index:30;pointer-events:none';
      document.body.appendChild(overlay);
      let hits = 0;
      for (let beat = 0; beat < 6; beat++) {
        const ring = document.createElement('div');
        ring.style.cssText = 'width:120px;height:120px;border:5px solid #ffd663;border-radius:50%;margin:auto;transition:transform .05s linear';
        overlay.appendChild(ring);
        const t0 = performance.now();
        const dur = 1100 - beat * 90;
        let hit = false, missed = false;
        await new Promise((resolve) => {
          const step = () => {
            const t = (performance.now() - t0) / dur;
            ring.style.transform = `scale(${Math.max(0.15, 1 - t * 0.85)})`;
            if (!hit && input.consumeInteract()) {
              if (t > 0.72) { hit = true; ring.style.borderColor = '#50ff70'; } else { missed = true; ring.style.borderColor = '#ff5050'; }
              resolve();
              return;
            }
            if (t >= 1.15) resolve();
            else requestAnimationFrame(step);
          };
          step();
        });
        if (hit) hits++;
        ring.remove();
      }
      overlay.remove();
      state.danceScore = hits;
      await dialogue.play([
        { speaker: 'DJ', text: hits >= 4 ? 'Ayy — some MOVES over here! Baltimore appreciates you.' : hits >= 2 ? 'Not bad, not bad. The floor forgives you.' : 'Bless your heart. Keep practicing, bronco.' },
      ]);
      state.dancing = false;
      player.frozen = false;
    },
  });
  danceInt.hidden = true;

  // --- yoga minigame: pose sequence buttons ---
  const yogaInt = interactions.add({
    pos: new THREE.Vector3(-13.5, 0, -5), radius: 2.6, label: 'Join the yoga lesson',
    action: async () => {
      player.frozen = true;
      const poses = ['🧘 downward dog', '🌳 tree pose', '🦅 eagle pose', '🪷 lotus'];
      const sequence = [];
      for (let i = 0; i < 3; i++) sequence.push(poses[Math.floor(Math.random() * poses.length)]);
      let score = 0;
      await dialogue.play([{ speaker: 'Instructor', text: 'Welcome in. I’ll call a pose — pick it before the breath ends. And remember: the swap clothes are watching.' }]);
      for (const target of sequence) {
        const opts = [...poses].sort(() => Math.random() - 0.5);
        showObjective(`Instructor calls: ${target.toUpperCase()}`, 2600);
        const idx = await choice(opts);
        if (opts[idx] === target) {
          score++;
          await dialogue.play([{ speaker: 'Instructor', text: ['Beautiful.', 'Yes — breathe into it.', 'The rack of cardigans is at peace.'][score - 1] || 'Beautiful.' }]);
        } else {
          await dialogue.play([{ speaker: 'Instructor', text: 'That is… not that pose. But it IS a stretch of some kind.' }]);
        }
      }
      await dialogue.play([
        { speaker: 'Instructor', text: score === 3 ? 'Perfect practice. Namaste, traveler of MoCo.' : 'Namaste. Your chakras are somewhere in the inner harbor.' },
      ]);
      player.frozen = false;
    },
  });
  yogaInt.hidden = true;

  // --- Stacy again: the DC trigger ---
  const stacy2Int = interactions.add({
    pos: new THREE.Vector3(-4, 0, 8), radius: 2.4, label: 'Stacy — ready for DC?',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Stacy', text: 'Hey — we’re going to DC tonight with Mark and Kylie. You still remember that, right?' },
        { speaker: 'Christian', text: 'Of course.' },
        { speaker: 'Stacy', text: 'Good. Then let’s go — they’re already down there!' },
      ]);
      const { dcScene } = await import('./dc.js');
      game.switchScene(dcScene);
    },
  });
  stacy2Int.hidden = true;

  showObjective('The swap! Find Stacy — she’s filming near the entrance.', 6500);

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      player.update(dt);
      followCam.update(dt, christian.group.position);

      // NPCs browse: shuffle around racks
      for (const n of npcs) {
        n.t += dt;
        if (n.t > 4) {
          n.t = 0;
          const home = rackPositions[Math.floor(Math.random() * rackPositions.length)];
          n.tx = home[0] + (Math.random() - 0.5) * 3;
          n.tz = home[1] + 1.2 + Math.random() * 1.2;
        }
        if (n.tx !== undefined) {
          const dx = n.tx - n.p.group.position.x;
          const dz = n.tz - n.p.group.position.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.2) {
            n.p.group.position.x += dx / d * dt * 0.8;
            n.p.group.position.z += dz / d * dt * 0.8;
            n.p.group.rotation.y = Math.atan2(dx, dz);
            n.p.animateWalk(dt, 0.5);
          } else {
            n.p.animateIdle(n.t);
          }
        }
      }
      // dj grooving
      dj.animateWalk(dt, 0.4);
      stacy.animateIdle(performance.now() / 1000);

      const near = [...interactions.items].filter((i) => !i.hidden && !(i.once && i.done));
      let best = null, bestD = Infinity;
      for (const it of near) {
        const d = christian.group.position.distanceTo(it.pos);
        if (d < it.radius && d < bestD) { best = it; bestD = d; }
      }
      const prompt = document.getElementById('interact-prompt');
      if (best && !player.frozen && !state.dancing) {
        prompt.classList.remove('hidden');
        if (input.consumeInteract()) {
          if (best.once) best.done = true;
          prompt.classList.add('hidden');
          best.action();
        }
      } else {
        prompt.classList.add('hidden');
      }
    },
    dispose() {
      document.getElementById('objective-banner').classList.add('hidden');
    },
  };
}
