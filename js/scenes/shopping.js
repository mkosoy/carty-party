import * as THREE from 'three';
import { sfxChime } from '../engine/sfx.js';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, Pickups } from '../engine/core.js';

// Kylie's last-minute Christmas shopping — Montgomery Mall, dec 23rd, peak
// chaos. Her list has six gifts; the store is a maze; the clock is cruel.
export async function shoppingScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x2a3038);
  scene.fog = new THREE.Fog(0x2a3038, 22, 60);
  scene.add(new THREE.AmbientLight(0xbac4d4, 1.35));
  const key = new THREE.DirectionalLight(0xfff2dc, 0.75);
  key.position.set(8, 12, 5);
  scene.add(key);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // ---- store shell: bright big-box, 34 x 22 ----
  const floorTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const x = c.getContext('2d');
    x.fillStyle = '#b8b4ac'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(90,88,80,0.5)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke();
      x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(8, 6);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 22), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }));
  floor.receiveShadow = true;
  scene.add(floor);
  for (const [w, h, d, x, z] of [
    [34, 5.5, 0.4, 0, -11], [34, 5.5, 0.4, 0, 11], [0.4, 5.5, 22, -17, 0], [0.4, 5.5, 22, 17, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x8a4038));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -17, maxX: 17, minZ: -11.4, maxZ: -10.9 }, { minX: -17, maxX: 17, minZ: 10.9, maxZ: 11.4 },
    { minX: -17.4, maxX: -16.9, minZ: -11.4, maxZ: 11.4 }, { minX: 16.9, maxX: 17.4, minZ: -11.4, maxZ: 11.4 },
  ];
  // fluorescent panels overhead
  for (let lx = -12; lx <= 12; lx += 8) {
    for (let lz = -6; lz <= 6; lz += 6) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), new THREE.MeshBasicMaterial({ color: 0xf8f4e8 }));
      panel.position.set(lx, 5.3, lz);
      scene.add(panel);
    }
  }

  // ---- shelving aisles with colorful products ----
  const productColors = [0xc04848, 0x4880c0, 0x48a060, 0xd0a030, 0x8860b0, 0x48b0b0, 0xd06090];
  function shelfUnit(x, z, ry = 0) {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 2.4, 0.9), mat(0x6a6f78));
    frame.position.y = 1.2;
    g.add(frame);
    for (let sh = 0; sh < 3; sh++) {
      for (let pi = 0; pi < 7; pi++) {
        const w = 0.3 + Math.random() * 0.2;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(w, 0.3 + Math.random() * 0.25, 0.3),
          mat(productColors[(pi + sh) % productColors.length])
        );
        box.position.set(-1.9 + pi * 0.62, 0.5 + sh * 0.7, 0.28);
        g.add(box);
        const box2 = box.clone();
        box2.position.z = -0.28;
        g.add(box2);
      }
    }
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    scene.add(g);
    const horiz = Math.abs(Math.sin(ry)) < 0.5;
    bounds.push(horiz
      ? { minX: x - 2.4, maxX: x + 2.4, minZ: z - 0.6, maxZ: z + 0.6 }
      : { minX: x - 0.6, maxX: x + 0.6, minZ: z - 2.4, maxZ: z + 2.4 });
  }
  shelfUnit(-8, -4); shelfUnit(-8, 0.8); shelfUnit(-8, 5.6);
  shelfUnit(-1, -4); shelfUnit(-1, 0.8); shelfUnit(-1, 5.6);
  shelfUnit(6, -4); shelfUnit(6, 0.8);
  // holiday decor: wreaths on walls, garland strips, a big store tree
  const tree = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 - i * 0.35, 1.3, 9), mat(0x1e5a2e));
    cone.position.y = 0.8 + i * 0.9;
    tree.add(cone);
  }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), new THREE.MeshBasicMaterial({ color: 0xffd663 }));
  star.position.y = 3.6;
  tree.add(star);
  for (let i = 0; i < 12; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: [0xff4040, 0x40c8ff, 0xffd663, 0x60ff60][i % 4] }));
    const a = i * 2.2;
    bulb.position.set(Math.cos(a) * (1.1 - (i % 3) * 0.25), 0.9 + (i % 3) * 0.9, Math.sin(a) * (1.1 - (i % 3) * 0.25));
    tree.add(bulb);
  }
  tree.position.set(12, 0, 5);
  scene.add(tree);
  // sale signs
  function sign(text, x, y, z, ry = 0) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 192;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#b02020'; x2.fillRect(0, 0, 512, 192);
    x2.fillStyle = '#ffffff'; x2.font = 'bold 72px Arial'; x2.textAlign = 'center';
    x2.fillText(text, 256, 122);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.3), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
  }
  sign('LAST-MINUTE DEALS', -8, 3.6, -10.7);
  sign('60% OFF', 6, 3.6, -10.7);
  sign('GIFT WRAP →', 16.7, 3.4, 0, -Math.PI / 2);
  // checkout lanes at the front
  for (const cz of [8.2, 9.8]) {
    const belt = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.95, 0.8), mat(0x3a3e46));
    belt.position.set(-13, 0.5, cz);
    scene.add(belt);
    bounds.push({ minX: -14.8, maxX: -11.2, minZ: cz - 0.6, maxZ: cz + 0.6 });
  }

  // ---- fellow shoppers rushing around ----
  const shoppers = [];
  const palette = [0x8a3a4a, 0x3a5a8a, 0x4a7a4a, 0xa06a30];
  for (let i = 0; i < 5; i++) {
    const p = makePerson({ top: palette[i % 4], bottom: 0x2a2a34, hair: 0x2a1a12, skin: 0xd0a080 });
    p.group.position.set(-12 + i * 5, 0, -7 + (i % 2) * 3);
    scene.add(p.group);
    shoppers.push({ p, dir: i % 2 ? 1 : -1, speed: 1.2 + Math.random(), laneZ: p.group.position.z });
  }

  // kylie herself is here unless you're playing as her
  const isKylie = (localStorage.getItem('cp-character') || 'christian') === 'kylie';
  if (!isKylie) {
    const kylieNpc = makePerson({ photo: faces.kylie, outfit: 'dress', top: 0x9a3050, bottom: 0x2c2c34, hair: 0x3a2416, hairStyle: 'long', skin: 0xe8c098, name: 'Kylie' });
    kylieNpc.group.position.set(-11.5, 0, -6.5);
    kylieNpc.group.rotation.y = Math.PI / 2;
    scene.add(kylieNpc.group);
    window.__kylieNpc = kylieNpc;
  }

  // ---- the player: Kylie, list in hand ----
  const kylie = makePerson({ photo: faces.kylie, outfit: 'dress', top: 0x9a3050, bottom: 0x2c2c34, hair: 0x3a2416, hairStyle: 'long', skin: 0xe8c098, name: 'Kylie' });
  kylie.group.position.set(-13, 0, -8);
  scene.add(kylie.group);
  const player = new PlayerController(kylie, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.setRoom(-16.5, 16.5, -10.5, 10.5);
  followCam.snap(kylie.group.position);

  // ---- the shopping list minigame ----
  const GIFTS = [
    { id: 'drone', label: '🚁 drone for Mark', color: 0x30c8ff },
    { id: 'scarf', label: '🧣 scarf for mom', color: 0xd04060 },
    { id: 'sneakers', label: '👟 sneakers for Tre… kidding, for Jim', color: 0xf0f0f0 },
    { id: 'cocoa', label: '☕ fancy cocoa for Stacy', color: 0x8a5a30 },
    { id: 'lego', label: '🧱 lego set for the kids table', color: 0xd0a030 },
    { id: 'candle', label: '🕯 candle for Olivia. either Olivia.', color: 0x60c060 },
  ];
  const DECOYS = [
    { id: 'decoy1', label: 'santa mug', color: 0xc03030 },
    { id: 'decoy2', label: 'tinsel box', color: 0x9090a0 },
    { id: 'decoy3', label: 'fruitcake??', color: 0x704820 },
  ];
  function giftMesh(color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.32, 0.4), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.28, roughness: 0.4 }));
    return m;
  }
  const pickups = new Pickups(scene);
  const spots = [[-8, -6.5], [-1, -6.5], [6, -6.5], [-8, 3.2], [-1, 3.2], [10, -1], [12, 8.5], [-5, 8.5], [3, 8.5]];
  const allItems = [...GIFTS, ...DECOYS].sort(() => Math.random() - 0.5);
  const st = { active: false, done: false, timeLeft: 0, got: new Set(), wrong: 0 };
  allItems.forEach((item, i) => {
    const [sx, sz] = spots[i % spots.length];
    pickups.add(giftMesh(item.color), sx, sz, item.id, () => {
      if (!st.active) return;
      const gift = GIFTS.find((g) => g.id === item.id);
      if (gift && !st.got.has(item.id)) {
        st.got.add(item.id);
        sfxChime();
        showObjective(`✅ ${gift.label} — ${st.got.size}/6`, 2000);
        if (st.got.size === 6) finish(true);
      } else {
        st.wrong++;
        st.timeLeft -= 6;
        showObjective('❌ not on the list! -6s', 1600);
      }
    });
  });
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:40;display:none;color:#fff;font:bold 15px Arial;text-shadow:0 2px 6px #000;text-align:center;max-width:92vw';
  document.body.appendChild(hud);
  function hudText() {
    const remaining = GIFTS.filter((g) => !st.got.has(g.id)).map((g) => g.label).join(' · ');
    hud.innerHTML = `⏱ ${Math.max(0, Math.ceil(st.timeLeft))}s — list: ${remaining || 'done!'} `;
  }
  function finish(won) {
    if (won) try { localStorage.setItem('cp-done-shopping', '1'); } catch {}
    if (st.done) return;
    st.done = true;
    st.active = false;
    hud.style.display = 'none';
    (async () => {
      player.frozen = true;
      if (won) {
        await dialogue.play([
          { speaker: 'Kylie', text: 'SIX FOR SIX. In December-twenty-third traffic. Somebody get me a medal and a peppermint latte.' },
          { speaker: 'Christian', text: 'You are a shopping machine. Remind me to never race you at anything, ever.' },
        ]);
      } else {
        await dialogue.play([
          { speaker: 'Kylie', text: 'Out of time! I got… some of it. The rest is getting gift cards and pretending that was the plan.' },
        ]);
      }
      player.frozen = false;
      if (won) setTimeout(() => { if (window.__showMap) window.__showMap(); }, 2500);
    })();
  }

  const interactions = new Interactions(scene);
  interactions.add({
    pos: new THREE.Vector3(-13, 0, -6), radius: 2.6, label: 'Start the shopping run',
    action: async () => {
      if (st.done || st.active) return;
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Kylie', text: 'Okay. December twenty-third. Six gifts, one store, no time. This is what marathon training is FOR.' },
        { speaker: 'Christian', text: 'Grab only what is on the list — wrong items cost you time. Go go go!' },
      ]);
      player.frozen = false;
      st.active = true;
      st.timeLeft = 90;
      hud.style.display = 'block';
    },
  });
  interactions.add({
    pos: new THREE.Vector3(12, 0, 5), radius: 2.4, label: 'The store tree',
    action: async () => {
      await dialogue.play([{ speaker: 'Kylie', text: 'A mall tree in late December is just a big green stress meter.' }]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-13, 0, 9), radius: 2.4, label: 'Checkout lanes',
    action: async () => {
      await dialogue.play([{ speaker: 'Christian', text: 'Lines to the back of the store. The true final boss of Christmas shopping.' }]);
    },
  });

  window.__sceneHint = 'WASD — move · E — interact · grab the listed gifts, dodge the decoys';

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: kylie, self: this };
      player.update(dt);
      followCam.update(dt, kylie.group.position);
      const nearI = interactions.nearest(kylie.group.position);
      const promptEl = document.getElementById('interact-prompt');
      if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) promptEl.classList.add('hidden');
      if (nearI && !player.frozen && input.consumeInteract()) nearI.action();
      if (st.active) pickups.update(dt, kylie.group.position);
      // shoppers pace the aisles
      for (const sh of shoppers) {
        sh.p.group.position.x += sh.dir * sh.speed * dt;
        if (sh.p.group.position.x > 14) sh.dir = -1;
        if (sh.p.group.position.x < -14) sh.dir = 1;
        sh.p.group.rotation.y = sh.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        sh.p.animateWalk(dt, sh.speed);
      }
      if (st.active) {
        st.timeLeft -= dt;
        hudText();
        if (st.timeLeft <= 0) finish(false);
      }
    },
  };
}
