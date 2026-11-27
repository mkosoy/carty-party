import * as THREE from 'three';
import { makePerson, playerIdentity } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, Pickups } from '../engine/core.js';

// Johns Hopkins — environmental science field lab. Stacy's research world:
// sample stations, the greenhouse, water quality testing, specimen jars.
export async function hopkinsScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x1a2432);
  scene.fog = new THREE.Fog(0x1a2432, 26, 66);
  scene.add(new THREE.AmbientLight(0x9aa8bc, 1.2));
  const key = new THREE.DirectionalLight(0xfff4e0, 0.7);
  key.position.set(6, 14, 4);
  key.castShadow = true;
  scene.add(key);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // the science hall: lab benches, glassware, greenhouse annex glow
  const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 22), new THREE.MeshStandardMaterial({ color: 0x9aa098, roughness: 0.4 }));
  floor.receiveShadow = true;
  scene.add(floor);
  for (const [w, h, d, x, z] of [
    [34, 6, 0.4, 0, -11], [34, 6, 0.4, 0, 11], [0.4, 6, 22, -17, 0], [0.4, 6, 22, 17, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x3e4a42));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -17, maxX: 17, minZ: -11.4, maxZ: -10.9 }, { minX: -17, maxX: 17, minZ: 10.9, maxZ: 11.4 },
    { minX: -17.4, maxX: -16.9, minZ: -11.4, maxZ: 11.4 }, { minX: 16.9, maxX: 17.4, minZ: -11.4, maxZ: 11.4 },
  ];
  // big windows with a night-campus view on the north wall
  for (const wx of [-10, 0, 10]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.6), new THREE.MeshBasicMaterial({ color: 0x16263e }));
    win.position.set(wx, 3.6, -10.85);
    scene.add(win);
    for (let s = 0; s < 8; s++) {
      const star = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.07), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      star.position.set(wx - 2 + Math.random() * 4, 2.6 + Math.random() * 2, -10.82);
      scene.add(star);
    }
    const frameT = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.12, 0.1), mat(0x2a2a30));
    frameT.position.set(wx, 4.95, -10.8);
    scene.add(frameT);
    const frameB = frameT.clone();
    frameB.position.y = 2.25;
    scene.add(frameB);
  }
  // lab benches with glassware
  function bench(x, z) {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.3 }));
    top.position.y = 0.95;
    g.add(top);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.9, 1.2), mat(0x4a5568));
    body.position.y = 0.45;
    g.add(body);
    // beakers and flasks
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88c8e8, transparent: true, opacity: 0.55, roughness: 0.1 });
    const liquidColors = [0x40c060, 0x4080e0, 0xe08040, 0xc04080];
    for (let i = 0; i < 4; i++) {
      const bk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 10), glassMat);
      bk.position.set(-1.6 + i * 1.0, 1.14, -0.3);
      g.add(bk);
      const liq = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 10), new THREE.MeshBasicMaterial({ color: liquidColors[i % 4] }));
      liq.position.set(-1.6 + i * 1.0, 1.08, -0.3);
      g.add(liq);
    }
    const flask = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 10), glassMat);
    flask.position.set(1.6, 1.16, 0.3);
    g.add(flask);
    g.position.set(x, 0, z);
    scene.add(g);
    bounds.push({ minX: x - 2.3, maxX: x + 2.3, minZ: z - 0.8, maxZ: z + 0.8 });
  }
  bench(-8, -4); bench(-8, 2); bench(0, -4); bench(0, 2); bench(8, -4);
  // greenhouse annex glow — plant racks along the east wall
  for (const pz of [-6, -2, 2, 6]) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 2.6), mat(0x3a4038));
    rack.position.set(15.8, 0.9, pz);
    scene.add(rack);
    bounds.push({ minX: 15.2, maxX: 16.4, minZ: pz - 1.4, maxZ: pz + 1.4 });
    for (let lv = 0; lv < 3; lv++) {
      for (let pi = 0; pi < 3; pi++) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.16, 8), mat(0x8a5a3a));
        pot.position.set(15.7, 0.5 + lv * 0.6, pz - 0.9 + pi * 0.9);
        scene.add(pot);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), mat(0x2e7a3e));
        leaf.position.set(15.7, 0.72 + lv * 0.6, pz - 0.9 + pi * 0.9);
        leaf.scale.y = 1.4;
        scene.add(leaf);
      }
    }
    const grow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.4), new THREE.MeshBasicMaterial({ color: 0xff90c0 }));
    grow.position.set(15.7, 2.1, pz);
    scene.add(grow);
  }
  // specimen jars wall shelf (west)
  for (let sh = 0; sh < 3; sh++) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 12), mat(0x4a4038));
    board.position.set(-16.6, 1.2 + sh * 1.1, 0);
    scene.add(board);
    for (let j = 0; j < 9; j++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xc8e0d8, transparent: true, opacity: 0.6 }));
      jar.position.set(-16.6, 1.38 + sh * 1.1, -5 + j * 1.2);
      scene.add(jar);
    }
  }
  // hopkins banner
  const bnC = document.createElement('canvas');
  bnC.width = 1024; bnC.height = 160;
  const bn = bnC.getContext('2d');
  bn.fillStyle = '#002d72'; bn.fillRect(0, 0, 1024, 160);
  bn.fillStyle = '#ffffff'; bn.font = 'bold 58px Georgia'; bn.textAlign = 'center';
  bn.fillText('JOHNS HOPKINS', 512, 75);
  bn.font = 'italic 34px Georgia';
  bn.fillText('environmental science — field research lab', 512, 128);
  const bnT = new THREE.CanvasTexture(bnC);
  bnT.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.7), new THREE.MeshBasicMaterial({ map: bnT }));
  banner.position.set(0, 4.6, -10.75);
  scene.add(banner);
  // researchers at work
  const researchers = [];
  for (let i = 0; i < 3; i++) {
    const p = makePerson({ top: 0xf0f0f0, bottom: 0x2a2a34, hair: 0x2a1a12, skin: 0xd0a080 });
    p.group.position.set(-8 + i * 7, 0, -2.6);
    p.group.rotation.y = Math.PI;
    scene.add(p.group);
    researchers.push(p);
  }

  // player — stacy by default here
  const hero = makePerson({ photo: faces.stacy, outfit: 'dress', top: 0xf0f0f0, bottom: 0x2c2c34, hair: 0x2e1e14, hairStyle: 'long', skin: 0xe8c098, ...playerIdentity(faces) });
  hero.group.position.set(0, 0, 8);
  hero.group.rotation.y = Math.PI;
  scene.add(hero.group);
  const player = new PlayerController(hero, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.setRoom(-16.5, 16.5, -10.5, 10.5);
  followCam.snap(hero.group.position);

  // ---- water sample analysis minigame: collect samples, bring to bench ----
  const pickups = new Pickups(scene);
  const st = { active: false, done: false, got: 0, timeLeft: 0 };
  function sampleMesh() {
    return new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 8), new THREE.MeshStandardMaterial({ color: 0x40c8e0, emissive: 0x40c8e0, emissiveIntensity: 0.4, transparent: true, opacity: 0.8 }));
  }
  const sampleSpots = [[-13, -8], [13, 8], [-13, 8], [5, 8.5], [12, -8]];
  sampleSpots.forEach(([sx, sz], i) => {
    pickups.add(sampleMesh(), sx, sz, 'sample' + i, () => {
      if (!st.active) return;
      st.got++;
      showObjective(`🧪 sample ${st.got}/5 collected`, 1800);
      if (st.got >= 5) finish(true);
    });
  });
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:54px;left:50%;transform:translateX(-50%);z-index:40;display:none;color:#fff;font:bold 16px Arial;text-shadow:0 2px 6px #000';
  document.body.appendChild(hud);
  function finish(won) {
    if (st.done) return;
    st.done = true; st.active = false;
    hud.style.display = 'none';
    (async () => {
      player.frozen = true;
      if (won) await dialogue.play([
        { speaker: 'Stacy', text: 'Five for five! Full panels, clean data. This is going in the winter semester writeup.' },
        { speaker: 'Christian', text: 'You make science look like a sport. A very precise, slightly nerdy sport.' },
      ]);
      else await dialogue.play([
        { speaker: 'Stacy', text: 'Time! Ugh — partial data. Science is patient. I am not, but science is.' },
      ]);
      player.frozen = false;
    })();
  }

  const interactions = new Interactions(scene);
  interactions.add({
    pos: new THREE.Vector3(0, 0, 5), radius: 2.6, label: 'Start the field study',
    action: async () => {
      if (st.active || st.done) return;
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Stacy', text: 'Water samples from five stations, sixty seconds on the clock. This is what the grant is for. Probably.' },
        { speaker: 'Christian', text: 'Collect all five before time runs out. Hopkins did not know what it was in for.' },
      ]);
      player.frozen = false;
      st.active = true; st.timeLeft = 60;
      hud.style.display = 'block';
    },
  });
  const say = (lines) => async () => { player.frozen = true; await dialogue.play(lines); player.frozen = false; };
  interactions.add({ pos: new THREE.Vector3(15.5, 0, 0), radius: 2.4, label: 'The greenhouse racks', action: say([
    { speaker: 'Stacy', text: 'Grow lights on a timer, seedlings in rows. My winter cover crop study lives here.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(-16, 0, 0), radius: 2.4, label: 'Specimen jars', action: say([
    { speaker: 'Christian', text: 'Every jar is a little time capsule. Science is just very organized hoarding.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(-8, 0, -4), radius: 2.2, label: 'Bench glassware', action: say([
    { speaker: 'Stacy', text: 'Do not touch the green one. Actually do not touch any of them. Science in progress.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(0, 0, -9), radius: 2.8, label: 'The campus at night', action: say([
    { speaker: 'Stacy', text: 'Homewood campus after dark. Baltimore does winter better than people admit.' },
  ]) });

  window.__sceneHint = 'WASD — move · E — interact · collect samples on the clock';
  showObjective("Hopkins field lab — Stacy's world. Start the study when ready.", 6000);

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: hero, self: this };
      player.update(dt);
      followCam.update(dt, hero.group.position);
      const nearI = interactions.nearest(hero.group.position);
      const promptEl = document.getElementById('interact-prompt');
      if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) promptEl.classList.add('hidden');
      if (nearI && !player.frozen && input.consumeInteract()) nearI.action();
      if (st.active) {
        pickups.update(dt, hero.group.position);
        st.timeLeft -= dt;
        hud.textContent = `⏱ ${Math.max(0, Math.ceil(st.timeLeft))}s — samples ${st.got}/5`;
        if (st.timeLeft <= 0) finish(false);
      }
      const t = performance.now() / 1000;
      for (const r of researchers) r.animateIdle(t);
    },
  };
}
