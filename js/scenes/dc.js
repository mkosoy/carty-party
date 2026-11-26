import * as THREE from 'three';
import { Pickups , npcFacePlayer } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, GuideMarker } from '../engine/core.js';

// Scene 5 — DC at night. Washington Monument, the big Christmas tree,
// snow everywhere, and the ice-skating finale with Mark, Kylie and Olivia.
export async function dcScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x0c1226);
  scene.fog = new THREE.Fog(0x0c1226, 30, 120);
  scene.add(new THREE.AmbientLight(0x8fa0d0, 0.5));
  const moon = new THREE.DirectionalLight(0xcfd8ff, 0.5);
  moon.position.set(-6, 18, 4);
  moon.castShadow = true;
  scene.add(moon);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // snow-covered mall ground
  const ground = new THREE.Mesh(new THREE.BoxGeometry(90, 0.2, 70), mat(0xe8eef8));
  ground.receiveShadow = true;
  scene.add(ground);

  // Washington Monument: tall obelisk, lit
  const monu = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.2, 26, 4), mat(0xd8dce6));
  shaft.position.y = 13;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.4, 4), mat(0xc8ccd8));
  tip.position.y = 27.2;
  monu.add(shaft, tip);
  monu.position.set(-26, 0, -20);
  monu.rotation.y = Math.PI / 4;
  scene.add(monu);
  // monument spotlights
  const monuGlow = new THREE.PointLight(0xfff0c8, 40, 40);
  monuGlow.position.set(-24, 4, -18);
  scene.add(monuGlow);

  // capitol-ish dome silhouette far east
  const dome = new THREE.Group();
  const dbase = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.4, 3, 12), mat(0xcfd4de));
  dbase.position.y = 1.5;
  const dtop = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xdfe4ee));
  dtop.position.y = 3;
  dome.add(dbase, dtop);
  dome.position.set(34, 0, -26);
  scene.add(dome);

  // THE big Christmas tree: layered cones, lights, star
  const tree = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4 - i * 0.7, 2.2, 10), mat(0x1e5a2e));
    cone.position.y = 1.4 + i * 1.5;
    tree.add(cone);
  }
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe080 }));
  star.position.y = 7.6;
  tree.add(star);
  // colored light bulbs
  const bulbColors = [0xff4444, 0xffd663, 0x50ff70, 0x66aaff];
  const bulbs = [];
  for (let i = 0; i < 40; i++) {
    const t = Math.random();
    const angle = Math.random() * Math.PI * 2;
    const y = 1.2 + t * 5.6;
    const r = (3.2 - t * 2.4) * (0.85 + Math.random() * 0.2);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: bulbColors[i % 4] }));
    bulb.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
    tree.add(bulb);
    bulbs.push(bulb);
  }
  tree.position.set(6, 0, -14);
  scene.add(tree);
  const treeGlow = new THREE.PointLight(0xffe8b0, 30, 25);
  treeGlow.position.set(6, 4, -12);
  scene.add(treeGlow);

  // ice rink: white-blue rectangle with slight shine, bordered by a low wall
  const rink = new THREE.Mesh(new THREE.BoxGeometry(16, 0.12, 11), new THREE.MeshLambertMaterial({ color: 0xbfe0ff }));
  rink.position.set(0, 0.06, 6);
  scene.add(rink);
  // rink boards: white with a red kick-strip and yellow top cap, like a real rink
  for (const [w, d, x, z] of [[16.6, 0.4, 0, 0.3], [16.6, 0.4, 0, 11.7], [0.4, 11.8, -8.2, 6], [0.4, 11.8, 8.2, 6]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.7, d), mat(0xe8ecf0));
    rail.position.set(x, 0.35, z);
    scene.add(rail);
    const kick = new THREE.Mesh(new THREE.BoxGeometry(w === 0.4 ? 0.42 : w, 0.16, d === 0.4 ? 0.42 : d), mat(0xc84040));
    kick.position.set(x, 0.1, z);
    scene.add(kick);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w === 0.4 ? 0.46 : w, 0.06, d === 0.4 ? 0.46 : d), mat(0xe8c840));
    cap.position.set(x, 0.72, z);
    scene.add(cap);
  }

  // snow
  const snowCount = 700;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 90;
    snowPos[i * 3 + 1] = Math.random() * 16;
    snowPos[i * 3 + 2] = (Math.random() - 0.5) * 70;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.14 }));
  scene.add(snow);


  // ---- DC richness pass ----
  // reflective ice surface with skate-mark streaks
  const iceCanvas = document.createElement('canvas');
  iceCanvas.width = 256; iceCanvas.height = 176;
  const ic = iceCanvas.getContext('2d');
  const iceG = ic.createLinearGradient(0, 0, 256, 176);
  iceG.addColorStop(0, '#cfe8ff'); iceG.addColorStop(0.5, '#b8d8f8'); iceG.addColorStop(1, '#d8ecff');
  ic.fillStyle = iceG; ic.fillRect(0, 0, 256, 176);
  ic.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let m = 0; m < 60; m++) {
    ic.lineWidth = 0.6 + Math.random();
    ic.beginPath();
    const mx = Math.random() * 256, my = Math.random() * 176;
    ic.moveTo(mx, my);
    ic.quadraticCurveTo(mx + 20 - Math.random() * 40, my + 14 - Math.random() * 28, mx + 40 - Math.random() * 80, my + 28 - Math.random() * 56);
    ic.stroke();
  }
  const iceTex = new THREE.CanvasTexture(iceCanvas);
  iceTex.colorSpace = THREE.SRGBColorSpace;
  rink.material = new THREE.MeshStandardMaterial({ map: iceTex, roughness: 0.15, metalness: 0.35 });

  // lamp posts ringing the plaza with warm light
  for (const [lx, lz] of [[-11, 14], [11, 14], [-11, -2], [11, -2], [-11, -16], [11, -16]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.4, 8), mat(0x2a2a32));
    pole.position.set(lx, 1.7, lz);
    scene.add(pole);
    const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe0a8 }));
    lampHead.position.set(lx, 3.5, lz);
    scene.add(lampHead);
    const glow = new THREE.PointLight(0xffd9a0, 9, 9);
    glow.position.set(lx, 3.3, lz);
    scene.add(glow);
  }

  // skyline blocks
  for (let b = 0; b < 8; b++) {
    const blk = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random() * 2, 3 + Math.random() * 5, 2), new THREE.MeshBasicMaterial({ color: 0x0a1018 }));
    blk.position.set(-16 + b * 5, 2, -30 - Math.random() * 6);
    scene.add(blk);
  }

  // hot cocoa stall near the rink
  const stall = new THREE.Group();
  const stallBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 1.2), mat(0x6a4a2e));
  stallBody.position.y = 0.55;
  stall.add(stallBody);
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.08, 1.5), mat(0xc04040));
  awning.position.y = 2.0;
  stall.add(awning);
  for (const px of [-1.2, 1.2]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), mat(0x4a3524));
    post.position.set(px, 1.2, 0.5);
    stall.add(post);
  }
  // striped awning edge
  for (let i = 0; i < 6; i++) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 1.5), mat(i % 2 ? 0xe8e0d0 : 0xc04040));
    stripe.position.set(-1.1 + i * 0.44, 1.9, 0);
    stall.add(stripe);
  }
  const stallSign = document.createElement('canvas');
  stallSign.width = 256; stallSign.height = 64;
  const ssc = stallSign.getContext('2d');
  ssc.fillStyle = '#3a2a1a'; ssc.fillRect(0, 0, 256, 64);
  ssc.fillStyle = '#ffe0a8'; ssc.font = 'bold 34px Georgia'; ssc.textAlign = 'center';
  ssc.fillText('HOT COCOA', 128, 44);
  const ssTex = new THREE.CanvasTexture(stallSign);
  ssTex.colorSpace = THREE.SRGBColorSpace;
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: ssTex }));
  signMesh.position.set(0, 1.55, 0.62);
  stall.add(signMesh);
  // mugs on the counter
  for (let i = 0; i < 3; i++) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.1, 8), mat(0xc05050));
    mug.position.set(-0.6 + i * 0.5, 1.15, 0.3);
    stall.add(mug);
  }
  stall.position.set(-12, 0, 8);
  stall.rotation.y = Math.PI / 2;
  scene.add(stall);

  // benches around the rink
  for (const [bx, bz, rot] of [[-10, 4, Math.PI / 2], [10, 8, -Math.PI / 2]]) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.45), mat(0x5a4030));
    seat.position.y = 0.45;
    bench.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), mat(0x5a4030));
    back.position.set(0, 0.75, -0.2);
    bench.add(back);
    for (const lx of [-0.7, 0.7]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.4), mat(0x3a2a20));
      leg.position.set(lx, 0.22, 0);
      bench.add(leg);
    }
    bench.position.set(bx, 0, bz);
    bench.rotation.y = rot;
    scene.add(bench);
  }

  // a few spectator NPCs watching the rink + one shuffling skater
  const spectators = [];
  const specLooks = [
    { top: 0xa04040, bottom: 0x2c2c34, skin: 0xe8c098, hair: 0x3a2a1a, hairStyle: 'long' },
    { top: 0x3a5a8a, bottom: 0x2c3a55, skin: 0x8a5a3a, hair: 0x111111, hairStyle: 'short' },
    { top: 0xd0a040, bottom: 0x3a3a44, skin: 0xd8a878, hair: 0x5a3a1a, hairStyle: 'curly' },
  ];
  specLooks.forEach((look, i) => {
    const sp = makePerson(look);
    sp.group.position.set(-10 + i * 9.5, 0, 13.5 + (i % 2));
    sp.group.rotation.y = Math.PI;
    scene.add(sp.group);
    spectators.push(sp);
  });
  const skater = makePerson({ top: 0xd07ac0, bottom: 0x2c2c34, skin: 0xe8c098, hair: 0x2a1a12, hairStyle: 'bun' });
  skater.group.position.set(3, 0.12, 6);
  scene.add(skater.group);

  // festive wreath garlands on the rink rails
  for (let i = 0; i < 8; i++) {
    const wreathB = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat(0x2e6234));
    wreathB.position.set(-7 + i * 2, 0.75, 0.3);
    scene.add(wreathB);
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat(0xc04040));
    bow.position.set(-7 + i * 2, 0.68, 0.32);
    scene.add(bow);
  }

  // characters
  const christian = makePerson({ photo: faces.christian, top: 0x5a6b42, bottom: 0x3a3a44, hair: 0x6a4a2e, hairStyle: 'short', jacket: true, skin: 0xe0b088, name: 'Christian', });
  christian.group.position.set(0, 0, 16);
  scene.add(christian.group);

  const stacy = makePerson({ photo: faces.stacy, top: 0x4a7a52, bottom: 0x2c2c34, hair: 0x2e1e14, hairStyle: 'long', skin: 0xe8c098, name: 'Stacy', });
  stacy.group.position.set(-1.4, 0, 16.4);
  scene.add(stacy.group);

  const mark = makePerson({ photo: faces.mark, top: 0x3a5a8a, bottom: 0x2c3a55, hair: 0xc8a060, hairStyle: 'short', skin: 0xe8c098, name: 'Mark', });
  mark.group.position.set(2, 0, 12);
  scene.add(mark.group);
  const kylie = makePerson({ photo: faces.kylie, top: 0x5a7ab0, bottom: 0x4a3a30, hair: 0xd8b878, hairStyle: 'long', skin: 0xe8c8a8, name: 'Kylie', });
  kylie.group.position.set(3.4, 0, 12.2);
  scene.add(kylie.group);
  const olivia = makePerson({ photo: faces.olivia, top: 0x222226, bottom: 0x222226, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(-4, 0, 5);
  scene.add(olivia.group);

  const followCam = new FollowCam(camera);
  followCam.snap(christian.group.position);
  const player = new PlayerController(christian, input, []);
  const interactions = new Interactions();
  const guide = new GuideMarker(scene);

  let phase = 'arrive';

  interactions.add({
    pos: new THREE.Vector3(2.5, 0, 12), radius: 3, label: 'Mark & Kylie', once: true,
    // guide is set below
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Mark', text: 'Hey guys!' },
        { speaker: 'Kylie ❤️', text: 'Let’s go ice-skating! We heard you’ve had a long day and have a lot to catch up on.' },
        { speaker: 'Christian', text: 'You have NO idea. Airports, sushi, two Olivias, a basement guy…' },
        { speaker: 'Mark', text: '…two WHAT?' },
        { speaker: 'Christian', text: 'On the ice. I’ll tell you on the ice.' },
      ]);
      showObjective('Onto the rink — follow the gold light and press E to skate!', 5000);
      rinkInt.hidden = false;
      guide.setTarget(0, 6);
      player.frozen = false;
    },
  });

  // ice-skating finale: free skating on the rink, faster and slidey, Olivia joins
  let oliviaSaidHi = false;
  const rinkInt = interactions.add({
    pos: new THREE.Vector3(0, 0, 6), radius: 7, label: 'Skate!',
    action: async () => {
      if (phase === 'skating') return;
      phase = 'skating';
      rinkInt.hidden = true;
      player.frozen = false;
      player.speed = 7;
      showObjective('Skate! When you’re ready, glide to the glowing center to end the night.', 6000);
      centerInt.hidden = false;
      guide.setTarget(0, 6);
      // olivia waves you over once
      if (!oliviaSaidHi) {
        oliviaSaidHi = true;
        dialogue.play([
          { speaker: 'Olivia', text: 'Christian! You made it! — yes, THAT Olivia. The real one. Probably.' },
        ]);
      }
    },
  });
  rinkInt.hidden = true;

  const centerInt = interactions.add({
    pos: new THREE.Vector3(0, 0, 6), radius: 2, label: 'End the night',
    once: true,
    action: async () => {
      player.frozen = true;
      player.speed = 4.1;
      guide.clear();
      await dialogue.play([
        { speaker: 'Mark', text: 'Same time next year?' },
        { speaker: 'Kylie ❤️', text: 'Same time every year. This is the whole point.' },
        { speaker: 'Stacy', text: 'Carty Party — a MoCo holiday. Wouldn’t miss it.' },
        { speaker: 'Christian', text: 'Wouldn’t trade it. Not even for a warm basement.' },
        { speaker: '— fin —', text: 'Thanks for playing Carty Party: A MoCo Holiday. See you at the swap.' },
      ]);
      // credits overlay
      const fin = document.createElement('div');
      fin.style.cssText = 'position:fixed;inset:0;background:rgba(8,10,20,.9);z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#f5ead1;font-family:Georgia;text-align:center;gap:10px;padding:20px';
      fin.innerHTML = '<div style="font-size:44px;color:#e8b64c">Carty Party</div><div style="font-size:22px;font-style:italic">A MoCo Holiday</div><div style="margin-top:24px;font-size:15px;opacity:.8;line-height:1.9">starring Christian, Stacy, Olivia, Olivia, Tre, Kylie ❤️, Mark & Jim<br>Yo Yogi’s closes at 9. The swap is forever.<br><br>made with love, in Montgomery County</div>';
      document.body.appendChild(fin);
    },
  });
  centerInt.hidden = true;

  showObjective('DC at night — Mark and Kylie are waiting by the tree.', 6000);


  // collectibles: vintage cameras for Stacy + vinyl records
  const pickups = new Pickups(scene);
  const inv = inventory();
  pickups.add(makeCameraMesh(), -12, 10, 'camera--12-10', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeCameraMesh(), 12, -4, 'camera-12--4', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeRecordMesh(), -6, 14, 'record--6-14', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });
  pickups.add(makeRecordMesh(), 7, -10, 'record-7--10', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });

  guide.setTarget(2.5, 12);
  showObjective('Welcome to DC! Follow the golden light — Mark & Kylie are waiting by the tree. Explore freely: cameras and vinyl are hidden around the plaza.', 7000);

  // hot cocoa at the stall — pure holiday
  interactions.add({
    pos: new THREE.Vector3(-12, 0, 8), radius: 2.4, label: 'Hot cocoa',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'One cocoa, extra marshmallows. It\'s freezing out here.' },
        { speaker: 'Stacy', text: 'This is the best part of winter in DC and I will not be taking questions.' },
      ]);
      showObjective('☕ cocoa acquired. Holiday spirit +10.', 2500);
      player.frozen = false;
    },
  });

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      player.update(dt);
      pickups.update(dt, christian.group.position);
      // skater glides around the rink
      if (typeof skater !== 'undefined') {
        const t = performance.now() * 0.0004;
        skater.group.position.x = Math.cos(t) * 5;
        skater.group.position.z = 6 + Math.sin(t) * 3.5;
        skater.group.rotation.y = -t - Math.PI / 2;
        skater.animateWalk(dt, 2.2);
      }
      if (typeof guide !== 'undefined') guide.update(dt, christian.group.position);
      followCam.update(dt, christian.group.position);

      // skating glide: reduce friction feel by letting rotation lag (already handled); add sparkle
      const pos = snow.geometry.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        pos.array[i * 3 + 1] -= dt * 1.5;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 16;
      }
      pos.needsUpdate = true;

      // tree bulbs twinkle
      const t = performance.now() / 300;
      for (let i = 0; i < bulbs.length; i++) {
        bulbs[i].visible = Math.sin(t + i * 1.7) > -0.6;
      }

      // npcs idle
      stacy.animateIdle(t / 300);
      mark.animateIdle(t / 320);
      kylie.animateIdle(t / 310);
      if (phase === 'skating') {
        olivia.animateWalk(dt, 0.6);
      }

      const near = [...interactions.items].filter((i) => !i.hidden && !(i.once && i.done));
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
          best.action.call(this);
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
