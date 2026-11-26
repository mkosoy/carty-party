import * as THREE from 'three';
import { Pickups } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson } from '../engine/character.js';
import { woodFloor, carpet } from '../engine/textures.js';
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
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(wallColor));
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
    box(ground, 0.4, 0.55, 0.06, fc, fx, fy, -5.83);
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
  // front door + stair landing
  box(ground, 0.9, 2.1, 0.15, 0x6a4a2a, -6.5, 1.05, 5.9);
  box(ground, 0.12, 0.12, 0.12, 0xc0a040, -6.15, 1.05, 5.78); // doorknob
  const stairsMarker = box(ground, 2, 0.3, 2, 0x8a6a4a, 6, 0.1, 4);

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
  jim.group.position.set(-4, 0.62, 3.35);
  ground.add(jim.group);
  jim.sit();
  jim.group.position.y += 0.42 * 0.95; // undo sit()'s floor-level drop since he's on the seat

  const olivia = makePerson({ photo: faces.olivia, top: 0x222226, bottom: 0x222226, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(-5.5, 0, -3.4);
  upper.add(olivia.group);

  const olivia2 = makePerson({ photo: faces.olivia2, top: 0xd07a92, bottom: 0x777788, hair: 0x241812, hairStyle: 'bun', skin: 0xe8c098, name: 'Olivia??', });
  olivia2.group.position.set(-5, 0, 3.8);
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
    pos: new THREE.Vector3(-4, 0, 3.2), radius: 2.2, label: 'Talk to Jim', floor: 'ground', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Hi — I’m Christian. Here to pick something up for the swap later.' },
        { speaker: 'Jim', text: 'She’s upstairs.' },
        { speaker: 'Jim', text: '…Help yourself to a cookie on the way out. Stacy’s mom made them. They’re the good ones.' },
      ]);
      guide.setTarget(6, 4);
      showObjective('Upstairs — the stair landing is in the corner.', 4500);
      player.frozen = false;
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

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, floor: typeof floor !== "undefined" ? floor : null, self: this };
      player.update(dt);
      pickups.update(dt, christian.group.position);
      guide.update(dt, christian.group.position);
      const it = performance.now() / 1000;
      olivia.animateIdle(it);
      olivia2.animateIdle(it + 1.3);
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
