import * as THREE from 'three';
import { Pickups } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson } from '../engine/character.js';
import { woodFloor, carpet, paintedWall } from '../engine/textures.js';
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
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: paintedWall(typeof wallColor === 'number' ? '#' + wallColor.toString(16).padStart(6, '0') : wallColor, 3, 1.2), roughness: 0.85 }));
      wall.position.set(x, h / 2, z);
      g.add(wall);
    }
    g.position.y = y;
    g.visible = false;
    scene.add(g);
    return g;
  }

  const ground = buildFloor({ wallColor: 0xcfc4ae, floorColor: 0x9a7850, y: 0, floorTex: woodFloor('#8a6a42', 3, 2.2) });
  const upper = buildFloor({ wallColor: 0xd8cfc4, floorColor: 0xa88a62, y: 0, floorTex: carpet('#7a6858', 4, 3) });
  const basement = buildFloor({ wallColor: 0x4a4a52, floorColor: 0x3c3c44, y: 0, floorTex: carpet('#3c3c44', 4, 3) });

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
  const couchMat = 0x7a5a3a;
  box(ground, 2.6, 0.5, 1.1, couchMat, -4, 0.3, 3.5);
  box(ground, 2.6, 0.55, 0.28, couchMat, -4, 0.75, 4.0);
  box(ground, 0.28, 0.65, 1.1, couchMat, -5.25, 0.5, 3.5);
  box(ground, 0.28, 0.65, 1.1, couchMat, -2.75, 0.5, 3.5);
  box(ground, 1.15, 0.14, 0.95, 0x8a6a4a, -4.55, 0.62, 3.5);  // cushions
  box(ground, 1.15, 0.14, 0.95, 0x8a6a4a, -3.35, 0.62, 3.5);
  // area rug
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.03, 24), mat(0x8a4a42));
  rug.position.set(-2.5, 0.12, 1.5);
  rug.scale.z = 0.7;
  ground.add(rug);
  // coffee table + clutter
  box(ground, 1.3, 0.08, 0.7, 0x5a4030, -2.5, 0.45, 1.5);
  box(ground, 0.08, 0.42, 0.6, 0x5a4030, -3.05, 0.21, 1.5);
  box(ground, 0.08, 0.42, 0.6, 0x5a4030, -1.95, 0.21, 1.5);
  box(ground, 0.3, 0.12, 0.22, 0xc0b8a0, -2.7, 0.55, 1.4);   // book
  box(ground, 0.18, 0.1, 0.18, 0xa04038, -2.2, 0.54, 1.6);   // mug
  // tv console + tv
  box(ground, 1.8, 0.5, 0.5, 0x4a3a2e, 3, 0.25, -4.9);
  box(ground, 1.9, 1.05, 0.08, 0x111118, 3, 1.35, -4.95);
  box(ground, 0.5, 0.3, 0.3, 0x2c2c34, 1.8, 0.65, -4.8);     // console box
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
  // stockings on the fireplace wall + garland
  for (let si = 0; si < 4; si++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.3, 0.06), mat([0xc04040, 0x3a6a4a, 0xc04040, 0x3a6a4a][si]));
    st.position.set(-6.2 + si * 0.4, 1.6, 5.82);
    ground.add(st);
  }
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
  bed(upper, -6.2, -4.2, 0x222226);
  bed(upper, -6.2, 4.2, 0xd07a92);
  box(upper, 1.2, 0.9, 0.5, 0x7a5a3a, -7.3, 0.45, -2.2);
  box(upper, 1.2, 0.9, 0.5, 0x7a5a3a, -7.3, 0.45, 2.2);
  wallArt(upper, -7.85, 2.0, -4, 0.9, 1.1, 0x30405a, Math.PI / 2);
  wallArt(upper, -7.85, 2.0, 4, 0.9, 1.1, 0x8a4a5a, Math.PI / 2);
  // bookshelf loaded with books
  for (let bi = 0; bi < 8; bi++) {
    box(ground, 0.12, 0.3, 0.2, [0x8a3a3a, 0x3a5a8a, 0x3a6a4a, 0x9a7a3a][bi % 4], 6.1 + bi * 0.14, 1.35, -5.75);
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
  const christian = makePerson({ photo: faces.christian, top: 0x5a6b42, bottom: 0x3a3a44, hair: 0x6a4a2e, hairStyle: 'short', jacket: true, skin: 0xe0b088, name: 'Christian', });
  scene.add(christian.group);

  const jim = makePerson({ photo: faces.jim, top: 0x2c3140, bottom: 0x3c3c44, hair: 0xb8b0a4, hairStyle: 'receding', skin: 0xd8a878, name: 'Jim', });
  jim.group.position.set(-4, 0, 3.42);
  jim.group.rotation.y = Math.PI;
  ground.add(jim.group);
  jim.sit(0.69);
  window.__jim = jim;
  jim.group.position.y += 0.42 * 0.95; // undo sit()'s floor-level drop since he's on the seat

  const olivia = makePerson({ photo: faces.olivia, top: 0x222226, bottom: 0x222226, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(-5.5, 0, -3.4);
  olivia.group.rotation.y = Math.PI / 2;
  upper.add(olivia.group);

  const olivia2 = makePerson({ photo: faces.olivia2, top: 0xd07a92, bottom: 0x777788, hair: 0x241812, hairStyle: 'bun', skin: 0xe8c098, name: 'Olivia??', });
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
  const interactions = new Interactions();
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
  solid(ctbl);

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, floor: typeof floor !== "undefined" ? floor : null, self: this };
      player.update(dt);
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
