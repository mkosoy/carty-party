import * as THREE from 'three';
import { positionalLoop } from '../engine/sfx.js';
import { Pickups, phoneText } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson, playerIdentity } from '../engine/character.js';
import { woodFloor, carpet, paintedWall, concrete } from '../engine/textures.js';
import { FollowCam, PlayerController, Interactions, showObjective, choice, GuideMarker } from '../engine/core.js';

// Scene 3 — Olivia's townhouse. Three floors (basement / ground / upstairs)
// connected by stairs that fade-teleport. Jim downstairs, Olivia in her
// room, the OTHER Olivia across the hall with the nursery and the photo
// minigame, Tre in the basement with the last swap item.
export async function houseScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x1a1c26);
  scene.add(new THREE.AmbientLight(0xffe8c8, 1.15));
  const lampLight = new THREE.PointLight(0xffd9a0, 60, 40);
  lampLight.castShadow = true;
  lampLight.shadow.mapSize.set(1024, 1024);
  lampLight.position.set(0, 4, 0);
  scene.add(lampLight);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // ---- build three stacked floor shells; only one is visible at a time ----
  function buildFloor({ wallColor, floorColor, y, floorTex = null }) {
    const g = new THREE.Group();
    const floorMat = floorTex
      ? new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 })
      : mat(floorColor);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 12), floorMat);
    floor.receiveShadow = true;
    g.add(floor);
    for (const [w, h, d, x, z] of [
      [16, 3.4, 0.3, 0, -6], [16, 3.4, 0.3, 0, 6], [0.3, 3.4, 12, -8, 0], [0.3, 3.4, 12, 8, 0],
    ]) {
      const isBareConcrete = wallColor === 0x4a4a52;
      const wallTex = isBareConcrete ? concrete('#55555e', 3, 1.2) : paintedWall(typeof wallColor === 'number' ? '#' + wallColor.toString(16).padStart(6, '0') : wallColor, 3, 1.2);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: wallTex, bumpMap: wallTex, bumpScale: 0.6, roughness: 0.85 }));
      wall.position.set(x, h / 2, z);
      g.add(wall);
      // wainscot: cream panel strip along the bottom of each interior wall face + chair rail cap —
      // the single biggest "real house" wall upgrade
      if (isBareConcrete) continue;
      const horizontal = w > d; // wall runs along x
      const len = horizontal ? w : d;
      const inward = horizontal ? (z < 0 ? 1 : -1) : (x < 0 ? 1 : -1);
      const panelGeo = horizontal ? new THREE.BoxGeometry(len - 0.1, 1.0, 0.04) : new THREE.BoxGeometry(0.04, 1.0, len - 0.1);
      const panel = new THREE.Mesh(panelGeo, new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.7 }));
      if (horizontal) panel.position.set(x, 0.5, z + inward * 0.17);
      else panel.position.set(x + inward * 0.17, 0.5, z);
      g.add(panel);
      const railGeo = horizontal ? new THREE.BoxGeometry(len - 0.1, 0.07, 0.07) : new THREE.BoxGeometry(0.07, 0.07, len - 0.1);
      const rail = new THREE.Mesh(railGeo, new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6 }));
      if (horizontal) rail.position.set(x, 1.03, z + inward * 0.17);
      else rail.position.set(x + inward * 0.17, 1.03, z);
      g.add(rail);
      // crown molding where wall meets ceiling
      const crownGeo = horizontal ? new THREE.BoxGeometry(len - 0.1, 0.09, 0.08) : new THREE.BoxGeometry(0.08, 0.09, len - 0.1);
      const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xf5efe2, roughness: 0.55 }));
      if (horizontal) crown.position.set(x, 3.32, z + inward * 0.17);
      else crown.position.set(x + inward * 0.17, 3.32, z);
      g.add(crown);
      // vertical beadboard grooves illusion: thin shadow lines on the panel
      for (let gi = 1; gi < 10; gi++) {
        const grooveGeo = horizontal ? new THREE.BoxGeometry(0.015, 0.96, 0.045) : new THREE.BoxGeometry(0.045, 0.96, 0.015);
        const groove = new THREE.Mesh(grooveGeo, new THREE.MeshBasicMaterial({ color: 0xd8d0c0 }));
        const off = -len / 2 + (len / 10) * gi;
        if (horizontal) groove.position.set(x + off, 0.5, z + inward * 0.17);
        else groove.position.set(x + inward * 0.17, 0.5, z + off);
        g.add(groove);
      }
    }
    g.position.y = y;
    g.visible = false;
    scene.add(g);
    return g;
  }

  const ground = buildFloor({ wallColor: 0xd8caa8, floorColor: 0xc8b89a, y: 0, floorTex: carpet('#c0b090', 4, 3) });
  const upper = buildFloor({ wallColor: 0xd8c8ae, floorColor: 0xb8a888, y: 0, floorTex: carpet('#b0a080', 4, 3) });
  const basement = buildFloor({ wallColor: 0x7a5c38, floorColor: 0x9a9a8e, y: 0, floorTex: woodFloor('#8a6a42', 5, 1.4) });

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
  // furniture collision so you can't walk through the couch, table, tree, beds
  boundsByFloor.ground.push(
    { minX: -5.4, maxX: -2.6, minZ: 2.9, maxZ: 4.2 },   // couch
    { minX: 0.3, maxX: 2.7, minZ: -4.4, maxZ: -2.6 },   // dining table
    { minX: 5.2, maxX: 7.2, minZ: -6.2, maxZ: -4.6 },   // tv stand wall side
    { minX: -7.6, maxX: -5.6, minZ: -6.2, maxZ: -4.2 }, // tree corner
    { minX: 2.6, maxX: 4.4, minZ: 1.6, maxZ: 3.2 },     // cookie table
  );
  boundsByFloor.upper.push(
    { minX: -6.8, maxX: -5.6, minZ: -5.3, maxZ: -3.1 }, // olivia's bed
    { minX: -6.8, maxX: -5.6, minZ: 3.1, maxZ: 5.3 },   // olivia2's bed
    { minX: -7.9, maxX: -6.7, minZ: -2.7, maxZ: -1.7 }, // dresser n
    { minX: -7.9, maxX: -6.7, minZ: 1.7, maxZ: 2.7 },   // dresser s
  );
  boundsByFloor.basement.push(
    { minX: -6.1, maxX: -3.9, minZ: -5.6, maxZ: -4.8 }, // workbench
    { minX: 2.8, maxX: 5.9, minZ: -5.6, maxZ: -4.9 },   // shelves
    { minX: -7.5, maxX: -6.5, minZ: 3.0, maxZ: 5.0 },   // washer/dryer
  );

  // ---- furnishing helpers ----
  function box(parent, w, h, d, c, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }

  // GROUND: foyer + living room
  // couch: rounded, two cushions + arms
  const couchMat = 0x4e7a54;
  box(ground, 2.6, 0.5, 1.1, couchMat, -4, 0.3, 3.5);
  box(ground, 2.6, 0.55, 0.28, couchMat, -4, 0.75, 4.0);
  box(ground, 0.28, 0.65, 1.1, couchMat, -5.25, 0.5, 3.5);
  box(ground, 0.28, 0.65, 1.1, couchMat, -2.75, 0.5, 3.5);
  box(ground, 1.15, 0.14, 0.95, 0x5a8a60, -4.55, 0.62, 3.5);  // cushions

  // --- lived-in detail pass: the small stuff that makes a house a home ---
  // throw pillows on the couch — accent colors, slightly rotated
  for (const [px, pc, pr] of [[-5.15, 0xc04848, 0.2], [-4.1, 0xd0a030, -0.15], [-4.6, 0x3a6a8a, 0.4]]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.12), mat(pc));
    pil.position.set(px, 0.82, 3.62);
    pil.rotation.z = pr;
    pil.rotation.x = -0.15;
    ground.add(pil);
  }
  // throw blanket draped over the couch arm
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.7), mat(0x9a4a5a));
  blanket.position.set(-5.45, 0.78, 2.6);
  blanket.rotation.z = 0.1;
  ground.add(blanket);
  // coffee table clutter: mugs + a book + remote
  const mug1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), mat(0xc04848));
  mug1.position.set(-2.0, 0.58, 1.45);
  ground.add(mug1);
  const mug2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.09, 10), mat(0x3a6a8a));
  mug2.position.set(-1.75, 0.58, 1.7);
  ground.add(mug2);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.32), mat(0x2a4a2a));
  book.position.set(-2.45, 0.57, 1.75);
  book.rotation.y = 0.4;
  ground.add(book);
  const remote = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.16), mat(0x1a1a1a));
  remote.position.set(-1.7, 0.57, 1.45);
  remote.rotation.y = -0.3;
  ground.add(remote);
  // coat rack by the door with hanging winter coats
  const rackPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), mat(0x5a4a3a));
  rackPole.position.set(-7.3, 0.9, 4.6);
  ground.add(rackPole);
  const rackBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 10), mat(0x5a4a3a));
  rackBase.position.set(-7.3, 0.03, 4.6);
  ground.add(rackBase);
  for (const [ca, cc] of [[0.3, 0x8a2a2a], [2.4, 0x2a4a6a], [4.4, 0x3a3a3a]]) {
    const coatM = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.55, 0.12), mat(cc));
    coatM.position.set(-7.3 + Math.cos(ca) * 0.16, 1.42, 4.6 + Math.sin(ca) * 0.16);
    coatM.rotation.y = ca;
    ground.add(coatM);
  }
  // shoes kicked off by the door
  for (const [sx, sz, sr] of [[-6.8, 5.2, 0.3], [-6.55, 5.25, -0.2], [-6.9, 4.9, 1.2]]) {
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.26), mat(0x4a3524));
    shoe.position.set(sx, 0.04, sz);
    shoe.rotation.y = sr;
    ground.add(shoe);
  }
  // potted plant in the corner — big leafy fiddle leaf
  const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10), mat(0xa05030));
  pot2.position.set(7.2, 0.13, 4.8);
  ground.add(pot2);
  for (let lf = 0; lf < 5; lf++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mat(0x2a6a3a));
    const la = lf * 1.3;
    leaf.position.set(7.2 + Math.cos(la) * 0.12, 0.5 + lf * 0.14, 4.8 + Math.sin(la) * 0.12);
    leaf.scale.set(1, 1.5, 0.6);
    leaf.rotation.y = la;
    ground.add(leaf);
  }
  // wall clock in the living room
  const hClockFace = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  hClockFace.position.set(-2.5, 2.3, -5.86);
  ground.add(hClockFace);
  const hClockRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 8, 20), mat(0x4a3524));
  hClockRim.position.copy(hClockFace.position);
  ground.add(hClockRim);
  const hhHand = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.09, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  hhHand.position.set(-2.5, 2.32, -5.87);
  hhHand.rotation.z = 0.8;
  ground.add(hhHand);
  const hmHand = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.13, 0.01), new THREE.MeshBasicMaterial({ color: 0x222222 }));
  hmHand.position.set(-2.5, 2.34, -5.87);
  hmHand.rotation.z = -1.9;
  ground.add(hmHand);
  // kitchen counter clutter: kettle + fruit bowl + cutting board
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(0xb8bec6, 0.4));
  kettle.position.set(7.35, 1.06, -2.2);
  kettle.scale.y = 0.9;
  ground.add(kettle);
  const kettleSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 6), mat(0xb8bec6, 0.4));
  kettleSpout.position.set(7.28, 1.1, -2.2);
  kettleSpout.rotation.z = 0.9;
  ground.add(kettleSpout);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.08, 12), mat(0xd8cfc0));
  bowl.position.set(7.35, 1.0, -3.3);
  ground.add(bowl);
  for (const [fx2, fc] of [[-0.04, 0xe88020], [0.04, 0xc03838], [0, 0xd0c030]]) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), mat(fc));
    fruit.position.set(7.35 + fx2, 1.08, -3.3 + fx2 * 0.5);
    ground.add(fruit);
  }
  const cutBoard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.34), mat(0xb88a5a));
  cutBoard.position.set(7.35, 0.98, -1.5);
  cutBoard.rotation.y = 0.2;
  ground.add(cutBoard);
  box(ground, 1.15, 0.14, 0.95, 0x8a6a4a, -3.35, 0.62, 3.5);
  // area rug
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.03, 24), mat(0x8a4a42));
  rug.position.set(-2.5, 0.12, 1.5);
  rug.scale.z = 0.7;
  ground.add(rug);
  // coffee table — the dark ornate trunk from the real living room
  box(ground, 1.3, 0.45, 0.7, 0x2c1c12, -2.5, 0.23, 1.5);
  box(ground, 1.34, 0.06, 0.74, 0x1c1008, -2.5, 0.48, 1.5);  // lid lip
  // brass studs along the trunk edges
  for (let stud = 0; stud < 6; stud++) {
    const st2 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), mat(0x9a7428));
    st2.position.set(-3.05 + stud * 0.22, 0.4, 1.14);
    ground.add(st2);
  }
  // leather straps
  box(ground, 0.06, 0.47, 0.72, 0x482c18, -2.9, 0.24, 1.5);
  box(ground, 0.06, 0.47, 0.72, 0x482c18, -2.1, 0.24, 1.5);
  // hurricane candle on top — the tall glass candle in the photos
  const hurr = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0xd0dce4, transparent: true, opacity: 0.3, roughness: 0.1, side: THREE.DoubleSide }));
  hurr.position.set(-2.5, 0.68, 1.5);
  ground.add(hurr);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 8), mat(0x8a2848));
  pillar.position.set(-2.5, 0.62, 1.5);
  ground.add(pillar);
  box(ground, 0.3, 0.12, 0.22, 0xc0b8a0, -2.7, 0.55, 1.4);   // book
  box(ground, 0.18, 0.1, 0.18, 0xa04038, -2.2, 0.54, 1.6);   // mug
  // tv console + tv
  box(ground, 1.8, 0.5, 0.5, 0x4a3a2e, 3, 0.25, -4.9);
  box(ground, 1.9, 1.05, 0.08, 0x111118, 3, 1.35, -4.95);
  box(ground, 0.5, 0.3, 0.3, 0x2c2c34, 1.8, 0.65, -4.8);     // console box
  // animated football on the living-room TV — the game is on during the party
  const hTvCanvas = document.createElement('canvas');
  hTvCanvas.width = 256; hTvCanvas.height = 144;
  const hTvCtx = hTvCanvas.getContext('2d');
  const hTvTex = new THREE.CanvasTexture(hTvCanvas);
  const hTvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 0.95), new THREE.MeshBasicMaterial({ map: hTvTex }));
  hTvScreen.position.set(3, 1.35, -4.9);
  ground.add(hTvScreen);
  function drawHouseTV() {
    const t = performance.now() / 1000;
    const __nowMs = performance.now();
    if (window.__texLast && __nowMs - window.__texLast < 66) { /* throttle texture upload */ } else {
    window.__texLast = __nowMs;
    hTvCtx.fillStyle = '#0d3311';
    hTvCtx.fillRect(0, 0, 256, 144);
    hTvCtx.strokeStyle = '#ffffff';
    hTvCtx.lineWidth = 1;
    for (let x = 20; x < 256; x += 28) {
      hTvCtx.beginPath(); hTvCtx.moveTo(x, 20); hTvCtx.lineTo(x, 124); hTvCtx.stroke();
    }
    const playT = t % 14;
    const ballX = 30 + (playT / 14) * 200;
    for (let i = 0; i < 5; i++) {
      hTvCtx.fillStyle = '#c03030';
      hTvCtx.beginPath(); hTvCtx.arc(Math.max(10, Math.min(246, ballX - 10 + Math.sin(t * 2.1 + i * 2.4) * 13 + i * 4)), 40 + i * 17 + Math.cos(t * 1.7 + i) * 6, 3.5, 0, Math.PI * 2); hTvCtx.fill();
      hTvCtx.fillStyle = '#3050c0';
      hTvCtx.beginPath(); hTvCtx.arc(Math.max(10, Math.min(246, ballX + 12 + Math.cos(t * 2.3 + i * 1.9) * 12 - i * 3)), 45 + i * 15 + Math.sin(t * 1.9 + i * 1.3) * 6, 3.5, 0, Math.PI * 2); hTvCtx.fill();
    }
    hTvCtx.fillStyle = '#ff5050';
    hTvCtx.beginPath(); hTvCtx.arc(Math.min(246, ballX), 72 + Math.sin(t * 3) * 5, 4.5, 0, Math.PI * 2); hTvCtx.fill();
    hTvCtx.fillStyle = '#000000cc';
    hTvCtx.fillRect(48, 4, 160, 20);
    hTvCtx.fillStyle = '#ffd663';
    hTvCtx.font = 'bold 12px Georgia';
    hTvCtx.textAlign = 'center';
    const c = 10 + Math.floor(Math.sin(t * 0.3) * 3 + 3);
    const w = 7 + Math.floor(Math.cos(t * 0.23) * 3 + 3);
    hTvCtx.fillText('CHURCHILL ' + c + ' — WOOTON ' + w, 128, 19);
    hTvTex.needsUpdate = true;
    }
  }
  drawHouseTV();
  setInterval(drawHouseTV, 120);
  // columbia md pride: merriweather post pavilion concert poster + lake kittamaqundi print
  const merC = document.createElement('canvas');
  merC.width = 256; merC.height = 340;
  const mc = merC.getContext('2d');
  mc.fillStyle = '#1a2a4a';
  mc.fillRect(0, 0, 256, 340);
  mc.fillStyle = '#f0d060';
  mc.font = 'bold 26px Georgia';
  mc.textAlign = 'center';
  mc.fillText('MERRIWEATHER', 128, 70);
  mc.fillText('POST', 128, 102);
  mc.fillText('PAVILION', 128, 134);
  mc.fillStyle = '#e8e8e8';
  mc.font = 'italic 20px Georgia';
  mc.fillText('columbia, maryland', 128, 180);
  mc.fillText('summer concert series', 128, 210);
  // pavilion roof swoosh
  mc.strokeStyle = '#f0d060';
  mc.lineWidth = 5;
  mc.beginPath();
  mc.moveTo(40, 260);
  mc.quadraticCurveTo(128, 220, 216, 260);
  mc.stroke();
  const merT = new THREE.CanvasTexture(merC);
  merT.colorSpace = THREE.SRGBColorSpace;
  const merPoster = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.73), new THREE.MeshBasicMaterial({ map: merT }));
  merPoster.position.set(1.8, 1.95, -5.8);
  scene.add(merPoster);
  const merFrame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.83, 0.04), mat(0x2a2a2a));
  merFrame.position.set(1.8, 1.95, -5.84);
  scene.add(merFrame);
  // lake kittamaqundi print — blue waves + people tree silhouette
  const lkC = document.createElement('canvas');
  lkC.width = 256; lkC.height = 200;
  const lk = lkC.getContext('2d');
  lk.fillStyle = '#7ab0c8';
  lk.fillRect(0, 0, 256, 200);
  lk.fillStyle = '#4a8aa8';
  lk.fillRect(0, 100, 256, 100);
  lk.fillStyle = '#2a4a3a';
  lk.fillRect(0, 86, 256, 16);
  lk.fillStyle = '#ffffff';
  lk.font = 'bold 20px Georgia';
  lk.textAlign = 'center';
  lk.fillText('LAKE KITTAMAQUNDI', 128, 160);
  lk.font = 'italic 14px Georgia';
  lk.fillText('columbia · est. 1967', 128, 182);
  const lkT = new THREE.CanvasTexture(lkC);
  lkT.colorSpace = THREE.SRGBColorSpace;
  const lkPrint = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.48), new THREE.MeshBasicMaterial({ map: lkT }));
  lkPrint.position.set(2.8, 1.9, -5.8);
  scene.add(lkPrint);
  const lkFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.56, 0.04), mat(0x2a2a2a));
  lkFrame.position.set(2.8, 1.9, -5.84);
  scene.add(lkFrame);

  // framed pictures on the wall
  for (const [fx, fy, fc] of [[-1.5, 1.9, 0xc0a060], [-0.5, 2.0, 0x6080a0], [0.6, 1.85, 0x7a9a5a]]) {
    box(ground, 0.5, 0.65, 0.05, 0x4a3524, fx, fy, -5.82);
    box(ground, 0.4, 0.55, 0.02, fc, fx, fy, -5.78);
  }
  // window with snowy night outside
  box(ground, 1.6, 1.4, 0.1, 0x3a4a66, 5.5, 1.8, -5.85);
  box(ground, 1.7, 0.08, 0.14, 0xd8cfc0, 5.5, 2.52, -5.8);
  box(ground, 1.7, 0.08, 0.14, 0xd8cfc0, 5.5, 1.08, -5.8);
  box(ground, 0.08, 1.4, 0.14, 0xd8cfc0, 5.5, 1.8, -5.8);
  // curtains framing the snowy window — heavy winter drapes
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8), mat(0x8a6a4a, 0.5));
  rod.rotation.z = Math.PI / 2;
  rod.position.set(5.5, 2.62, -5.75);
  ground.add(rod);
  for (const cside of [-1, 1]) {
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.08), mat(0x7a2a3a));
    curtain.position.set(5.5 + cside * 1.0, 1.85, -5.72);
    ground.add(curtain);
    // gathered folds illusion: vertical stripes
    for (let fi = 0; fi < 3; fi++) {
      const fold = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.5, 0.02), mat(0x5a1e2c));
      fold.position.set(5.5 + cside * (0.86 + fi * 0.14), 1.85, -5.68);
      ground.add(fold);
    }
  }

  // kitchen hint: counter along east wall
  box(ground, 0.9, 0.9, 3.2, 0xd0ccc0, 7.4, 0.45, -3);
  box(ground, 0.95, 0.06, 3.3, 0x8a8078, 7.4, 0.93, -3);
  box(ground, 0.5, 0.35, 0.5, 0x9aa0a8, 7.35, 1.15, -3.8);   // microwave-ish
  
  // --- richness pass: a lived-in holiday home ---
  // rugs with fringe
  function floorRug(parent, x, z, w, d, color, y) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color));
    r.position.set(x, (y || 0) + 0.03, z);
    parent.add(r);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.045, d * 0.7), mat(0xc8b090));
    inner.position.set(x, (y || 0) + 0.035, z);
    parent.add(inner);
  }
  floorRug(ground, -1, 1.5, 4.5, 3.2, 0x8a3a3a);
  floorRug(ground, 3.4, 2.4, 2.6, 1.8, 0x3a5a4a);
  floorRug(upper, 0, 0, 4.0, 2.6, 0x5a4a7a, 0);
  // framed art on walls
  function wallArt(parent, x, y, z, w, hgt, color, ry) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, hgt + 0.12, 0.06), mat(0x6a4a28));
    f.position.set(x, y, z);
    if (ry) f.rotation.y = ry;
    parent.add(f);
    // procedural painting: gradient sky + horizon + foreground strokes, unlit so it always reads
    const pc = document.createElement('canvas');
    pc.width = 96; pc.height = 72;
    const px = pc.getContext('2d');
    const sky = px.createLinearGradient(0, 0, 0, 72);
    sky.addColorStop(0, '#8ab8e0');
    sky.addColorStop(0.6, '#e0c8a0');
    sky.addColorStop(1, '#607848');
    px.fillStyle = sky;
    px.fillRect(0, 0, 96, 72);
    px.fillStyle = color ? '#' + new THREE.Color(color).getHexString() : '#7a5a3a';
    for (let si = 0; si < 7; si++) {
      px.globalAlpha = 0.5 + Math.random() * 0.4;
      px.beginPath();
      px.ellipse(12 + si * 13, 52 + Math.sin(si * 2) * 8, 9, 5, 0, 0, Math.PI * 2);
      px.fill();
    }
    px.globalAlpha = 1;
    const ptex = new THREE.CanvasTexture(pc);
    ptex.colorSpace = THREE.SRGBColorSpace;
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), new THREE.MeshBasicMaterial({ map: ptex }));
    c.position.set(x + (ry ? 0.06 : 0), y, z + (ry ? 0 : (z > 0 ? -0.06 : 0.06)));
    c.rotation.y = ry ? ry : (z > 0 ? Math.PI : 0);
    parent.add(c);
  }
  wallArt(ground, -7.7, 2.0, -3, 1.0, 0.8, 0x7ab0d0, Math.PI / 2);
  wallArt(ground, -7.7, 2.0, -0.8, 0.8, 1.0, 0xd09060, Math.PI / 2);
  wallArt(ground, -7.7, 2.1, 1.5, 1.2, 0.7, 0x70b080, Math.PI / 2);
  wallArt(ground, -7.72, 2.0, -1, 1.0, 0.9, 0xd0a860, Math.PI / 2);
  wallArt(upper, 0, 2.0, 5.72, 1.4, 0.9, 0xa090d0);
  // table lamps with warm glow
  function lamp(parent, x, y, z) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.3, 8), mat(0x5a4a3a));
    base.position.set(x, y + 0.15, z);
    parent.add(base);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.22, 10), new THREE.MeshStandardMaterial({ color: 0xf5deb0, emissive: 0xffdf9e, emissiveIntensity: 0.7 }));
    shade.position.set(x, y + 0.42, z);
    parent.add(shade);
    const pl = new THREE.PointLight(0xffdf9e, 4, 3.5);
    pl.position.set(x, y + 0.5, z);
    parent.add(pl);
  }
  lamp(ground, -2.6, 0.75, 3.9);
  lamp(ground, 3.9, 0.9, 2.0);
  lamp(upper, -5.2, 0.7, -4.4);
  // dining table + chairs with place settings
  const dt = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.2), mat(0x7a5a3a));
  dt.position.set(1.5, 0.75, -3.5);
  ground.add(dt);
  for (const [lx, lz] of [[0.6, -3.5], [2.4, -3.5], [1.5, -3.9], [1.5, -3.1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), mat(0x5a3a24));
    leg.position.set(lx, 0.37, lz);
    ground.add(leg);
  }
  for (let ci = 0; ci < 4; ci++) {
    const cx = 0.7 + (ci % 2) * 1.6, cz = ci < 2 ? -4.35 : -2.65;
    box(ground, 0.45, 0.45, 0.45, 0x6a4a2a, cx, 0.22, cz);
    box(ground, 0.45, 0.6, 0.08, 0x6a4a2a, cx, 0.75, cz + (ci < 2 ? -0.2 : 0.2));
    const plate2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 10), mat(0xf0ece0));
    plate2.position.set(cx, 0.82, ci < 2 ? -3.9 : -3.1);
    ground.add(plate2);
  }
  // centerpiece candles
  for (const cx of [1.2, 1.8]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 6), mat(0xe8e0d0));
    candle.position.set(cx, 0.9, -3.5);
    ground.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffca60 }));
    flame.position.set(cx, 1.02, -3.5);
    ground.add(flame);
  }
  // ===== REAL-HOUSE MATCH: signature pieces from 6570 Waning Moon Way =====
  // second green velvet sofa facing the first — the real living room has a matched pair
  const sofa2Mat = 0x4e7a54;
  box(ground, 2.6, 0.5, 1.1, sofa2Mat, -4, 0.3, 0.2);
  box(ground, 2.6, 0.55, 0.28, sofa2Mat, -4, 0.75, -0.3);
  box(ground, 0.28, 0.65, 1.1, sofa2Mat, -5.25, 0.5, 0.2);
  box(ground, 0.28, 0.65, 1.1, sofa2Mat, -2.75, 0.5, 0.2);
  box(ground, 1.15, 0.14, 0.95, 0x5a8a60, -4.55, 0.62, 0.25);
  box(ground, 1.15, 0.14, 0.95, 0x5a8a60, -3.45, 0.62, 0.25);
  // burgundy accent pillow on the second sofa — matches photos
  const accP = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.12), mat(0x8a2838));
  accP.position.set(-4.9, 0.75, -0.1);
  accP.rotation.z = 0.2;
  ground.add(accP);
  boundsByFloor.ground.push({ minX: -5.4, maxX: -2.6, minZ: -0.5, maxZ: 0.8 });

  // black lacquer asian folding screen with gold art — the signature corner piece
  for (let pi = 0; pi < 4; pi++) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.0, 0.05), mat(0x14100c));
    panel.position.set(-7.5 + pi * 0.5, 1.0, -5.6 + (pi % 2) * 0.22);
    panel.rotation.y = (pi % 2 ? -0.3 : 0.3);
    ground.add(panel);
    // gold painted detail on each panel
    const c2 = document.createElement('canvas');
    c2.width = 32; c2.height = 96;
    const cx2 = c2.getContext('2d');
    cx2.fillStyle = '#14100c';
    cx2.fillRect(0, 0, 32, 96);
    cx2.strokeStyle = '#c8a028';
    cx2.lineWidth = 2;
    cx2.beginPath();
    cx2.moveTo(8, 80); cx2.quadraticCurveTo(20, 55, 10, 40);
    cx2.quadraticCurveTo(24, 28, 14, 12);
    cx2.stroke();
    cx2.fillStyle = '#c8a028';
    for (const [fx, fy] of [[12, 30], [18, 48], [10, 62]]) { cx2.beginPath(); cx2.arc(fx, fy, 2.5, 0, 7); cx2.fill(); }
    const tt2 = new THREE.CanvasTexture(c2);
    tt2.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 1.9), new THREE.MeshStandardMaterial({ map: tt2, roughness: 0.4 }));
    art.position.copy(panel.position);
    art.position.z += (pi % 2 ? 0.05 : 0.05);
    art.position.x += 0.01;
    art.rotation.y = panel.rotation.y;
    art.position.y = 1.0;
    ground.add(art);
  }
  boundsByFloor.ground.push({ minX: -7.9, maxX: -5.4, minZ: -6.0, maxZ: -5.2 });

  // large gilt-framed mirror on the living room wall — opens the space like the photos
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 0.07), mat(0x9a7428));
  mirrorFrame.position.set(1.0, 1.9, 5.86);
  ground.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshStandardMaterial({ color: 0xaebfd0, roughness: 0.05, metalness: 0.9 }));
  mirrorGlass.position.set(1.0, 1.9, 5.82);
  mirrorGlass.rotation.y = Math.PI;
  ground.add(mirrorGlass);

  // wooden secretary desk with hutch against the wall — the antique in the photos
  box(ground, 0.9, 1.3, 0.45, 0x6a4426, 7.5, 0.65, 2.5);
  box(ground, 0.8, 0.6, 0.4, 0x7a5230, 7.5, 1.55, 2.5);
  // little cubby holes in the hutch
  for (const [hx, hy] of [[-0.2, 1.45], [0.1, 1.45], [-0.2, 1.7], [0.1, 1.7]]) {
    box(ground, 0.16, 0.14, 0.3, 0x3a2814, 7.5 + hx, hy, 2.55);
  }
  boundsByFloor.ground.push({ minX: 6.9, maxX: 8.0, minZ: 2.1, maxZ: 2.9 });

  // table lamp with cream shade on a side console — the warm pools of lamplight in every photo
  box(ground, 0.7, 0.75, 0.4, 0x5a3a24, 5.2, 0.37, 5.6);
  const tlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.3, 8), mat(0x8a6a3a));
  tlBase.position.set(5.2, 0.95, 5.6);
  ground.add(tlBase);
  const tlShade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.24, 10), mat(0xf0e4c8));
  tlShade.position.set(5.2, 1.25, 5.6);
  ground.add(tlShade);
  const tlGlow = new THREE.PointLight(0xffdfae, 2.2, 5.5);
  tlGlow.position.set(5.2, 1.4, 5.4);
  ground.add(tlGlow);
  // second lamp pairing the other side — photos show pairs of lamps
  const tl2Base = tlBase.clone(); tl2Base.position.set(-0.5, 0.95, 5.6); ground.add(tl2Base);
  const tl2Shade = tlShade.clone(); tl2Shade.position.set(-0.5, 1.25, 5.6); ground.add(tl2Shade);
  const tl2Glow = new THREE.PointLight(0xffdfae, 2.0, 5); tl2Glow.position.set(-0.5, 1.4, 5.4); ground.add(tl2Glow);
  box(ground, 0.7, 0.75, 0.4, 0x5a3a24, -0.5, 0.37, 5.6);

  // striped dining chair cushions — the green/burgundy stripe in the photos
  for (let ci2 = 0; ci2 < 4; ci2++) {
    const cx3 = 0.7 + (ci2 % 2) * 1.6, cz3 = ci2 < 2 ? -4.35 : -2.65;
    const sc = document.createElement('canvas');
    sc.width = 32; sc.height = 32;
    const sx2 = sc.getContext('2d');
    const stripes = ['#5a7a4a', '#8a3848', '#c8b088', '#5a7a4a'];
    stripes.forEach((col, si3) => { sx2.fillStyle = col; sx2.fillRect(si3 * 8, 0, 8, 32); });
    const st2 = new THREE.CanvasTexture(sc);
    st2.colorSpace = THREE.SRGBColorSpace;
    const cush = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), new THREE.MeshStandardMaterial({ map: st2, roughness: 0.9 }));
    cush.position.set(cx3, 0.48, cz3);
    ground.add(cush);
  }
  // candelabra centerpiece — tall brass with candle cups like the photos
  const candBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.05, 8), mat(0x8a6a28));
  candBase.position.set(1.5, 0.83, -3.5);
  ground.add(candBase);
  const candStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.35, 6), mat(0x8a6a28));
  candStem.position.set(1.5, 1.0, -3.5);
  ground.add(candStem);
  for (const off of [-0.14, 0, 0.14]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12, 5), mat(0x8a6a28));
    arm.position.set(1.5 + off, 1.15 - Math.abs(off) * 0.4, -3.5);
    ground.add(arm);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.1, 6), mat(0xe8e0d0));
    cup.position.set(1.5 + off, 1.24 - Math.abs(off) * 0.4, -3.5);
    ground.add(cup);
  }
  // richer polished wood on the dining table — red-toned like the photos
  dt.material = new THREE.MeshStandardMaterial({ color: 0x8a4626, roughness: 0.25 });

  // basement drop ceiling with fluorescent panel — the real 80s basement look
  for (let dx = -7; dx <= 7; dx += 2) {
    const grid = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 11.6), mat(0xd8d8d0));
    grid.position.set(dx, 3.0, 0);
    basement.add(grid);
  }
  for (let dz = -5; dz <= 5; dz += 2) {
    const grid = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.02, 0.04), mat(0xd8d8d0));
    grid.position.set(0, 3.0, dz);
    basement.add(grid);
  }
  const fluor = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.7), new THREE.MeshBasicMaterial({ color: 0xf4f8ff }));
  fluor.position.set(-2, 2.98, -1);
  basement.add(fluor);
  const fluorGlow = new THREE.PointLight(0xe8f0ff, 3.2, 11);
  fluorGlow.position.set(-2, 2.6, -1);
  basement.add(fluorGlow);

  // upstairs ceiling fan with light — in the real primary bedroom
  const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.14, 8), mat(0xc8b888));
  fanBase.position.set(-5.5, 2.9, 4.2);
  upper.add(fanBase);
  for (let fb = 0; fb < 4; fb++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.02, 0.16), mat(0xd8cbb0));
    blade.position.set(-5.5, 2.88, 4.2);
    blade.rotation.y = fb * Math.PI / 2;
    blade.translateX(0.42);
    upper.add(blade);
  }
  const fanLight = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2cc }));
  fanLight.position.set(-5.5, 2.78, 4.2);
  upper.add(fanLight);
  const fanGlow = new THREE.PointLight(0xffe8c0, 1.8, 6);
  fanGlow.position.set(-5.5, 2.6, 4.2);
  upper.add(fanGlow);

  // stockings on the fireplace wall + garland
  for (let si = 0; si < 4; si++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.06), mat([0xc04040, 0x3a6a4a, 0xc04040, 0x3a6a4a][si]));
    st.position.set(-6.2 + si * 0.4, 1.6, 5.82);
    ground.add(st);
  }
  // dust motes drifting in the warm light — atmosphere layer
  const moteGeo = new THREE.BufferGeometry();
  const moteCount = 120;
  const motePos = new Float32Array(moteCount * 3);
  for (let mi = 0; mi < moteCount; mi++) {
    motePos[mi * 3] = -7 + Math.random() * 14;
    motePos[mi * 3 + 1] = 0.3 + Math.random() * 2.8;
    motePos[mi * 3 + 2] = -5.5 + Math.random() * 11;
  }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0xffe8c0, size: 0.02, transparent: true, opacity: 0.55 }));
  ground.add(motes);
  window.__motes = { points: motes, base: motePos.slice() };
  // designed lighting: warm pools under each fixture + cool moonlight spill from the window
  for (const [lx, lz, li] of [[-3, 1.5, 5], [3, -3, 4], [-5, 4, 3.5]]) {
    const pool = new THREE.PointLight(0xffd9a0, li, 6.5, 1.8);
    pool.position.set(lx, 2.7, lz);
    ground.add(pool);
  }
  const moonlight = new THREE.DirectionalLight(0x8ab0e0, 0.35);
  moonlight.position.set(5.5, 3, -8);
  moonlight.target.position.set(0, 0, 2);
  ground.add(moonlight);
  ground.add(moonlight.target);
  // ceiling light fixtures
  for (const [fx, fz, fl] of [[0, 0, ground], [0, 0, upper]]) {
    const fix = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff2cc, emissive: 0xffe9b0, emissiveIntensity: 0.35 }));
    fix.position.set(fx, 3.1, fz);
    fl.add(fix);
  }
  // upstairs bedrooms: beds, dressers, posters
  function bed(parent, x, z, color) {
    box(parent, 1.1, 0.35, 2.0, 0x6a4a2a, x, 0.18, z);
    box(parent, 1.0, 0.15, 1.9, color, x, 0.42, z);
    box(parent, 0.5, 0.12, 0.4, 0xf0ece0, x, 0.5, z - 0.6);
    box(parent, 1.1, 0.7, 0.1, 0x6a4a2a, x, 0.5, z - 1.0);
  }
  // upstairs hallway runner rug
  const uprug = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.02, 20), mat(0x5a4a6a));
  uprug.scale.set(1.6, 1, 0.9);
  uprug.position.set(0, 0.02, 0.5);
  upper.add(uprug);
  // bedroom rug beside the bed
  const bedrug = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.02, 20), mat(0x8a5a5a));
  bedrug.position.set(-5.0, 0.02, -2.6);
  upper.add(bedrug);
  // nightstand lamp + book beside the bed
  box(upper, 0.5, 0.5, 0.5, 0x5a3a24, -7.2, 0.25, -3.4);
  const nlampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.25, 8), mat(0x4a3a2a));
  nlampBase.position.set(-7.2, 0.62, -3.4);
  upper.add(nlampBase);
  const nlampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.18, 8), mat(0xf0e0c0));
  nlampShade.position.set(-7.2, 0.82, -3.4);
  upper.add(nlampShade);
  const nlampGlow = new THREE.PointLight(0xffe0b0, 1.2, 3);
  nlampGlow.position.set(-7.2, 0.9, -3.4);
  upper.add(nlampGlow);
  // laundry basket with clothes
  box(upper, 0.55, 0.4, 0.45, 0xd8d0c0, -2.5, 0.2, -4.6);
  for (let li = 0; li < 3; li++) {
    const cloth = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mat([0xc04848, 0x4060a0, 0xf0e8d8][li]));
    cloth.scale.set(1, 0.6, 1);
    cloth.position.set(-2.65 + li * 0.15, 0.42, -4.6);
    upper.add(cloth);
  }
  bed(upper, -6.2, -4.2, 0x3a5a8a);
  bed(upper, -6.2, 4.2, 0x7a5230);
  // nightstands with warm glowing lamps beside each bed
  for (const nz of [-4.2, 4.2]) {
    box(upper, 0.45, 0.5, 0.45, 0x6a4a2c, -5.2, 0.25, nz + 0.9);
    const nlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffca70, emissiveIntensity: 0.8 }));
    nlamp.position.set(-5.2, 0.65, nz + 0.9);
    upper.add(nlamp);
  }
  box(upper, 1.2, 0.9, 0.5, 0x7a5a3a, -7.3, 0.45, -2.2);
  box(upper, 1.2, 0.9, 0.5, 0x7a5a3a, -7.3, 0.45, 2.2);
  wallArt(upper, -7.85, 2.0, -4, 0.9, 1.1, 0x30405a, Math.PI / 2);
  wallArt(upper, -7.85, 2.0, 4, 0.9, 1.1, 0x8a4a5a, Math.PI / 2);
  // wall-mounted bookshelf with shelf boards and loaded books
  box(ground, 1.3, 0.06, 0.26, 0x6a4a30, 6.6, 1.16, -5.75);
  box(ground, 1.3, 0.06, 0.26, 0x6a4a30, 6.6, 1.62, -5.75);
  for (const sxb of [6.0, 7.2]) box(ground, 0.06, 0.52, 0.26, 0x6a4a30, sxb, 1.39, -5.75);
  for (let bi = 0; bi < 8; bi++) {
    box(ground, 0.12, 0.3, 0.2, [0x8a3a3a, 0x3a5a8a, 0x3a6a4a, 0x9a7a3a][bi % 4], 6.1 + bi * 0.14, 1.35, -5.75);
  }
  // second row of books on the upper shelf
  for (let bi = 0; bi < 6; bi++) {
    box(ground, 0.12, 0.28, 0.2, [0x3a5a8a, 0x9a7a3a, 0x8a3a3a][bi % 3], 6.2 + bi * 0.15, 1.79, -5.75);
  }

  // front door + stair landing
  box(ground, 0.9, 2.1, 0.15, 0x6a4a2a, -6.5, 1.05, 5.9);
  box(ground, 0.12, 0.12, 0.12, 0xc0a040, -6.15, 1.05, 5.78); // doorknob
  const stairsMarker = box(ground, 2, 0.3, 2, 0x8a6a4a, 6, 0.1, 4);

  
  // real stairs: stepped flight with railing, replacing the flat pads
  function staircase(parent, x, z, baseY, up) {
    const grp = new THREE.Group();
    const stepMat = mat(0x8a6a4a);
    const carpetMat = mat(0x7a3a3a);
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.22, 0.42), stepMat);
      s.position.set(0, 0.11 + i * 0.26, (up ? -1 : 1) * i * 0.44);
      grp.add(s);
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.235, 0.43), carpetMat);
      runner.position.copy(s.position);
      runner.position.y += 0.005;
      grp.add(runner);
    }
    // railing: posts + sloped handrail
    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.0, 6), mat(0x5a3a24));
      post.position.set(0.8, 0.5 + i * 0.52, (up ? -1 : 1) * i * 0.88);
      grp.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 4.0), mat(0x5a3a24));
    rail.position.set(0.8, 1.6, (up ? -1 : 1) * 1.3);
    rail.rotation.x = (up ? 1 : -1) * 0.53;
    grp.add(rail);
    grp.position.set(x, baseY, z);
    parent.add(grp);
  }
  // garland spiraling down the staircase railing with warm lights — the classic holiday shot
  for (let i = 0; i < 6; i++) {
    const garl = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat(0x1e5a2e));
    garl.position.set(6.8, 0.8 + i * 0.4, 4.4 - i * 0.68);
    garl.scale.set(1, 0.7, 1);
    ground.add(garl);
    const glight = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffd770 : 0xff5050 }));
    glight.position.set(6.8, 0.88 + i * 0.4, 4.4 - i * 0.68);
    ground.add(glight);
  }
  // mantel candles + greenery on the fireplace wall
  for (const cxl of [-6.4, -5.6]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 8), mat(0xf0e8d8));
    candle.position.set(cxl, 1.95, 5.82);
    ground.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffc040 }));
    flame.position.set(cxl, 2.09, 5.82);
    ground.add(flame);
  }
  const mantelGarland = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), mat(0x1e5a2e));
  mantelGarland.position.set(-6.0, 1.82, 5.82);
  ground.add(mantelGarland);
  // dining area rug anchoring the table zone
  const diningRug = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.02, 24), mat(0x6a3a4a));
  diningRug.scale.set(1.3, 1, 1);
  diningRug.position.set(3, 0.02, -3);
  ground.add(diningRug);
  const diningRugInner = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.022, 24), mat(0x7a4a5a));
  diningRugInner.scale.set(1.3, 1, 1);
  diningRugInner.position.set(3, 0.021, -3);
  ground.add(diningRugInner);

  // dining chairs — proper rotated groups, backs facing away from the table
  for (const [cx, cz, cry] of [[2.2, -3.0, Math.PI / 2], [3.8, -3.0, -Math.PI / 2], [3.0, -2.3, Math.PI], [3.0, -3.7, 0]]) {
    const chair = new THREE.Group();
    const seatM = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), mat(0x6a4a2a));
    seatM.position.y = 0.46;
    chair.add(seatM);
    const backM = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.06), mat(0x6a4a2a));
    backM.position.set(0, 0.78, -0.19);
    chair.add(backM);
    for (const [lx, lz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
      const legM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.46, 0.05), mat(0x5a3a20));
      legM.position.set(lx, 0.23, lz);
      chair.add(legM);
    }
    chair.position.set(cx, 0, cz);
    chair.rotation.y = cry;
    ground.add(chair);
    boundsByFloor.ground.push({ minX: cx - 0.25, maxX: cx + 0.25, minZ: cz - 0.25, maxZ: cz + 0.25 });
  }

  // dining table centerpiece: candle trio + small wreath ring
  const wreathRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 16), mat(0x1e5a2e));
  wreathRing.rotation.x = Math.PI / 2;
  wreathRing.position.set(3, 0.98, -3.0);
  ground.add(wreathRing);
  for (let ci3 = 0; ci3 < 3; ci3++) {
    const tcandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.14, 6), mat(0xc03838));
    tcandle.position.set(2.92 + ci3 * 0.08, 1.05, -3.0);
    ground.add(tcandle);
  }
  staircase(ground, 6, 4.4, 0, true);
  staircase(upper, 6, 4.4, 0, false);
  staircase(basement, 6, 4.4, 0, false);

  // holiday touches: garland + lights over the door (the reference photos)
  const garland = box(ground, 2.4, 0.25, 0.2, 0x1e5a2e, -6.5, 2.3, 5.85);
  for (let i = 0; i < 6; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), new THREE.MeshBasicMaterial({ color: [0xff4444, 0xffd663, 0x44ff88][i % 3] }));
    bulb.position.set(-7.4 + i * 0.36, 2.28, 5.7);
    ground.add(bulb);
  }


  // ---- richness pass: holiday townhouse detail ----
  // christmas tree in the corner with lights + ornaments + star
  const treeG = new THREE.Group();
  const treeMat = mat(0x2e5230);
  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 - i * 0.22, 0.85, 10), treeMat);
    cone.position.y = 0.6 + i * 0.55;
    cone.castShadow = true;
    treeG.add(cone);
  }
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.4, 8), mat(0x5a4028));
  trunk.position.y = 0.2;
  treeG.add(trunk);
  const star = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
  star.position.y = 2.35;
  treeG.add(star);
  const ornColors = [0xd04a4a, 0x4a7ad0, 0xe8c060, 0xd07ac0];
  for (let i = 0; i < 14; i++) {
    const orn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), new THREE.MeshBasicMaterial({ color: ornColors[i % 4] }));
    const a = i * 2.4, r = 0.75 - (i % 3) * 0.18, h = 0.7 + (i % 4) * 0.4;
    orn.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    treeG.add(orn);
  }
  treeG.position.set(-6.8, 0.1, -4.6);
  ground.add(treeG);
  const treeLight = new THREE.PointLight(0xffd080, 8, 6);
  treeLight.position.set(-6.8, 1.6, -4.6);
  ground.add(treeLight);
  // presents under the tree
  box(ground, 0.4, 0.3, 0.4, 0xc04a4a, -6.2, 0.15, -3.9);
  box(ground, 0.3, 0.25, 0.3, 0x4a6ac0, -7.1, 0.12, -3.8);
  box(ground, 0.35, 0.2, 0.35, 0x50a060, -6.5, 0.1, -4.1);

  // fireplace on the north wall with warm glow
  box(ground, 1.8, 1.3, 0.5, 0x8a7a6a, 2.5, 0.65, -5.7);
  box(ground, 1.0, 0.8, 0.3, 0x1a1210, 2.5, 0.5, -5.55);
  const fire = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xff8030 }));
  fire.position.set(2.5, 0.4, -5.5);
  ground.add(fire);
  const fireLight = new THREE.PointLight(0xff7020, 12, 7);
  fireLight.position.set(2.5, 0.9, -5.2);
  ground.add(fireLight);
  // mantel stockings
  for (let i = 0; i < 3; i++) box(ground, 0.16, 0.3, 0.1, 0xc04040, 2.0 + i * 0.45, 1.15, -5.5);

  // bookshelf with colorful book spines
  box(ground, 0.35, 2.0, 1.4, 0x6a4a30, 7.6, 1.0, -3.5);
  for (let sh = 0; sh < 4; sh++) {
    for (let b = 0; b < 6; b++) {
      const bc = [0xa04a3a, 0x3a6aa0, 0x50a060, 0xc0a040, 0x8050a0, 0xc06040][(sh + b) % 6];
      box(ground, 0.2, 0.32, 0.16, bc, 7.45, 0.45 + sh * 0.45, -4.05 + b * 0.2);
    }
  }

  // baseboard trim along walls
  for (const [w, d, x, z] of [[16, 0.08, 0, -5.82], [16, 0.08, 0, 5.82]]) {
    box(ground, w, 0.22, d, 0xe8e0d0, x, 0.2, z);
  }
  box(ground, 0.08, 0.22, 12, 0xe8e0d0, -7.82, 0.2, 0);
  box(ground, 0.08, 0.22, 12, 0xe8e0d0, 7.82, 0.2, 0);

  // warm ceiling planes — kills the void-dark look overhead
  for (const [cf, cy] of [[ground, 3.35], [upper, 3.3]]) {
    const cmesh = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.08, 11.8), new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 0.95 }));
    cmesh.position.set(0, cy, 0);
    cf.add(cmesh);
  }

  // ceiling light fixture (visible warm disc)
  const fix = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0d0 }));
  fix.position.set(0, 3.25, 0);
  fix.scale.y = 0.5;
  ground.add(fix);

  // dining table + chairs by the kitchen
  box(ground, 1.8, 0.08, 1.0, 0x7a5a38, 3.5, 0.75, 2.5);
  for (const [lx, lz] of [[2.8, 2.1], [4.2, 2.1], [2.8, 2.9], [4.2, 2.9]]) {
    box(ground, 0.09, 0.75, 0.09, 0x5a4028, lx, 0.37, lz);
  }
  for (const [cx, cz] of [[3.5, 1.4], [3.5, 3.6], [2.4, 2.5], [4.6, 2.5]]) {
    box(ground, 0.45, 0.06, 0.45, 0x8a6a48, cx, 0.45, cz);
    box(ground, 0.45, 0.5, 0.06, 0x8a6a48, cx, 0.75, cz + (cz > 2.5 ? 0.2 : -0.2));
  }
  // cookies + milk on the table (it's the holidays)
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), mat(0xe8e0d0));
  plate.position.set(3.3, 0.8, 2.4);
  ground.add(plate);
  for (let i = 0; i < 3; i++) {
    const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 8), mat(0x9a6a3a));
    ck.position.set(3.24 + i * 0.07, 0.82, 2.38 + (i % 2) * 0.05);
    ground.add(ck);
  }
  box(ground, 0.09, 0.14, 0.09, 0xf0f0f0, 3.8, 0.86, 2.6);

  // garland over the window + wreath on the door wall
  const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.09, 8, 16), mat(0x2e6234));
  wreath.position.set(-6.5, 2.2, 5.83);
  ground.add(wreath);
  const bowM = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), mat(0xc04040));
  bowM.position.set(-6.5, 1.9, 5.83);
  ground.add(bowM);

  // BASEMENT richness: washer/dryer, storage shelves with boxes, Tre's computer glow
  box(basement, 0.9, 1.0, 0.8, 0xd8d8d8, -6.5, 0.5, -5.2);
  box(basement, 0.9, 1.0, 0.8, 0xc8c8c8, -5.5, 0.5, -5.2);
  const wd = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16), mat(0x2a2a32));
  wd.rotation.x = Math.PI / 2;
  wd.position.set(-6.5, 0.55, -4.78);
  basement.add(wd);
  box(basement, 2.2, 0.06, 0.5, 0x6a5a48, 5.5, 1.2, -5.5);
  box(basement, 2.2, 0.06, 0.5, 0x6a5a48, 5.5, 1.9, -5.5);
  for (let i = 0; i < 5; i++) {
    box(basement, 0.4, 0.35, 0.4, 0xa08050, 4.7 + (i % 3) * 0.7, i < 3 ? 1.42 : 2.12, -5.5);
  }
    // basement richness: tre's hangout — workbench, shelves, storage, warm string lights
  box(basement, 2.2, 0.9, 0.8, 0x6a4a2a, -5, 0.45, -5.2);
  box(basement, 0.5, 0.5, 0.4, 0x8a8a92, -5.6, 1.1, -5.2);
  box(basement, 0.3, 0.35, 0.3, 0xc0c0c8, -4.4, 1.0, -5.2);
  // shelving units with boxes
  for (const sx of [3.5, 5.2]) {
    box(basement, 1.4, 2.0, 0.5, 0x5a5a62, sx, 1.0, -5.4);
    for (let bi = 0; bi < 3; bi++) {
      box(basement, 0.5, 0.35, 0.4, [0x9a7a4a, 0x7a6a5a, 0x6a7a8a][bi], sx - 0.35 + bi * 0.4, 0.5 + bi * 0.55, -5.3);
    }
  }
  // washer + dryer
  box(basement, 0.9, 1.0, 0.8, 0xe0e4e8, -7, 0.5, 4.5);
  box(basement, 0.9, 1.0, 0.8, 0xd0d4d8, -7, 0.5, 3.5);
  const wdoor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16), mat(0x3a4a5a));
  wdoor.rotation.x = Math.PI / 2;
  wdoor.position.set(-7, 0.6, 4.95);
  basement.add(wdoor);
  // warm string lights across basement ceiling
  for (let li = 0; li < 12; li++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffca70 }));
    bulb.position.set(-7 + li * 1.2, 3.1 + Math.sin(li * 1.2) * 0.1, -1);
    basement.add(bulb);
  }
  const baseLight = new THREE.PointLight(0xffca80, 8, 14);
  baseLight.position.set(0, 2.6, 0);
  basement.add(baseLight);
  // rug + beanbag corner (tre's spot)
  const brug = new THREE.Mesh(new THREE.BoxGeometry(3, 0.04, 2.4), mat(0x4a5a6a));
  brug.position.set(2, 0.05, 3);
  basement.add(brug);
  const bean = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), mat(0x8a3a3a));
  bean.scale.y = 0.6;
  bean.position.set(3.2, 0.28, 3.8);
  basement.add(bean);

// exposed pipes along basement ceiling
  for (let i = 0; i < 3; i++) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 15, 8), mat(0x707078));
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(0, 3.2 - i * 0.01, -4 + i * 3.5);
    basement.add(pipe);
  }

  // UPPER richness: hallway runner rug, door frames, wall art
  const runner = new THREE.Mesh(new THREE.BoxGeometry(10, 0.02, 1.2), mat(0x9a5a4a));
  runner.position.set(0, 0.12, 0);
  upper.add(runner);
  for (const [x, z, ry] of [[-5.5, -5.83, 0], [-5, 5.83, 0]]) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 0.1), mat(0x7a5a3a));
    frame.position.set(x, 1.1, z);
    upper.add(frame);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.06), mat(0xd8cbb8));
    door.position.set(x, 1.0, z + (z > 0 ? -0.04 : 0.04));
    upper.add(door);
  }
  // nursery hint: crib visible through the hall
  box(upper, 1.2, 0.7, 0.7, 0xd8c8b0, 5.5, 0.45, 4.5);
  for (let i = 0; i < 5; i++) box(upper, 0.05, 0.7, 0.05, 0xc8b8a0, 5.0 + i * 0.25, 0.35, 4.15);
  // small wall frames with color art
  for (let i = 0; i < 4; i++) {
    box(upper, 0.5, 0.4, 0.04, 0x6a5a48, -2 + i * 1.6, 2.0, -5.85);
    box(upper, 0.4, 0.3, 0.05, [0x8ab0d0, 0xd0a0a0, 0xa0d0a8, 0xd0c890][i], -2 + i * 1.6, 2.0, -5.82);
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
  const christian = makePerson({ photo: faces.christian, top: 0x5a6b42, bottom: 0x3a3a44, hair: 0x6a4a2e, hairStyle: 'short', jacket: true, skin: 0xe0b088, ...playerIdentity(faces) });
  scene.add(christian.group);

  const jim = makePerson({ photo: faces.jim, top: 0x2c3140, bottom: 0x3c3c44, hair: 0xb8b0a4, hairStyle: 'receding', skin: 0xd8a878, name: 'Jim', });
  jim.group.position.set(-4, 0, 3.42);
  jim.group.rotation.y = Math.PI;
  ground.add(jim.group);
  jim.sit(0.69);
  window.__jim = jim;
  jim.group.position.y += 0.42 * 0.95; // undo sit()'s floor-level drop since he's on the seat

  const olivia = makePerson({ outfit: 'dress', photo: faces.olivia, top: 0x222226, bottom: 0x222226, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(-5.5, 0, -3.4);
  olivia.group.rotation.y = Math.PI / 2;
  upper.add(olivia.group);

  const olivia2 = makePerson({ outfit: 'dress', photo: faces.olivia2, top: 0xd07a92, bottom: 0x777788, hair: 0x241812, hairStyle: 'bun', skin: 0xe8c098, name: 'Olivia??', });
  olivia2.group.position.set(-5, 0, 3.8);
  olivia2.group.rotation.y = Math.PI / 2;
  upper.add(olivia2.group);

  const tre = makePerson({ photo: faces.tre, top: 0x5a6b42, bottom: 0x2c2c34, hair: 0x14100c, hairStyle: 'curly', skin: 0x8a5a3a, name: 'Tre', });
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
  const interactions = new Interactions(scene);
  const guide = new GuideMarker(scene);
  guide.setTarget(-4, 3.2);

  // start: walk in the front door
  showFloor('ground');
  christian.group.position.set(0.5, 0, -0.5);
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
    pos: new THREE.Vector3(-4, 0, 3.2), radius: 2.2, label: 'Talk to Jim', floor: 'ground', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Hi — I’m Christian. Here to pick something up for the swap later.' },
        { speaker: 'Jim', text: 'She’s upstairs.' },
        { speaker: 'Jim', text: '…Help yourself to a cookie on the way out. The Olivias made them.' },
        { speaker: 'Christian', text: '…the Olivias? Plural??' },
        { speaker: 'Jim', text: 'You’ll see. Go on up.' },
      ]);
      guide.setTarget(6, 4);
      showObjective('Upstairs — the stair landing is in the corner.', 4500);
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(-6.2, 0, 5.2), radius: 2, label: 'Warm up by the fire', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'That is a proper fire. Jim does not mess around with the fire.' },
        { speaker: 'Jim', text: 'Thirty years of perfect fires, and all I get is grief about the thermostat.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(3.3, 0, 2.4), radius: 1.8, label: 'Take a cookie', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Okay these are genuinely incredible. Which Olivia made them??' },
        { speaker: 'Jim', text: 'Yes.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-6.5, 0, -4.5), radius: 2, label: 'Admire the tree', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Every year the tree is somehow exactly the same and exactly perfect.' },
      ]);
    },
  });

  interactions.add({
    pos: new THREE.Vector3(1.8, 0, -5.0), radius: 1.8, label: 'Merriweather poster', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Merriweather Post Pavilion. Half of Columbia has a story that starts with a show on that lawn.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(3, 0, -4.0), radius: 1.7, label: 'Watch the game', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Churchill versus Wooton. The whole county picks a side whether they mean to or not.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(6.8, 0, -5.2), radius: 1.8, label: 'Browse the bookshelf', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Cookbooks, a James Rouse biography, and three copies of the same thriller. This is the most Columbia shelf possible.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-6.8, 0, -1.2), radius: 1.8, label: 'Look out the window', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Snow coming down over Columbia. Somewhere out there Lake Kittamaqundi is freezing over.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-2.5, 0, -4.8), radius: 1.8, label: 'Raid the fridge', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Kids drawings held on by magnets, leftover casserole, and exactly one fancy mustard. A proper family fridge.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(3.0, 0, -3.0), radius: 1.6, label: 'The dining table', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Set for six, candles and everything. Nobody in Columbia does a casual holiday dinner. It is always an Event.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-3.2, 0, 5.6), radius: 1.8, label: 'Pet Tre', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'Who is a good cat. Who runs this entire house. It is Tre. It was always Tre.' },
      ]);
    },
  });
  interactions.add({
    pos: new THREE.Vector3(7.2, 0, 4.6), radius: 1.8, label: 'Water the fiddle-leaf', floor: 'ground',
    action: async () => {
      await dialogue.play([
        { speaker: 'Christian', text: 'This plant is thriving. One of the Olivias has a serious green thumb. Or both of them. Still unclear how many Olivias.' },
      ]);
    },
  });

  // Dr. Fritz reminder card on the fridge — unlocks the dentist office
  interactions.add({
    pos: new THREE.Vector3(-7.2, 0, -3.2), radius: 2, label: 'Dr. Fritz reminder card', floor: 'ground',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'A magnet card: DR. FRITZ — family dentistry. "Olivia — don\'t forget your shift!" …Olivia works for a dentist?' },
      ]);
      const c = await choice(['Sneak over to Dr. Fritz\'s office', 'Stay on mission']);
      player.frozen = false;
      if (c === 0) {
        const { dentistScene } = await import('./dentist.js');
        game.switchScene(dentistScene);
      }
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
    pos: new THREE.Vector3(-6.2, 0, -2.6), radius: 1.7, label: 'The blue bedding', floor: 'upper',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'All black everything. One Olivia is going through her midnight phase. Honestly? Commitment to a bit is respectable.' },
      ]);
      player.frozen = false;
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-6.2, 0, 2.6), radius: 1.7, label: 'The bronze bedding', floor: 'upper',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Bronze paisley, immaculate. The other Olivia is the exact opposite of downstairs blue-bedding Olivia. They really are two different people. Probably.' },
      ]);
      player.frozen = false;
    },
  });
  interactions.add({
    pos: new THREE.Vector3(1, 0, 0), radius: 2.0, label: 'The upstairs hallway', floor: 'upper',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Two bedrooms, one hallway, zero answers about the Olivia situation so far.' },
      ]);
      player.frozen = false;
    },
  });
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
      guide.setTarget(-5, 3.8);
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
          guide.setTarget(6, 4);
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
      guide.setTarget(-6.5, 5.4);
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


  // collectibles: vintage cameras for Stacy + vinyl records
  const pickups = new Pickups(scene);
  const inv = inventory();
  pickups.add(makeCameraMesh(), -6, 5, 'camera--6-5', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeRecordMesh(), 5, -4, 'record-5--4', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });

  // living room center: coffee table with a few books + a mug — fills the empty middle
  const ctbl = box(ground, 1.4, 0.35, 0.8, 0x6a4a2c, -2.2, 0.35, 1.6);
  for (let i = 0; i < 3; i++) {
    box(ground, 0.24, 0.04, 0.32, [0x8a3040, 0x2a4a6a, 0x4a6a3a][i], -2.5 + i * 0.3, 0.56 + i * 0.005, 1.55 + (i % 2) * 0.15);
  }
  box(ground, 0.09, 0.1, 0.09, 0xd8d0c0, -1.85, 0.6, 1.75);
  boundsByFloor.ground.push({ minX: -2.9, maxX: -1.5, minZ: 1.2, maxZ: 2.0 });
  boundsByFloor.upper.push({ minX: -2.9, maxX: -1.5, minZ: 1.2, maxZ: 2.0 });
  boundsByFloor.basement = boundsByFloor.basement.filter(() => true);

  interactions.add({
    pos: new THREE.Vector3(7.3, 0, -3),
    radius: 2.0,
    label: 'Browse the shelf',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Cookbooks, a yearbook, and three identical copies of the same thriller. Classic.' },
      ]);
      player.frozen = false;
    },
  });

  // fridge with kids' drawings held by magnets — peak lived-in energy
  const fridge = box(ground, 0.9, 1.9, 0.8, 0xd8d4cc, 7.4, 0.95, -0.2);
  boundsByFloor.ground.push({ minX: 6.9, maxX: 7.9, minZ: -0.65, maxZ: 0.25 });
  const drawColors = [0xc05a6a, 0x5a8ac0, 0x6ac05a];
  for (let i = 0; i < 3; i++) {
    const dc2 = document.createElement('canvas');
    dc2.width = 32; dc2.height = 40;
    const dx2 = dc2.getContext('2d');
    dx2.fillStyle = '#f5f2e8';
    dx2.fillRect(0, 0, 32, 40);
    dx2.strokeStyle = '#' + drawColors[i].toString(16).padStart(6, '0');
    dx2.lineWidth = 2;
    dx2.beginPath();
    dx2.arc(16, 14, 6, 0, 6.28);
    dx2.moveTo(16, 20); dx2.lineTo(16, 32);
    dx2.moveTo(8, 24); dx2.lineTo(24, 24);
    dx2.stroke();
    const dt2 = new THREE.CanvasTexture(dc2);
    const drawing = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), new THREE.MeshBasicMaterial({ map: dt2 }));
    drawing.position.set(7.4 - 0.41, 1.3 - i * 0.35, -0.35 + i * 0.3);
    drawing.rotation.y = -Math.PI / 2;
    scene.add(drawing);
  }

  setTimeout(() => phoneText('Olivia', 'make yourself at home! wine&#39;s in the kitchen, obviously'), 6000);
  setTimeout(() => phoneText('Olivia (the other one)', 'whoever is playing music in the basement turn it UP'), 12500);

  // ---- crystal hunt: Olivia calls after you settle in — 5 crystals hidden in the house ----
  const crystalState = { active: false, found: 0, started: false };
  function makeCrystalMesh() {
    const g = new THREE.Group();
    const geo = new THREE.OctahedronGeometry(0.16, 0);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xb080ff, emissive: 0x7040c0, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.3,
    }));
    m.scale.y = 1.6;
    g.add(m);
    const glow = new THREE.PointLight(0x9060ff, 0.7, 2.2);
    glow.position.y = 0.2;
    g.add(glow);
    return g;
  }
  const crystalSpots = [
    { x: -6.5, z: -3.5, hint: 'the kitchen' },      // behind kitchen clutter
    { x: 6.8, z: 4.8, hint: 'the dining room' },     // under dining table
    { x: -7.2, z: 5.8, hint: 'the living room' },    // behind the couch
    { x: 2.5, z: -6.5, hint: 'near the fireplace' }, // by the hearth
    { x: -2.0, z: 7.0, hint: 'the stairs' },         // near stair base
  ];
  const crystalMeshes = [];
  crystalSpots.forEach((sp, i) => {
    const cm = makeCrystalMesh();
    cm.position.set(sp.x, 0.55, sp.z);
    cm.visible = false;
    scene.add(cm);
    crystalMeshes.push({ mesh: cm, taken: false, x: sp.x, z: sp.z, hint: sp.hint });
  });
  window.__startCrystalHunt = () => {
    if (crystalState.started) return;
    crystalState.started = true;
    crystalState.active = true;
    crystalMeshes.forEach((c) => { c.mesh.visible = true; });
    showObjective('🔮 find 5 crystals around the house — Olivia needs them tonight', 6000);
  };
  // Olivia's call fires 35s into the scene (or instantly if you already finished the photo game)
  setTimeout(() => {
    if (crystalState.started) return;
    phoneText("Olivia", "omg hey — I&#39;m heading out but I lost my crystals around the house?? there&#39;s 5 of them. can you grab them and bring them to DC tonight — I NEED them for the full moon 🌕");
    setTimeout(() => { window.__startCrystalHunt(); }, 4500);
  }, 34000);

  return {
    update(dt) {
    if (window.__motes) {
      const mp = window.__motes.points.geometry.attributes.position;
      const t = performance.now() / 1000;
      for (let mi = 0; mi < mp.count; mi++) {
        mp.array[mi * 3] += Math.sin(t * 0.4 + mi) * 0.0004;
        mp.array[mi * 3 + 1] += Math.cos(t * 0.3 + mi * 2) * 0.0003;
      }
      mp.needsUpdate = true;
    }
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, floor: typeof floor !== "undefined" ? floor : null, self: this };
      if (!this._fireLoop) {
        this._fireLoop = null;
        try { this._fireLoop = positionalLoop({ type: 'noise', freq: 900, x: 2.5, z: -5.5, maxDist: 7, gain: 0.14, rate: 3 }); } catch {}
      }
      if (this._fireLoop) this._fireLoop.update(christian.group.position.x, christian.group.position.z);
      player.update(dt);
      if (crystalState.active) {
        const pp2 = christian.group.position;
        const tt = performance.now() / 1000;
        for (const c of crystalMeshes) {
          if (c.taken) continue;
          c.mesh.rotation.y += dt * 2.2;
          c.mesh.position.y = 0.55 + Math.sin(tt * 2.4 + c.x) * 0.08;
          if (Math.hypot(pp2.x - c.x, pp2.z - c.z) < 1.0) {
            c.taken = true;
            scene.remove(c.mesh);
            crystalState.found++;
            const left = 5 - crystalState.found;
            showObjective(left > 0 ? '🔮 crystal ' + crystalState.found + ' of 5 — ' + left + ' still hidden' : '🔮 all 5 crystals! bring them to Olivia in DC tonight 🌕', 4000);
            if (window.__sfxBuzz) window.__sfxBuzz();
            // encounter beats while hunting — you run into the household
            if (!crystalState._enc) crystalState._enc = {};
            if (crystalState.found === 1 && !crystalState._enc.jim) {
              crystalState._enc.jim = true;
              dialogue.play([
                { speaker: 'Jim', text: 'A crystal? Oh that tracks. She has them in every room. The moon ones are the good ones, or so I am told. Frequently.' },
                { speaker: 'Christian', text: 'You just... live with this.' },
                { speaker: 'Jim', text: 'You learn to appreciate the full moon evenings. Very quiet house.' },
              ]);
            } else if (crystalState.found === 2 && !crystalState._enc.tre) {
              crystalState._enc.tre = true;
              dialogue.play([
                { speaker: 'Tre', text: '*sniffs the crystal in your hand, deeply unimpressed*' },
                { speaker: 'Christian', text: 'Not food, buddy. Magic rock. Allegedly.' },
              ]);
            } else if (crystalState.found === 3 && !crystalState._enc.o2) {
              crystalState._enc.o2 = true;
              dialogue.play([
                { speaker: 'Olivia?', text: 'Oh — you are doing the crystal thing. For her. Cute.' },
                { speaker: 'Christian', text: 'You are... the other one. Do YOU lose crystals too?' },
                { speaker: 'Olivia?', text: 'I never lose anything. That is one of the differences.' },
              ]);
            }
            if (left === 0) {
              crystalState.active = false;
              localStorage.setItem('cp-crystals', '1');
              setTimeout(() => phoneText("Olivia", "you found them?? you're a lifesaver — see you at the monument 🌕🔮"), 5000);
            }
          }
        }
      }
      pickups.update(dt, christian.group.position);
      // floor-aware breadcrumbs: in the basement with tre's item, lead back to the stairs first
      if (items.treItem && floor === 'basement') {
        guide.setTarget(6, 2.2);
      } else if (items.treItem && floor === 'ground') {
        guide.setTarget(-6.5, 5.4);
      }
      guide.update(dt, christian.group.position);
      const it = performance.now() / 1000;
      const od2 = Math.hypot(christian.group.position.x - olivia.group.position.x, christian.group.position.z - olivia.group.position.z);
      if (od2 < 4.5) {
        olivia.group.rotation.y = Math.atan2(christian.group.position.x - olivia.group.position.x, christian.group.position.z - olivia.group.position.z);
      }
      olivia.animateIdle(it);
      // pose for the camera when christian is close (photo game), idle otherwise
      const od = Math.hypot(christian.group.position.x - olivia2.group.position.x, christian.group.position.z - olivia2.group.position.z);
      if (od < 4.5) {
        const ph = Math.floor(it / 2.2) % 3;
        olivia2.group.rotation.y = Math.atan2(christian.group.position.x - olivia2.group.position.x, christian.group.position.z - olivia2.group.position.z);
        if (olivia2.armL) {
          if (ph === 0) { olivia2.armL.rotation.z = 2.4; olivia2.armR.rotation.z = -0.3; }
          else if (ph === 1) { olivia2.armL.rotation.z = 0.3; olivia2.armR.rotation.z = -2.4; }
          else { olivia2.armL.rotation.z = 2.0; olivia2.armR.rotation.z = -2.0; }
        }
      } else {
        olivia2.animateIdle(it + 1.3);
      }
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
