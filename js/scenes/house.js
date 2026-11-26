import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, choice } from '../engine/core.js';

// Scene 3 — Olivia's townhouse. Three floors (basement / ground / upstairs)
// connected by stairs that fade-teleport. Jim downstairs, Olivia in her
// room, the OTHER Olivia across the hall with the nursery and the photo
// minigame, Tre in the basement with the last swap item.
export async function houseScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x1a1c26);
  scene.add(new THREE.AmbientLight(0xffe8c8, 1.15));
  const lampLight = new THREE.PointLight(0xffd9a0, 60, 40);
  lampLight.position.set(0, 4, 0);
  scene.add(lampLight);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // ---- build three stacked floor shells; only one is visible at a time ----
  function buildFloor({ wallColor, floorColor, y }) {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 12), mat(floorColor));
    floor.receiveShadow = true;
    g.add(floor);
    for (const [w, h, d, x, z] of [
      [16, 3.4, 0.3, 0, -6], [16, 3.4, 0.3, 0, 6], [0.3, 3.4, 12, -8, 0], [0.3, 3.4, 12, 8, 0],
    ]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(wallColor));
      wall.position.set(x, h / 2, z);
      g.add(wall);
    }
    g.position.y = y;
    g.visible = false;
    scene.add(g);
    return g;
  }

  const ground = buildFloor({ wallColor: 0xcfc4ae, floorColor: 0x9a7850, y: 0 });
  const upper = buildFloor({ wallColor: 0xd8cfc4, floorColor: 0xa88a62, y: 0 });
  const basement = buildFloor({ wallColor: 0x4a4a52, floorColor: 0x3c3c44, y: 0 });

  const boundsByFloor = {
    ground: [
      { minX: -8, maxX: 8, minZ: -6.4, maxZ: -5.9 }, { minX: -8, maxX: 8, minZ: 5.9, maxZ: 6.4 },
      { minX: -8.4, maxX: -7.9, minZ: -6.4, maxZ: 6.4 }, { minX: 7.9, maxX: 8.4, minZ: -6.4, maxZ: 6.4 },
    ],
    upper: [],
    basement: [],
  };
  boundsByFloor.upper = boundsByFloor.ground.map((b) => ({ ...b }));
  boundsByFloor.basement = boundsByFloor.ground.map((b) => ({ ...b }));

  // ---- furnishing helpers ----
  function box(parent, w, h, d, c, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // GROUND: foyer + living room, stairs illusion at x=6
  box(ground, 2.6, 0.9, 1.2, 0x7a5a3a, -4, 0.45, 3.5);        // couch
  box(ground, 1.4, 1.1, 0.8, 0x5a4a3a, 3, 0.55, -4.5);       // tv stand
  box(ground, 1.8, 1, 0.1, 0x111118, 3, 1.6, -5);            // tv
  box(ground, 0.9, 2.1, 0.15, 0x6a4a2a, -6.5, 1.05, 5.9);    // front door
  const stairsMarker = box(ground, 2, 0.3, 2, 0x8a6a4a, 6, 0.1, 4); // stair landing

  // holiday touches: garland + lights over the door (the reference photos)
  const garland = box(ground, 2.4, 0.25, 0.2, 0x1e5a2e, -6.5, 2.3, 5.85);
  for (let i = 0; i < 6; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: [0xff4444, 0xffd663, 0x44ff88][i % 3] }));
    bulb.position.set(-7.4 + i * 0.36, 2.28, 5.7);
    ground.add(bulb);
  }

  // UPPER: hallway with two bedroom doors, nursery across the hall
  box(upper, 1.1, 2.2, 0.15, 0x8a5a3a, -4, 1.1, -5.9);  // olivia's door (north-left)
  box(upper, 1.1, 2.2, 0.15, 0x8a5a3a, -4, 1.1, 5.9);   // olivia2 door (south-left)
  // Olivia's room corner: bed + clothes piles
  box(upper, 2.4, 0.7, 1.6, 0xd0a0b8, -6.2, 0.35, -4);
  for (let i = 0; i < 4; i++) box(upper, 0.7, 0.3 + Math.random() * 0.25, 0.6, [0xc0526a, 0x5a8ac0, 0x777, 0x9a6ac0][i], -2 + i * 0.8, 0.2, -3 - (i % 2));
  // nursery corner: crib + baby things
  box(upper, 1.6, 1, 1, 0xf0e0c0, -6.2, 0.5, 4);
  box(upper, 0.5, 0.5, 0.5, 0xffc0d0, -4.5, 0.25, 4.5);
  box(upper, 0.4, 0.4, 0.4, 0xc0d0ff, -3.8, 0.2, 5);
  // stairs landing upper
  box(upper, 2, 0.3, 2, 0x8a6a4a, 6, 0.1, 4);

  // BASEMENT: dark, spooky-ish, single bulb, Tre on the floor
  box(basement, 3, 0.8, 1.2, 0x555560, -4, 0.4, -3);
  box(basement, 1, 1.6, 1, 0x666670, 5, 0.8, -4.5); // water heater or whatever
  const bulbGeo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a0 }));
  bulbGeo.position.set(0, 2.9, 0);
  basement.add(bulbGeo);
  box(basement, 2, 0.3, 2, 0x555560, 6, 0.1, 4); // stairs landing

  // characters
  const christian = makePerson({ photo: faces.christian, top: 0x8a6d4b, bottom: 0x2e2e38, hair: 0x54382a, hairStyle: 'short', skin: 0xe0b088 });
  scene.add(christian.group);

  const jim = makePerson({ photo: faces.jim, top: 0x2c3140, bottom: 0x3c3c44, hair: 0xb8b0a4, hairStyle: 'short', skin: 0xd8a878 });
  jim.group.position.set(-3, 0, 2);
  ground.add(jim.group);

  const olivia = makePerson({ photo: faces.olivia, top: 0x1a1a1a, bottom: 0x1a1a1a, hair: 0x1e1410, hairStyle: 'long', skin: 0xe8c098 });
  olivia.group.position.set(-5.5, 0, -3.4);
  upper.add(olivia.group);

  const olivia2 = makePerson({ photo: faces.olivia2, top: 0xc05a7a, bottom: 0x777788, hair: 0x6a4a26, hairStyle: 'bun', skin: 0xe8c098 });
  olivia2.group.position.set(-5, 0, 3.8);
  upper.add(olivia2.group);

  const tre = makePerson({ photo: faces.tre, top: 0x3a4a3a, bottom: 0x2c2c34, hair: 0x14100c, hairStyle: 'short', skin: 0xb87a50 });
  tre.group.position.set(-1.5, 0, -2);
  tre.sit();
  basement.add(tre.group);

  // state
  let floor = 'ground';
  const groups = { ground, upper, basement };
  function showFloor(name) {
    for (const k of Object.keys(groups)) groups[k].visible = k === name;
    floor = name;
    player.bounds = boundsByFloor[name];
  }

  const followCam = new FollowCam(camera);
  followCam.offset.set(0, 2.6, 4.2);
  followCam.setRoom(-7.9, 7.9, -5.9, 5.9);
  const player = new PlayerController(christian, input, boundsByFloor.ground);
  const interactions = new Interactions();

  // start: walk in the front door
  showFloor('ground');
  christian.group.position.set(-4.5, 0, 0.5);
  christian.group.rotation.y = Math.PI;
  followCam.snap(christian.group.position);

  // item inventory
  const items = { main: false, photoDone: false, treItem: false };

  // stairs interactions (both directions)
  function stairs(id, x, z, from, to, label) {
    interactions.add({
      pos: new THREE.Vector3(x, 0, z), radius: 1.6, label,
      floor: from,
      action: () => {
        showFloor(to);
        christian.group.position.set(x, 0, z - 2.2);
      },
    });
  }

  // NOTE: interactions are filtered by current floor in update()

  // --- Jim ---
  let jimDone = false;
  interactions.add({
    pos: new THREE.Vector3(-3, 0, 2), radius: 2, label: 'Talk to Jim', floor: 'ground', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Hi — I’m Christian. Here to pick something up for the swap later.' },
        { speaker: 'Jim', text: 'She’s upstairs.' },
        { speaker: 'Jim', text: '…Help yourself to a cookie on the way out. Stacy’s mom made them. They’re the good ones.' },
      ]);
      showObjective('Upstairs — the stair landing is in the corner.', 4500);
      player.frozen = false;
    },
  });

  // --- stairs ground->upper, upper->basement chained through landings ---
  interactions.add({
    pos: new THREE.Vector3(6, 0, 4), radius: 1.7, label: 'Go upstairs', floor: 'ground',
    action: () => {
      showFloor('upper');
      christian.group.position.set(6, 0, 2.4);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(6, 0, 4), radius: 1.7, label: 'Go downstairs', floor: 'upper',
    action: () => {
      // choice: ground floor or basement
      (async () => {
        const c = await choice(['Ground floor', 'The basement…']);
        if (c === 0) {
          showFloor('ground');
          christian.group.position.set(6, 0, 2.4);
        } else {
          showFloor('basement');
          christian.group.position.set(6, 0, 2.4);
        }
      })();
    },
  });
  interactions.add({
    pos: new THREE.Vector3(6, 0, 4), radius: 1.7, label: 'Back upstairs', floor: 'basement',
    action: () => {
      showFloor('upper');
      christian.group.position.set(6, 0, 2.4);
    },
  });

  // --- Olivia (real one) ---
  interactions.add({
    pos: new THREE.Vector3(-5.5, 0, -3.4), radius: 2.2, label: 'Olivia', floor: 'upper', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Hey — here to pick up the stuff for the clothes swap.' },
        { speaker: 'Olivia', text: 'Thanks! It’s that pile right there.' },
        { speaker: 'Olivia', text: 'By the way — there’s one more thing, but it’s in the room across the hall. Do you mind grabbing it on your way out?' },
        { speaker: 'Christian', text: 'Sure, no problem.' },
      ]);
      items.main = true;
      showObjective('Pile collected ✓ — now the room across the hall.', 4500);
      player.frozen = false;
    },
  });

  // --- Olivia 2 + photo minigame ---
  interactions.add({
    pos: new THREE.Vector3(-5, 0, 3.8), radius: 2.2, label: 'The other Olivia?', floor: 'upper', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Olivia??', text: 'Who are you?' },
        { speaker: 'Christian', text: 'Olivia?? I just saw you — across the hall…' },
        { speaker: 'Olivia #2', text: 'I’ve never seen you before in my life. But I AM Olivia.' },
        { speaker: 'Christian', text: '…That’s weird. Anyway — she asked me to grab something.' },
        { speaker: 'Olivia #2', text: 'Oh, you must be talking about Olivia. It’s downstairs. Hey — since you’re here, can you help take a quick photo?' },
      ]);
      // photo minigame: choose poses; wrong choices are re-tried, options shuffle
      let correct = false;
      const rightPoses = ['Hand on hip, slight turn to the window light', 'Chin down, eyes up, hold the cuff of the sleeve', 'Candid laugh — look away from the lens'];
      const wrongPoses = ['Flash jazz hands', 'Stand completely still, stare into the lens', 'Face the wall for the mystery aesthetic', 'Squat down like a gargoyle', 'Thumb in front of the lens'];
      while (!correct) {
        // build a randomized 3-option set containing exactly one right pose
        const right = rightPoses[Math.floor(Math.random() * rightPoses.length)];
        const wrongs = wrongPoses.sort(() => Math.random() - 0.5).slice(0, 2);
        const opts = [...wrongs, right].sort(() => Math.random() - 0.5);
        const idx = await choice(opts.map((o) => '📸 ' + o));
        if (opts[idx] === right) {
          correct = true;
          await dialogue.play([
            { speaker: 'Olivia #2', text: 'That’s the one. Wait — yeah. That’s the shot. 📸' },
            { speaker: 'Christian', text: 'Honestly? Kind of a natural.' },
            { speaker: 'Olivia #2', text: 'The item’s downstairs, by the way. In the basement.' },
          ]);
          items.photoDone = true;
          showObjective('To the basement — take the stairs.', 4500);
        } else {
          await dialogue.play([
            { speaker: 'Olivia #2', text: 'You’re wrong. That’s — that’s horrible. Take it again.' },
          ]);
        }
      }
      player.frozen = false;
    },
  });

  // --- Tre ---
  interactions.add({
    pos: new THREE.Vector3(-1.5, 0, -2), radius: 2.4, label: 'Tre…?', floor: 'basement', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Oh — hi. Tre?' },
        { speaker: 'Tre', text: 'Christian.' },
        { speaker: 'Tre', text: 'You’re probably looking for the last item. I’ve been using it as a blanket, but — here you go.' },
        { speaker: 'Christian', text: 'Thanks, Tre. Hang in there.' },
        { speaker: 'Tre', text: 'It’s warm down here. That’s the thing people don’t understand about basements.' },
      ]);
      items.treItem = true;
      showObjective('All items collected ✓ — back to the car. Baltimore awaits.', 5000);
      player.frozen = false;
      // enable exit
      exitInt.hidden = false;
    },
  });

  // --- exit (front door) ---
  const exitInt = interactions.add({
    pos: new THREE.Vector3(-6.5, 0, 5.4), radius: 1.8, label: 'Leave for Baltimore', floor: 'ground', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Two Olivias, a blanket-cardigan, and one unbothered Jim. Not bad for a Tuesday.' },
      ]);
      const { swapScene } = await import('./swap.js');
      game.switchScene(swapScene);
    },
  });
  exitInt.hidden = true;

  showObjective('Olivia’s townhouse. Say hi to Jim.', 6000);

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      player.update(dt);
      followCam.update(dt, christian.group.position);

      const near = [...interactions.items].filter((i) => i.floor === floor && !i.hidden && !(i.once && i.done));
      let best = null, bestD = Infinity;
      for (const it of near) {
        const d = christian.group.position.distanceTo(it.pos);
        if (d < it.radius && d < bestD) { best = it; bestD = d; }
      }
      const prompt = document.getElementById('interact-prompt');
      if (best && !player.frozen) {
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
    dispose() {},
  };
}
