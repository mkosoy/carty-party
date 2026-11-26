import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective } from '../engine/core.js';

// E11EVEN Miami — the reward. Olivia dances in the neon heart of the club:
// laser grids, LED walls, smoke, a crowd moving with the beat, confetti
// cannons, the whole ultraclub atmosphere at 4am.
export async function miamiScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x05060e);
  scene.fog = new THREE.Fog(0x120620, 11, 38);
  scene.add(new THREE.AmbientLight(0x35204a, 1.15));

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const glow = (c) => new THREE.MeshBasicMaterial({ color: c });

  // club floor: glossy dark with reflection-ish shine
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 22), new THREE.MeshStandardMaterial({ color: 0x0c0c14, roughness: 0.15, metalness: 0.7 }));
  floor.receiveShadow = true;
  scene.add(floor);
  // dark inset dance-floor panel with a thin neon border — no tile grid,
  // the real club floor is glossy black that mirrors the lights
  const inset = new THREE.Mesh(new THREE.BoxGeometry(15, 0.05, 9.5), new THREE.MeshStandardMaterial({ color: 0x06060c, roughness: 0.08, metalness: 0.85 }));
  inset.position.set(0, 0.12, 1.5);
  scene.add(inset);
  const borderMat = new THREE.MeshBasicMaterial({ color: 0xff2a8a });
  for (const [bw, bd, bx, bz] of [[15, 0.06, 0, -3.25], [15, 0.06, 0, 6.25], [0.06, 9.5, -7.5, 1.5], [0.06, 9.5, 7.5, 1.5]]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05, bd), borderMat);
    strip.position.set(bx, 0.15, bz);
    scene.add(strip);
  }
  const tiles = [];
  // walls
  for (const [w, h, d, x, z] of [
    [30, 7, 0.4, 0, -11], [30, 7, 0.4, 0, 11], [0.4, 7, 22, -15, 0], [0.4, 7, 22, 15, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x0e0c18));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -15, maxX: 15, minZ: -11.4, maxZ: -10.9 }, { minX: -15, maxX: 15, minZ: 10.9, maxZ: 11.4 },
    { minX: -15.4, maxX: -14.9, minZ: -11.4, maxZ: 11.4 }, { minX: 14.9, maxX: 15.4, minZ: -11.4, maxZ: 11.4 },
  ];

  // LED wall behind the dj/dance platform: animated color bars
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 256; ledCanvas.height = 96;
  const ledCtx = ledCanvas.getContext('2d');
  const ledTex = new THREE.CanvasTexture(ledCanvas);
  ledTex.colorSpace = THREE.SRGBColorSpace;
  const ledWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), new THREE.MeshBasicMaterial({ map: ledTex }));
  ledWall.position.set(0, 3.2, -10.7);
  scene.add(ledWall);

  // E11EVEN neon sign over the wall
  const signC = document.createElement('canvas');
  signC.width = 512; signC.height = 128;
  const sc = signC.getContext('2d');
  sc.fillStyle = 'rgba(0,0,0,0)'; sc.clearRect(0, 0, 512, 128);
  sc.font = 'bold 84px Arial';
  sc.textAlign = 'center';
  sc.shadowColor = '#ff2a8a'; sc.shadowBlur = 28;
  sc.fillStyle = '#ff4a9a';
  sc.fillText('E11EVEN', 256, 92);
  const signT = new THREE.CanvasTexture(signC);
  signT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: signT, transparent: true }));
  sign.position.set(0, 6.2, -10.6);
  scene.add(sign);

  // laser beams: thin emissive planes sweeping
  const lasers = [];
  const laserColors = [0x20ff80, 0xff2060, 0x20c0ff, 0xffe020];
  for (let i = 0; i < 8; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 14), new THREE.MeshBasicMaterial({
      color: laserColors[i % 4], transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    beam.position.set(-10 + i * 2.8, 4.5, -8);
    beam.rotation.z = 0.5 - i * 0.14;
    beam.rotation.x = 0.6;
    scene.add(beam);
    lasers.push(beam);
  }

  // moving head spotlights on truss
  const truss = new THREE.Mesh(new THREE.BoxGeometry(24, 0.25, 0.25), mat(0x2a2a32));
  truss.position.set(0, 6.4, -2);
  scene.add(truss);
  const heads = [];
  const spotColors = [0xff2a8a, 0x20c0ff, 0x9a40ff, 0x20ff80];
  for (let i = 0; i < 4; i++) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.3), mat(0x1a1a22));
    head.position.set(-9 + i * 6, 6.1, -2);
    scene.add(head);
    const sp = new THREE.SpotLight(spotColors[i], 60, 22, 0.5, 0.4);
    sp.position.copy(head.position);
    sp.target.position.set(-9 + i * 6, 0, 2);
    scene.add(sp);
    scene.add(sp.target);
    heads.push({ sp, phase: i * 1.7 });
  }

  // bar along the right wall with neon underglow
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 10), mat(0x14101e));
  bar.position.set(13.8, 0.55, 2);
  scene.add(bar);
  bounds.push({ minX: 13.1, maxX: 14.5, minZ: -3, maxZ: 7 });
  const barGlow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 10), glow(0x20c0ff));
  barGlow.position.set(13.15, 0.2, 2);
  scene.add(barGlow);
  // bottles shelf glow
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 8), mat(0x0c0a14));
  shelf.position.set(14.8, 2.4, 2);
  scene.add(shelf);
  for (let b = 0; b < 14; b++) {
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.35, 6), glow([0xff9040, 0x40ff90, 0xff4090, 0x4090ff][b % 4]));
    bot.position.set(14.7, 1.6 + Math.floor(b / 7) * 0.9, -1 + (b % 7) * 1.0);
    scene.add(bot);
  }

  // vip booths left wall with little tables
  for (let i = 0; i < 3; i++) {
    const boothSeat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 2.6), mat(0x2a1030));
    boothSeat.position.set(-14, 0.45, -5 + i * 4.5);
    scene.add(boothSeat);
    bounds.push({ minX: -14.6, maxX: -13.4, minZ: -6.3 + i * 4.5, maxZ: -3.7 + i * 4.5 });
  }

  // crowd: npcs dancing in place all over the floor
  const crowd = [];
  const looks = [
    { top: 0xff4080, bottom: 0x1a1a22, skin: 0xe8c098, hair: 0x2a1a12, hairStyle: 'long' },
    { top: 0x20c0ff, bottom: 0x222230, skin: 0x8a5a3a, hair: 0x111111, hairStyle: 'short' },
    { top: 0xffe020, bottom: 0x2c2c34, skin: 0xd8a878, hair: 0x5a3a1a, hairStyle: 'curly' },
    { top: 0x9a40ff, bottom: 0x1a1a26, skin: 0xe0b088, hair: 0x16100e, hairStyle: 'bun' },
    { top: 0x20ff80, bottom: 0x22222c, skin: 0xb87a50, hair: 0x0e0c0a, hairStyle: 'short' },
    { top: 0xff6060, bottom: 0x2c2c34, skin: 0xe8c8a8, hair: 0xd8b878, hairStyle: 'long' },
    { top: 0x40c0c0, bottom: 0x1c1c24, skin: 0xe8c098, hair: 0x6a4a26, hairStyle: 'long' },
    { top: 0xc0c0c8, bottom: 0x222230, skin: 0xd0a080, hair: 0x3a2a1a, hairStyle: 'short' },
  ];
  for (let i = 0; i < 12; i++) {
    const n = makePerson(looks[i % looks.length]);
    const a = (i / 12) * Math.PI * 2;
    const rx = Math.cos(a) * (4.5 + (i % 3)), rz = Math.sin(a) * 3.5 + 1;
    n.group.position.set(rx, 0, rz);
    n.group.rotation.y = Math.atan2(rx - 0, rz - (-4.5)) + Math.PI + (Math.random() - 0.5) * 0.4;
    scene.add(n.group);
    crowd.push({ p: n, phase: Math.random() * 6.28, rate: 1.6 + Math.random() * 1.2 });
  }

  // confetti particles floating down constantly
  const confettiCount = 300;
  const confettiGeo = new THREE.BufferGeometry();
  const cPos = new Float32Array(confettiCount * 3);
  const cCol = new Float32Array(confettiCount * 3);
  const palette = [[1, 0.3, 0.6], [0.2, 0.8, 1], [1, 0.9, 0.2], [0.4, 1, 0.5], [0.8, 0.3, 1]];
  for (let i = 0; i < confettiCount; i++) {
    cPos[i * 3] = (Math.random() - 0.5) * 24;
    cPos[i * 3 + 1] = Math.random() * 8;
    cPos[i * 3 + 2] = (Math.random() - 0.5) * 18;
    const c = palette[i % 5];
    cCol[i * 3] = c[0]; cCol[i * 3 + 1] = c[1]; cCol[i * 3 + 2] = c[2];
  }
  confettiGeo.setAttribute('position', new THREE.BufferAttribute(cPos, 3));
  confettiGeo.setAttribute('color', new THREE.BufferAttribute(cCol, 3));
  const confetti = new THREE.Points(confettiGeo, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0.9 }));
  scene.add(confetti);

  // haze: soft purple fog light in the middle
  const haze = new THREE.PointLight(0x8a30c0, 20, 24);
  haze.position.set(0, 4, 0);
  scene.add(haze);
  const pinkWash = new THREE.PointLight(0xff2a8a, 14, 18);
  pinkWash.position.set(-6, 3.5, -6);
  scene.add(pinkWash);
  const cyanWash = new THREE.PointLight(0x20c0ff, 14, 18);
  cyanWash.position.set(7, 3.5, -4);
  scene.add(cyanWash);

  // olivia on the stage — the reward dance
  const olivia = makePerson({ photo: faces.olivia, top: 0xff2a8a, bottom: 0x1a1a22, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(0, 0.55, -4.5);
  scene.add(olivia.group);

  // the philly fam cheering at the front of the stage
  const famLooks = [
    { top: 0x3a5a8a, bottom: 0x2c2c34, skin: 0xe8c098, hair: 0x3a2a1a, hairStyle: 'short' },
    { top: 0xd07ac0, bottom: 0x222230, skin: 0xd8a878, hair: 0x5a3a1a, hairStyle: 'bun' },
    { top: 0x50a060, bottom: 0x2c2c34, skin: 0xb87a50, hair: 0x111111, hairStyle: 'curly' },
  ];
  const fam = [];
  famLooks.forEach((look, i) => {
    const f = makePerson(look);
    f.group.position.set(-2 + i * 2, 0, -1.2);
    f.group.rotation.y = Math.PI;
    scene.add(f.group);
    fam.push({ p: f, phase: i });
  });

  const player = new PlayerController(olivia, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.snap(olivia.group.position);
  camera.position.set(0, 3.2, 4);
  camera.lookAt(0, 1, -4.5);

  // intro dialogue
  setTimeout(async () => {
    await dialogue.play([
      { speaker: 'Olivia', text: 'Eleven. Miami. Every tooth clean, the whole philly fam here — this is the best night of my life.' },
      { speaker: 'The Fam', text: 'OLIVIA! OLIVIA! OLIVIA!' },
    ]);
    showObjective('🎉 You did it — Olivia dances at E11EVEN. Carty Party: A MoCo Holiday — bonus scene complete!', 8000);
  }, 700);

  let t = 0;
  // --- E11EVEN signature: the mezzanine. A balcony level wraps the side and
  // back walls with railings and vip silhouettes looking down at the stage ---
  const mezzMat = new THREE.MeshStandardMaterial({ color: 0x12101e, roughness: 0.35, metalness: 0.4 });
  const railMat = new THREE.MeshBasicMaterial({ color: 0xff2a8a });
  function mezzanine(len, x, z, ry) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = ry;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.25, 2.6), mezzMat);
    deck.position.y = 3.3;
    grp.add(deck);
    // fascia glow strip along the deck edge
    const fascia = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.08), railMat);
    fascia.position.set(0, 3.22, 1.28);
    grp.add(fascia);
    // railing: top rail + posts
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: 0x8888a0, metalness: 0.8, roughness: 0.3 }));
    rail.position.set(0, 4.35, 1.15);
    grp.add(rail);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(len, 0.75, 0.03), new THREE.MeshStandardMaterial({ color: 0x30284a, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.6 }));
    glass.position.set(0, 3.95, 1.15);
    grp.add(glass);
    for (let px = -len / 2 + 0.4; px < len / 2; px += 1.6) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.05), rail.material);
      post.position.set(px, 3.9, 1.15);
      grp.add(post);
    }
    // support columns to the floor
    for (const cx of [-len / 2 + 0.5, 0, len / 2 - 0.5]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.3, 10), mezzMat);
      col.position.set(cx, 1.65, 1.0);
      grp.add(col);
    }
    // vip silhouettes leaning on the rail
    for (let vx = -len / 2 + 1.2; vx < len / 2 - 0.6; vx += 2.2) {
      const vip = makePerson({ skin: [0xe8c098, 0x8a5a3a, 0xd8a878][Math.floor(Math.random() * 3)], hair: 0x16100e, hairStyle: Math.random() > 0.5 ? 'long' : 'short', top: [0xff4080, 0x20c0ff, 0xc0c0c8, 0x9a40ff][Math.floor(Math.random() * 4)], bottom: 0x1a1a22 });
      vip.group.position.set(vx + (Math.random() - 0.5) * 0.5, 3.42, 0.5 + Math.random() * 0.4);
      vip.group.rotation.y = Math.PI + (Math.random() - 0.5) * 0.6;
      grp.add(vip.group);
    }
    scene.add(grp);
  }
  mezzanine(28, 0, -9.9, 0);          // behind the stage
  mezzanine(20, -13.9, 0, Math.PI / 2);   // left wall
  mezzanine(20, 13.9, 0, -Math.PI / 2);   // right wall

  // --- theatrical main stage: wide raised platform with steps and trim,
  // replacing the small cylinder — this is where Olivia performs ---
  const stage = new THREE.Group();
  stage.position.set(0, 0, -4.5);
  const deckMain = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.55, 24), new THREE.MeshStandardMaterial({ color: 0x14101e, roughness: 0.25, metalness: 0.6 }));
  deckMain.position.y = 0.28;
  stage.add(deckMain);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff2a8a }));
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.56;
  stage.add(trim);
  const trim2 = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.03, 8, 32), new THREE.MeshBasicMaterial({ color: 0x20c0ff }));
  trim2.rotation.x = Math.PI / 2;
  trim2.position.y = 0.1;
  stage.add(trim2);
  // steps down to the dance floor at the front
  for (let st = 0; st < 3; st++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.09, 0.4), mezzMat);
    step.position.set(0, 0.45 - st * 0.17, 2.75 + st * 0.34);
    stage.add(step);
  }
  // hydraulic pole centerpiece — E11EVEN's stage signature
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 5.6, 10), new THREE.MeshStandardMaterial({ color: 0xc0c8d8, metalness: 0.95, roughness: 0.15 }));
  pole.position.set(0.9, 3.1, 0);
  stage.add(pole);
  // backlight spot aimed at the performer
  const stageSpot = new THREE.SpotLight(0xff4a9a, 90, 16, 0.4, 0.5);
  stageSpot.position.set(0, 6.4, -2.5);
  stageSpot.target.position.set(0, 1.2, -4.5);
  scene.add(stageSpot);
  scene.add(stageSpot.target);
  scene.add(stage);

  // --- realism pass: ceiling, truss rigs, VIP booths, bottle service, DJ booth ---
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(30.5, 0.3, 22.5), mat(0x060510));
  ceiling.position.y = 7;
  scene.add(ceiling);
  // truss bars crisscrossing the ceiling with light cans
  const trussMat = new THREE.MeshLambertMaterial({ color: 0x1a1a22 });
  for (const tz of [-7, -3, 1, 5]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(26, 0.22, 0.22), trussMat);
    bar.position.set(0, 6.6, tz);
    scene.add(bar);
    for (const cx of [-10, -5, 0, 5, 10]) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.42, 8), mat(0x22222c));
      can.position.set(cx, 6.35, tz);
      scene.add(can);
    }
  }
  // VIP booths along side walls: couches + tables with glowing bottles
  function vipBooth(x, z, ry) {
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = ry;
    const couch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.1), mat(0x4a1020));
    couch.position.y = 0.28;
    grp.add(couch);
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 0.25), mat(0x5a1626));
    back.position.set(0, 0.7, -0.45);
    grp.add(back);
    for (const sx of [-1.1, 0, 1.1]) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.95), mat(0x5a1626));
      cushion.position.set(sx, 0.6, 0.05);
      grp.add(cushion);
    }
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x14141e, roughness: 0.3, metalness: 0.6 }));
    table.position.set(0, 0.25, 1.15);
    grp.add(table);
    // bottles with glowing necks (sparklers vibe)
    for (const [bx, bz, bc] of [[-0.18, 1.0, 0xffd070], [0.14, 1.25, 0x70c0ff], [0.05, 0.95, 0xff70b0]]) {
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0x0a2015, roughness: 0.1, metalness: 0.4 }));
      bottle.position.set(bx, 0.67, bz);
      grp.add(bottle);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.14, 6), new THREE.MeshBasicMaterial({ color: bc }));
      neck.position.set(bx, 0.9, bz);
      grp.add(neck);
    }
    // ice bucket
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.25, metalness: 0.9 }));
    bucket.position.set(0.32, 0.6, 1.1);
    grp.add(bucket);
    scene.add(grp);
    const pad = Math.abs(x) > 12 ? { minX: x - 2.4, maxX: x + 2.4, minZ: z - 1.9, maxZ: z + 1.9 } : null;
    if (pad) bounds.push(pad);
  }
  vipBooth(-13.2, -6, Math.PI / 2);
  vipBooth(-13.2, 2, Math.PI / 2);
  vipBooth(13.2, -6, -Math.PI / 2);
  vipBooth(13.2, 2, -Math.PI / 2);
  vipBooth(13.2, 7.5, -Math.PI / 2);
  vipBooth(-13.2, 7.5, Math.PI / 2);
  // DJ booth center-back on the platform: decks, mixer, dj figure nodding
  const djBooth = new THREE.Group();
  djBooth.position.set(0, 0.55, -8.6);
  const deckTable = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.9, 0.8), mat(0x101018));
  deckTable.position.y = 0.45;
  djBooth.add(deckTable);
  for (const dx of [-0.8, 0.8]) {
    const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.2, metalness: 0.7 }));
    platter.position.set(dx, 0.93, 0);
    djBooth.add(platter);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.055, 12), new THREE.MeshBasicMaterial({ color: 0xff2a8a }));
    label.position.set(dx, 0.93, 0);
    djBooth.add(label);
  }
  const mixer = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.55), mat(0x1c1c26));
  mixer.position.set(0, 0.93, 0);
  djBooth.add(mixer);
  scene.add(djBooth);
  const djChar = makePerson({ skin: 0xc98d64, hair: 0x14100c, hairStyle: 'short', top: 0x101010, bottom: 0x181818, height: 1.0 });
  djChar.group.position.set(0, 0.55, -9.3);
  scene.add(djChar.group);
  const headphones = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 16, Math.PI), mat(0x222222));
  headphones.position.set(0, 0.55 + 1.72 * 0.95, -9.3);
  headphones.rotation.z = Math.PI;
  scene.add(headphones);
  bounds.push({ minX: -1.8, maxX: 1.8, minZ: -9.6, maxZ: -8.0 });
  // light shafts: big soft additive cones under the moving heads for haze volume
  const shafts = [];
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 6, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: [0xff2a8a, 0x20c0ff, 0x9a40ff, 0x20ff80][i], transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })
    );
    cone.position.set(-6 + i * 4, 3.8, -2);
    scene.add(cone);
    shafts.push(cone);
  }
  return {
    update(dt) {
      window.__sceneHooks = { interactions: null, player, christian: olivia, self: this };
      t += dt;

      // the player controls olivia — wasd/joystick walks her around the club
      player.update(dt);
      // the stage is a raised platform: ramp her up inside its circle
      const sd = Math.hypot(olivia.group.position.x, olivia.group.position.z + 4.5);
      const groundY = sd < 2.8 ? 0.55 : 0;
      if (player.grounded) olivia.group.position.y += (groundY - olivia.group.position.y) * Math.min(1, dt * 12);
      const spd = Math.hypot(player.vel.x, player.vel.z);
      // custom choreography whenever she isn't walking — this is her night
      if (spd < 0.4 && player.grounded) {
        const mv = Math.floor(t / 2.6) % 4;
        if (mv === 0) {
          // rave hands: arms alternating overhead
          olivia.armL.rotation.x = Math.PI * 0.9 + Math.sin(t * 8) * 0.5;
          olivia.armR.rotation.x = Math.PI * 0.9 - Math.sin(t * 8) * 0.5;
          olivia.armL.rotation.z = 0.4; olivia.armR.rotation.z = -0.4;
          olivia.group.rotation.z = Math.sin(t * 8) * 0.04;
          olivia.group.position.y = groundY + Math.abs(Math.sin(t * 5)) * 0.1;
        } else if (mv === 1) {
          // hip sway, arms out wide
          olivia.armL.rotation.x = 0.3; olivia.armR.rotation.x = 0.3;
          olivia.armL.rotation.z = 1.3 + Math.sin(t * 4) * 0.35;
          olivia.armR.rotation.z = -1.3 + Math.sin(t * 4) * 0.35;
          olivia.group.rotation.z = Math.sin(t * 4) * 0.09;
          olivia.group.position.y = groundY + Math.abs(Math.sin(t * 4)) * 0.05;
        } else if (mv === 2) {
          // bass-face pump: fast deep bounces, fists pumping down
          olivia.armL.rotation.x = 2.2 + Math.sin(t * 10) * 0.6;
          olivia.armR.rotation.x = 2.2 + Math.sin(t * 10) * 0.6;
          olivia.armL.rotation.z = 0.2; olivia.armR.rotation.z = -0.2;
          olivia.group.position.y = groundY + Math.abs(Math.sin(t * 10)) * 0.16;
          olivia.group.rotation.z = 0;
        } else {
          // spin burst, arms in a T
          olivia.armL.rotation.z = 1.5; olivia.armR.rotation.z = -1.5;
          olivia.armL.rotation.x = 0; olivia.armR.rotation.x = 0;
          olivia.group.rotation.y += dt * 7;
          olivia.group.rotation.z = 0;
          olivia.group.position.y = groundY + Math.abs(Math.sin(t * 6)) * 0.06;
        }
      } else {
        olivia.armL.rotation.z = 0; olivia.armR.rotation.z = 0;
        olivia.group.rotation.z = 0;
      }

      // fam cheers bouncing
      fam.forEach((f) => {
        f.p.group.position.y = Math.abs(Math.sin(t * 4 + f.phase)) * 0.18;
        f.p.animateWalk(dt, 1.4);
      });

      // dj nods with the beat
      djChar.group.position.y = 0.55 + Math.abs(Math.sin(t * 3.6)) * 0.05;
      djChar.animateWalk(dt, 0.8);
      // haze shafts sway
      for (let i = 0; i < shafts.length; i++) {
        shafts[i].rotation.z = Math.sin(t * 0.9 + i * 1.7) * 0.28;
        shafts[i].rotation.x = Math.cos(t * 0.7 + i) * 0.18;
      }
      // crowd dancing
      for (const c of crowd) {
        c.p.group.position.y = Math.abs(Math.sin(t * c.rate * 2 + c.phase)) * 0.12;
        c.p.group.rotation.y += Math.sin(t * c.rate + c.phase) * dt * 0.8;
        c.p.animateWalk(dt, 1.2);
      }



      // lasers sweep
      for (let i = 0; i < lasers.length; i++) {
        lasers[i].rotation.z = Math.sin(t * 0.9 + i * 0.8) * 0.7;
        lasers[i].material.opacity = 0.35 + Math.sin(t * 4 + i) * 0.2;
      }

      // moving head spotlights sweep the floor
      for (const h of heads) {
        h.sp.target.position.x = Math.sin(t * 1.3 + h.phase) * 9;
        h.sp.target.position.z = 2 + Math.cos(t * 0.8 + h.phase) * 6;
        h.sp.intensity = 45 + Math.sin(t * 6 + h.phase) * 20;
      }

      // LED wall visualizer bars
      ledCtx.fillStyle = '#0a0612';
      ledCtx.fillRect(0, 0, 256, 96);
      for (let b = 0; b < 32; b++) {
        const hgt = 20 + Math.abs(Math.sin(t * 5 + b * 0.9)) * 60 * Math.random() * 0.3 + Math.abs(Math.sin(t * 2.2 + b)) * 40;
        const hue = (t * 0.15 + b / 32) % 1;
        ledCtx.fillStyle = `hsl(${hue * 360},90%,55%)`;
        ledCtx.fillRect(b * 8, 96 - hgt, 6, hgt);
      }
      ledTex.needsUpdate = true;

      // confetti drifts down, swirls
      const pos = confetti.geometry.attributes.position;
      for (let i = 0; i < confettiCount; i++) {
        pos.array[i * 3 + 1] -= dt * (0.5 + (i % 5) * 0.12);
        pos.array[i * 3] += Math.sin(t * 2 + i) * dt * 0.4;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 8;
      }
      pos.needsUpdate = true;

      // third-person follow — you ARE olivia on the floor now
      followCam.update(dt, olivia.group.position);
    },
    dispose() {},
  };
}
