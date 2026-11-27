import { positionalLoop } from '../engine/sfx.js';
import * as THREE from 'three';
import { npcFacePlayer, Pickups, phoneText } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson, playerIdentity } from '../engine/character.js';
import { concrete } from '../engine/textures.js';
import { FollowCam, PlayerController, Interactions, showObjective, phoneOverlay, choice, GuideMarker } from '../engine/core.js';
import { makeChatter } from '../engine/collectibles.js';

// Scene 1 — Washington Dulles. Long concourse, big windows looking at snow,
// seating rows, a wall TV playing "Churchill vs Wooton: The Big Game",
// arrivals signage, and the phone call from Stacy that starts the story.
export async function airportScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x2a3a55);
  scene.fog = new THREE.Fog(0x2a3a55, 70, 160);

  // lighting: cool terminal light + warm spots
  scene.add(new THREE.HemisphereLight(0xdde8ff, 0x8a8078, 0.5));
  scene.add(new THREE.AmbientLight(0xc8d4e8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
  sun.position.set(8, 14, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const bounds = [];
  const solid = (mesh, pad = 0) => {
    mesh.updateMatrixWorld();
    const b = new THREE.Box3().setFromObject(mesh);
    bounds.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad });
  };

    // designed lighting: cool diffuse terminal wash + warm pools at the coffee counter
  const termWash = new THREE.DirectionalLight(0xc8d8f0, 0.5);
  termWash.position.set(0, 8, -10);
  scene.add(termWash);
  for (const [px, pz, col] of [[-8, -2, 0xffd9a0], [8, -2, 0xffd9a0], [0, -8, 0xbcd0ff]]) {
    const pool = new THREE.PointLight(col, 2.6, 9, 1.8);
    pool.position.set(px, 3.4, pz);
    scene.add(pool);
  }
  // floor: polished terrazzo-ish
  const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 26), new THREE.MeshStandardMaterial({ map: concrete('#7d7a72', 8, 3.5), roughness: 0.35, metalness: 0.15 }));
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  // seated + standing travelers so the terminal feels inhabited
  const travelerPalettes = [
    { top: 0x6a5a7a, bottom: 0x3a3a44, hair: 0x2a1a10, skin: 0xd8a878 },
    { top: 0x3a5a6a, bottom: 0x2c2c34, hair: 0x4a3a2a, skin: 0x8a5a3a },
    { top: 0x8a4a4a, bottom: 0x4a4a52, hair: 0x1a1210, skin: 0xe8c098 },
    { top: 0x4a6a4a, bottom: 0x3a3a44, hair: 0x6a5a4a, skin: 0xc89878 },
    { top: 0x5a5a6a, bottom: 0x2c2c34, hair: 0x8a8078, skin: 0xd8a878 },
  ];
  const seatedSpots = [[-9, -2], [-9, 1], [0, 0], [0, 3], [9, -1]];
  const travelers = [];
  seatedSpots.forEach(([rx, si], ti) => {
    const p = travelerPalettes[ti % travelerPalettes.length];
    const tr = makePerson({ top: p.top, bottom: p.bottom, hair: p.hair, skin: p.skin, hairStyle: ti % 2 ? 'short' : 'long' });
    tr.group.position.set(rx - 2 + (si + 2) * 1.05, 0, -7);
    tr.group.rotation.y = Math.PI;
    scene.add(tr.group);
    tr.sit(0.9);
    travelers.push({ tr, ph: ti * 1.7, seated: true });
  });
  // two standing travelers chatting near the kiosk
  for (const [tx, tz, ry] of [[-13.5, 4, 0.8], [-12.6, 4.6, -2.2]]) {
    const p = travelerPalettes[Math.floor(Math.random() * travelerPalettes.length)];
    const tr = makePerson({ top: p.top, bottom: p.bottom, hair: p.hair, skin: p.skin, hairStyle: 'short' });
    tr.group.position.set(tx, 0, tz);
    tr.group.rotation.y = ry;
    scene.add(tr.group);
    travelers.push({ tr, ph: tx, seated: false });
  }

  // walking travelers pulling rolling suitcases — the concourse should feel in motion
  const walkers = [];
  for (let wi = 0; wi < 4; wi++) {
    const wp = travelerPalettes[(wi + 2) % travelerPalettes.length];
    const wtr = makePerson({ top: wp.top, bottom: wp.bottom, hair: wp.hair, skin: wp.skin, hairStyle: wi % 2 ? 'long' : 'short' });
    wtr.group.position.set(-20 + wi * 11, 0, 2.4 - (wi % 2) * 5);
    scene.add(wtr.group);
    // rolling suitcase trailing behind
    const caseCol = [0x3a5f8a, 0x8a3a3a, 0x3a3a3a, 0x6a4a8a][wi];
    const caseM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.52, 0.22), mat(caseCol));
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.03), mat(0x888888));
    handle.position.set(0, 0.42, 0.1);
    caseM.add(handle);
    scene.add(caseM);
    walkers.push({ tr: wtr, caseM, ph: wi * 2.3, dir: wi % 2 ? 1 : -1, lane: 2.4 - (wi % 2) * 5, speed: 1.1 + wi * 0.15 });
  }
  // trash bins + departures kiosk fill the empty concourse middle
  for (const bx of [-8, 6]) {
    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.72, 10), mat(0x4a5568));
    bin.position.set(bx, 0.36, 0.4);
    scene.add(bin);
  }
  const infoKiosk = new THREE.Group();
  const kioskBody = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.7, 0.24), mat(0x2a3444));
  kioskBody.position.y = 0.85;
  infoKiosk.add(kioskBody);
  const depC = document.createElement('canvas');
  depC.width = 256; depC.height = 384;
  const dep = depC.getContext('2d');
  dep.fillStyle = '#10203a';
  dep.fillRect(0, 0, 256, 384);
  dep.fillStyle = '#ffd663';
  dep.font = 'bold 22px Arial';
  dep.textAlign = 'center';
  dep.fillText('DEPARTURES', 128, 34);
  dep.font = '15px Arial';
  dep.textAlign = 'left';
  const rows = [['BA 218', 'LONDON', 'ON TIME'], ['UA 804', 'DENVER', 'BOARDING'], ['AA 1219', 'MIAMI', 'ON TIME'], ['DL 2241', 'ATLANTA', 'DELAYED'], ['UA 352', 'CHICAGO', 'ON TIME'], ['WN 882', 'ORLANDO', 'BOARDING'], ['BA 292', 'LONDON', 'ON TIME'], ['UA 1441', 'HOUSTON', 'ON TIME']];
  rows.forEach((r, i) => {
    const y = 66 + i * 38;
    dep.fillStyle = '#e8ecf2';
    dep.fillText(r[0], 14, y);
    dep.fillText(r[1], 84, y);
    dep.fillStyle = r[2] === 'DELAYED' ? '#ff7a6a' : (r[2] === 'BOARDING' ? '#7ae88a' : '#9ab8d8');
    dep.fillText(r[2], 160, y);
  });
  const depT = new THREE.CanvasTexture(depC);
  depT.colorSpace = THREE.SRGBColorSpace;
  const kioskScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 1.1), new THREE.MeshBasicMaterial({ map: depT }));
  kioskScreen.position.set(0, 1.0, 0.13);
  infoKiosk.add(kioskScreen);
  const kioskScreen2 = kioskScreen.clone();
  kioskScreen2.rotation.y = Math.PI;
  kioskScreen2.position.z = -0.13;
  infoKiosk.add(kioskScreen2);
  infoKiosk.position.set(0, 0, -1.5);
  scene.add(infoKiosk);


    // a jet taking off beyond the windows, looping — the reason airports feel alive
  const jet = new THREE.Group();
  const jfus = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 4.5, 6, 10), mat(0xdfe4ea));
  jfus.rotation.z = Math.PI / 2;
  jet.add(jfus);
  const jwing = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 4.4), mat(0xc8ccd4));
  jet.add(jwing);
  const jtail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 1.4), mat(0x3a5a9a));
  jtail.position.set(-2.2, 0.6, 0);
  jet.add(jtail);
  jet.scale.setScalar(1.6);
  scene.add(jet);

// curved-roof hint: a series of white arches overhead (Dulles' iconic curve)
  for (let i = -3; i <= 3; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 24, Math.PI), mat(0xe8ecf2));
    arch.position.set(i * 8, 0, 0);
    arch.rotation.y = Math.PI / 2;
    arch.scale.y = 0.5;
    scene.add(arch);
  }

  // ceiling slab + glowing light strips (instant airport feel)
  const ceilSlab = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 26), mat(0x2c3242));
  ceilSlab.position.y = 7;
  scene.add(ceilSlab);
  for (const lz of [-6, 0, 6]) {
    for (let lx = -26; lx <= 26; lx += 4) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.8), new THREE.MeshBasicMaterial({ color: 0xfff4dc }));
      strip.position.set(lx, 6.8, lz);
      scene.add(strip);
    }
  }
  const hallGlow = new THREE.PointLight(0xfff0d8, 30, 40, 1.2);
  hallGlow.position.set(0, 5.5, 0);
  scene.add(hallGlow);

  // ===== REAL DULLES MATCH: Saarinen's signature curved roof + angled columns =====
  // the leaning columns holding the catenary roof — the most recognizable thing at IAD
  for (let cx = -27; cx <= 27; cx += 6) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 9.5, 0.55), mat(0x8a8078));
    col.position.set(cx, 4.75, -12.2);
    col.rotation.x = 0.22;
    scene.add(col);
    const colIn = new THREE.Mesh(new THREE.BoxGeometry(0.55, 9.5, 0.55), mat(0x8a8078));
    colIn.position.set(cx, 4.75, 12.2);
    colIn.rotation.x = -0.22;
    scene.add(colIn);
  }
  // the swooping curved ceiling — segments sag between columns like the real catenary slab
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x9a9288 });
  for (let rx = -27; rx <= 27; rx += 6) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 6, 10, 1, true, Math.PI, Math.PI), roofMat);
    seg.rotation.z = Math.PI / 2;
    seg.rotation.y = Math.PI / 2;
    seg.position.set(rx - 3, 8.2, 0);
    seg.scale.set(1, 1, 3.4);
    scene.add(seg);
  }
  // united gate signage — dulles is a united hub
  function iadGateSign(text, x, z) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#002244';
    x2.fillRect(0, 0, 256, 128);
    x2.fillStyle = '#ffffff';
    x2.font = 'bold 44px Arial';
    x2.textAlign = 'center';
    x2.fillText(text, 128, 58);
    x2.font = '22px Arial';
    x2.fillStyle = '#8ab4e8';
    x2.fillText('UNITED', 128, 94);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, 4.6, z);
    scene.add(m);
  }
  iadGateSign('C14', -12, -12.4);
  iadGateSign('C16', -4, -12.4);
  iadGateSign('C18', 4, -12.4);
  iadGateSign('D22', 12, -12.4);

  // window wall (north, -z): glass panels with snowy airfield beyond
  const windowWall = new THREE.Mesh(new THREE.BoxGeometry(60, 7, 0.3), new THREE.MeshLambertMaterial({ color: 0x6f87a8, transparent: true, opacity: 0.35 }));
  windowWall.position.set(0, 3.5, -12.8);
  scene.add(windowWall);
  solid(windowWall);
  // mullions
  for (let x = -28; x <= 28; x += 4) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.25, 7, 0.4), mat(0x39404f));
    mull.position.set(x, 3.5, -12.8);
    scene.add(mull);
  }
  // snow field outside + a parked plane silhouette
  const field = new THREE.Mesh(new THREE.BoxGeometry(90, 0.1, 30), mat(0xf2f5fa));
  field.position.set(0, -0.05, -28);
  scene.add(field);
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 12, 12), mat(0xd7dbe2));
  fus.rotation.z = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.3), mat(0x2f4d8f));
  tail.position.set(-5.6, 1.8, 0);
  plane.add(fus, tail);
  plane.position.set(-12, 1.2, -24);
  scene.add(plane);

  // back wall (south) with signage
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 7, 0.3), mat(0x3c4356));
  backWall.position.set(0, 3.5, 12.8);
  scene.add(backWall);
  solid(backWall);
  // east/west walls
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 26), mat(0x454c60));
    w.position.set(sx * 29.8, 3.5, 0);
    scene.add(w);
    solid(w);
  }

  // signage texture helper
  function textSign(text, w = 6, h = 1.2, bg = '#182130', fg = '#ffd663', font = 54) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = Math.round(512 * h / w);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = fg;
    ctx.font = `bold ${font}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  }

  const sign = textSign('Washington Dulles International', 12, 1.4);
  sign.position.set(0, 5.4, 12.55);
  sign.rotation.y = Math.PI;
  scene.add(sign);

  const gateSign = textSign('Gates C1–C30  →', 5, 1, '#182130', '#ffffff');
  gateSign.position.set(-12, 4.6, 12.55);
  gateSign.rotation.y = Math.PI;
  scene.add(gateSign);

  const bagSign = textSign('← Baggage Claim', 5, 1, '#182130', '#ffffff');
  bagSign.position.set(12, 4.6, 12.55);
  bagSign.rotation.y = Math.PI;
  scene.add(bagSign);

  // ceiling with glowing light strips
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 26), mat(0xd4d9e4));
  ceil.position.y = 7;
  scene.add(ceil);
  for (let x = -26; x <= 26; x += 6.5) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 24), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
    strip.position.set(x, 6.82, 0);
    scene.add(strip);
    const pl = new THREE.PointLight(0xfff0d0, 8, 18);
    pl.position.set(x, 6.2, 0);
    scene.add(pl);
  }

  // departures board: flipping-flight-info look
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512; boardCanvas.height = 256;
  const bctx = boardCanvas.getContext('2d');
  bctx.fillStyle = '#101418';
  bctx.fillRect(0, 0, 512, 256);
  bctx.font = 'bold 24px monospace';
  const flights = [
    ['BA292  LONDON', 'ON TIME', '#50ff70'],
    ['UA847  CHICAGO', 'BOARDING', '#ffd663'],
    ['DL1102 ATLANTA', 'DELAYED', '#ff6060'],
    ['AA2058 DALLAS', 'ON TIME', '#50ff70'],
    ['WN664  BALTIMORE', 'BOARDING', '#ffd663'],
  ];
  flights.forEach(([f, st, c], i) => {
    bctx.fillStyle = '#e8e8e8';
    bctx.fillText(f, 24, 44 + i * 44);
    bctx.fillStyle = c;
    bctx.fillText(st, 340, 44 + i * 44);
  });
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(6, 4.2, 12.55);
  board.rotation.y = Math.PI;
  scene.add(board);

  // coffee kiosk mid-terminal
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2), mat(0x7a4a2a));
  kiosk.position.set(-16, 1.2, 6);
  scene.add(kiosk);
  solid(kiosk);
  const kioskSign = textSign('POTOMAC COFFEE', 3, 0.7, '#3a2a1a', '#ffd663', 44);
  kioskSign.position.set(-16, 2.9, 6);
  scene.add(kioskSign);

  // seating rows: banks of blue airport chairs
  for (const rowX of [-9, 0, 9]) {
    for (let i = 0; i < 5; i++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0x24448f));
      seat.scale.set(1, 0.9, 0.9);
      seat.position.set(rowX - 2 + i * 1.05, 0.45, -7);
      scene.add(seat);
    }
    const rowBound = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1, 1), mat(0x24448f));
    rowBound.position.set(rowX, 0.5, -7);
    rowBound.visible = false;
    scene.add(rowBound);
    solid(rowBound);
  }

  // check-in counters on the east side
  for (let i = 0; i < 3; i++) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 1.4), mat(0xb8bcc8));
    counter.position.set(24, 0.6, -4 + i * 4);
    scene.add(counter);
    solid(counter);
  }

  // THE TV: wall-mounted, playing Churchill vs Wooton
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 512; tvCanvas.height = 288;
  const tvCtx = tvCanvas.getContext('2d');
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: tvTex }));
  tv.position.set(-6, 3.4, 12.5);
  tv.rotation.y = Math.PI;
  scene.add(tv);
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.2, 0.15), mat(0x111111));
  tvFrame.position.set(-6, 3.4, 12.58);
  scene.add(tvFrame);
  let tvTimer = 0;
  function drawTV(t) {
    tvCtx.fillStyle = '#0d3311';
    tvCtx.fillRect(0, 0, 512, 288);
    // football field lines
    tvCtx.strokeStyle = '#ffffff';
    tvCtx.lineWidth = 2;
    for (let x = 40; x < 512; x += 55) {
      tvCtx.beginPath(); tvCtx.moveTo(x, 40); tvCtx.lineTo(x, 248); tvCtx.stroke();
    }
    // the game itself: red churchill vs blue wooton, a live drive downfield
    const playT = t % 14;
    const ballX = 60 + (playT / 14) * 400;
    for (let i = 0; i < 5; i++) {
      // offense (red) clustered around the ball carrier
      const ox = ballX - 20 + Math.sin(t * 2.1 + i * 2.4) * 26 + i * 9;
      const oy = 80 + i * 34 + Math.cos(t * 1.7 + i) * 12;
      tvCtx.fillStyle = '#c03030';
      tvCtx.beginPath(); tvCtx.arc(Math.max(20, Math.min(492, ox)), Math.max(48, Math.min(240, oy)), 7, 0, Math.PI * 2); tvCtx.fill();
      // defense (blue) chasing from behind/right
      const dx = ballX + 24 + Math.cos(t * 2.3 + i * 1.9) * 24 - i * 7;
      const dy = 90 + i * 30 + Math.sin(t * 1.9 + i * 1.3) * 12;
      tvCtx.fillStyle = '#3050c0';
      tvCtx.beginPath(); tvCtx.arc(Math.max(20, Math.min(492, dx)), Math.max(48, Math.min(240, dy)), 7, 0, Math.PI * 2); tvCtx.fill();
    }
    // ball carrier highlight
    tvCtx.fillStyle = '#ff5050';
    tvCtx.beginPath(); tvCtx.arc(Math.min(492, ballX), 144 + Math.sin(t * 3) * 10, 8, 0, Math.PI * 2); tvCtx.fill();
    tvCtx.strokeStyle = '#ffe060';
    tvCtx.lineWidth = 2;
    tvCtx.beginPath(); tvCtx.arc(Math.min(492, ballX), 144 + Math.sin(t * 3) * 10, 11, 0, Math.PI * 2); tvCtx.stroke();
    const __nowMs = performance.now();
    if (window.__texLast && __nowMs - window.__texLast < 66) { /* throttle texture upload */ } else {
    window.__texLast = __nowMs;
    // scoreboard
    tvCtx.fillStyle = '#000000cc';
    tvCtx.fillRect(96, 8, 320, 44);
    tvCtx.fillStyle = '#ffd663';
    tvCtx.font = 'bold 26px Georgia';
    tvCtx.textAlign = 'center';
    const c = 10 + Math.floor(Math.sin(t * 0.3) * 3 + 3);
    const w = 7 + Math.floor(Math.cos(t * 0.23) * 3 + 3);
    tvCtx.fillText(`CHURCHILL ${c} — WOOTON ${w}`, 256, 30);
    tvCtx.fillStyle = '#ffffff';
    tvCtx.font = 'italic 20px Georgia';
    tvCtx.fillText('THE BIG GAME — live', 256, 272);
    tvTex.needsUpdate = true;
    }
  }
  drawTV(0);

  // players (dot players) on the TV field are just moving noise — skip for perf

  // snow particles outside
  const snowGeo = new THREE.BufferGeometry();
  const snowCount = 600;
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 80;
    snowPos[i * 3 + 1] = Math.random() * 12;
    snowPos[i * 3 + 2] = -14 - Math.random() * 25;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  scene.add(snow);

  // warmth pass: soft warm pools of light down the concourse
  for (const lx of [-14, 0, 14]) {
    const pl = new THREE.PointLight(0xffe2b8, 22, 22);
    pl.position.set(lx, 5.6, 0);
    scene.add(pl);
  }

  // ---- density pass: detailed seating, gate counters, ads, travelers ----
  function seatRow(x, z, count, facing = 1) {
    const grp = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const seat = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.6), mat(0x24448f));
      base.position.y = 0.48;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.09), mat(0x24448f));
      back.position.set(0, 0.82, -0.26 * facing);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.44, 0.08), mat(0x2a2e3a));
      legs.position.y = 0.22;
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.55), mat(0x1a1e28));
      armL.position.set(-0.31, 0.56, 0);
      const armR = armL.clone();
      armR.position.x = 0.31;
      seat.add(base, back, legs, armL, armR);
      seat.position.x = i * 0.68;
      if (facing < 0) seat.rotation.y = Math.PI;
      grp.add(seat);
    }
    grp.position.set(x, 0, z);
    scene.add(grp);
    return grp;
  }
  // rows facing each other across the concourse
  seatRow(-14, -6.5, 8, 1);
  seatRow(-14, -4.2, 8, -1);
  seatRow(2, -6.5, 8, 1);
  seatRow(2, -4.2, 8, -1);
  seatRow(-6, 3.5, 7, 1);
  seatRow(8, 3.5, 7, 1);

  // gate podium counters along the window
  for (const gx of [-18, 6, 20]) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, 0.6), mat(0x39404f));
    counter.position.set(gx, 0.55, -10.5);
    scene.add(counter);
    const screen = textSign('C' + (8 + Math.floor(Math.random() * 20)), 1.2, 0.8, '#101826', '#7fd0ff', 90);
    screen.position.set(gx, 2.6, -10.5);
    scene.add(screen);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), mat(0x2a2e3a));
    pole.position.set(gx, 1.4, -10.5);
    scene.add(pole);
  }

  // glowing ad lightboxes on the south wall
  function lightbox(x, title, color1, color2) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 384;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 384);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 30px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(title, 128, 340);
    const tex = new THREE.CanvasTexture(c);
    const boxM = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.7, 0.18), new THREE.MeshBasicMaterial({ map: tex }));
    boxM.position.set(x, 2.2, 12.55);
    scene.add(boxM);
  }
  lightbox(-18, 'YO YOGI', '#d04030', '#701810');
  lightbox(-10, 'MoCo', '#2a5a8a', '#102a4a');
  lightbox(16, 'swap.season', '#7a4a8a', '#2a1a3a');

  // travelers with roller bags
  function rollerBag(parent, x, z, color) {
    const bag = new THREE.Group();
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), mat(color));
    bodyM.position.y = 0.36;
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), mat(0x888888));
    handle.position.set(0, 0.85, -0.1);
    handle.rotation.x = 0.3;
    const w1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), mat(0x111111));
    w1.position.set(-0.12, 0.05, 0);
    const w2 = w1.clone();
    w2.position.x = 0.12;
    bag.add(bodyM, handle, w1, w2);
    bag.position.set(x, 0, z);
    parent.add(bag);
    return bag;
  }

  // a few static travelers waiting at seats/windows
  const staticLooks = [
    { x: -12, z: -5.4, top: 0x8a4a5a, hair: 0x2a1a12, hairStyle: 'long', skin: 0xd8a878, sitz: true },
    { x: 3.4, z: -5.4, top: 0x3a4a6a, hair: 0x14100c, hairStyle: 'short', skin: 0x8a5a3a },
    { x: 15, z: -9.5, top: 0x777770, hair: 0x54382a, hairStyle: 'receding', skin: 0xe0b088, bagColor: 0x8a2f2f },
    { x: -20, z: 1, top: 0x4a6a4a, hair: 0x0e0c0a, hairStyle: 'curly', skin: 0xb87a50, bagColor: 0x2c3140 },
  ];
  for (const look of staticLooks) {
    const p = makePerson(look);
    p.group.position.set(look.x, 0, look.z);
    p.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(p.group);
    if (look.bagColor) rollerBag(scene, look.x + 0.6, look.z + 0.2, look.bagColor);
  }

  // planter greenery near the center
  for (const px of [-3, 14]) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.55, 10), mat(0x8a8078));
    pot.position.set(px, 0.28, 6.5);
    scene.add(pot);
    for (let li = 0; li < 5; li++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.9, 6), mat(0x2a6a3a));
      const ang = (li / 5) * Math.PI * 2;
      leaf.position.set(px + Math.cos(ang) * 0.15, 1.0, 6.5 + Math.sin(ang) * 0.15);
      leaf.rotation.z = Math.cos(ang) * 0.4;
      leaf.rotation.x = Math.sin(ang) * 0.4;
      scene.add(leaf);
    }
  }

  // --- wayfinding signage: hanging airport signs so navigation is readable ---
  function hangingSign(text, x, z, ry = 0) {
    const cnv = document.createElement('canvas');
    cnv.width = 512; cnv.height = 128;
    const cx2 = cnv.getContext('2d');
    cx2.fillStyle = '#1a2332';
    cx2.fillRect(0, 0, 512, 128);
    cx2.strokeStyle = '#3a4a62';
    cx2.lineWidth = 6;
    cx2.strokeRect(4, 4, 504, 120);
    cx2.font = 'bold 52px Arial';
    cx2.textAlign = 'center';
    cx2.fillStyle = '#f0e8c8';
    cx2.fillText(text, 256, 84);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const grp = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 0.08), new THREE.MeshBasicMaterial({ map: tex }));
    grp.add(panel);
    for (const wx of [-1.4, 1.4]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 6), mat(0x444a55));
      wire.position.set(wx, 1.2, 0);
      grp.add(wire);
    }
    grp.position.set(x, 5.2, z);
    grp.rotation.y = ry;
    scene.add(grp);
  }
  hangingSign('BAGGAGE CLAIM →', 10, 8, -0.5);
  hangingSign('← GATES C', -8, 2, 0.4);
  hangingSign('BAGGAGE CLAIM →', 13, 11, -0.2);

  // player: Christian, arriving near baggage claim
  // --- richness pass: columns with holiday wreaths, hanging garlands, coffee kiosk, extra seating ---
  function wreath(x, z, y) {
    const w = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.13, 8, 18), mat(0x1f5c2e));
    w.add(ring);
    for (let i = 0; i < 8; i++) {
      const ba = (i / 8) * Math.PI * 2;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat(0xc02030));
      berry.position.set(Math.cos(ba) * 0.45, Math.sin(ba) * 0.45, 0.12);
      w.add(berry);
    }
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), mat(0xd02038));
    bow.position.set(0, -0.52, 0.1);
    w.add(bow);
    w.position.set(x, y, z);
    scene.add(w);
  }
  // structural columns down the hall with wreaths
  for (const cx of [-18, -6, 6, 18]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 7, 12), mat(0xb8bcc8));
    col.position.set(cx, 3.5, 6.5);
    scene.add(col);
    wreath(cx, 6.0, 3.4);
    bounds.push({ minX: cx - 0.5, maxX: cx + 0.5, minZ: 6.0, maxZ: 7.0 });
  }
  // coffee cafe mid-hall with lit sign
  const cafe = new THREE.Group();
  const kbase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.4), mat(0x5a3c28));
  kbase.position.y = 0.55;
  cafe.add(kbase);
  const ktop = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.1, 1.7), mat(0x2e1e14));
  ktop.position.y = 1.14;
  cafe.add(ktop);
  const kCanv = document.createElement('canvas');
  kCanv.width = 256; kCanv.height = 64;
  const kc = kCanv.getContext('2d');
  kc.fillStyle = '#241408'; kc.fillRect(0, 0, 256, 64);
  kc.font = 'bold 20px Georgia'; kc.fillStyle = '#ffd98a'; kc.textAlign = 'center';
  kc.fillText('POTOMAC ROAST', 128, 42);
  const kTex = new THREE.CanvasTexture(kCanv);
  kTex.colorSpace = THREE.SRGBColorSpace;
  const ksign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshBasicMaterial({ map: kTex }));
  ksign.position.set(0, 2.2, 0);
  cafe.add(ksign);
  const kpost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), mat(0x333));
  // cups on counter
  for (const cx of [-0.8, -0.3, 0.4]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8), mat(0xf0ece2));
    cup.position.set(cx, 1.25, 0.3);
    cafe.add(cup);
  }
  cafe.position.set(-2, 0, -3.5);
  scene.add(cafe);
  const klight = new THREE.PointLight(0xffd890, 6, 7);
  klight.position.set(-2, 2.4, -3.5);
  scene.add(klight);
  bounds.push({ minX: -3.5, maxX: -0.5, minZ: -4.4, maxZ: -2.6 });
  // extra seating rows facing the windows
  for (const sx of [14, 22, -14]) {
    for (let si = 0; si < 4; si++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.5, 0.6), mat(0x24355e));
      seat.position.set(sx + si * 0.75, 0.28, -7.5);
      scene.add(seat);
      const sback = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.65, 0.12), mat(0x1d2c4e));
      sback.position.set(sx + si * 0.75, 0.68, -7.85);
      scene.add(sback);
    }
    bounds.push({ minX: sx - 0.4, maxX: sx + 2.9, minZ: -8.1, maxZ: -7.1 });
  }
  const christian = makePerson({
    photo: faces.christian, top: 0x5a6b42, bottom: 0x3a3a44, hair: 0x6a4a2e, hairStyle: 'short', jacket: true, skin: 0xe0b088,
  });
  christian.group.position.set(1.5, 0, 2);
  christian.group.rotation.y = 0;
  christian.group.rotation.y = Math.PI;
  scene.add(christian.group);

  // a couple of background travelers walking with rolling bags
  const npcs = [];
  for (let i = 0; i < 4; i++) {
    const n = makePerson({ top: [0x7a4a4a, 0x4a7a5a, 0x5a4a7a, 0x777770][i], bottom: 0x333340, hair: [0x2a1a12, 0x54382a, 0x14100c, 0x8a6a3a][i], hairStyle: i % 2 ? 'long' : 'short', skin: [0xe8c098, 0xb87a50, 0xd8a878, 0x8a5a3a][i], height: [0.95, 1.04, 0.98, 1.0][i] });
    n.group.position.set(-20 + i * 9, 0, 3 - (i % 2) * 5);
    scene.add(n.group);
    npcs.push({ p: n, dir: i % 2 ? 1 : -1, speed: 1 + Math.random() });
  }
  // three more travelers crossing the hall at different depths
  for (let i = 0; i < 3; i++) {
    const n = makePerson({ top: [0x8a6a3a, 0x3a6a7a, 0x7a3a5a][i], bottom: 0x333340, hair: [0x2a1a12, 0x14100c, 0x54382a][i], hairStyle: i % 2 ? 'short' : 'long', skin: [0xd8a878, 0xe8c098, 0xb87a50][i] });
    n.group.position.set(-14 + i * 11, 0, 7 - (i % 2) * 3);
    scene.add(n.group);
    npcs.push({ p: n, dir: i % 2 ? -1 : 1, speed: 0.8 + Math.random() });
  }
  // foreground seating bank near the windows so the hall doesn't read empty
  for (const rowX of [-14, 14]) {
    for (let i = 0; i < 4; i++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0x24448f));
      seat.scale.set(1, 0.9, 0.9);
      seat.position.set(rowX - 1.5 + i * 1.05, 0.45, 4.5);
      scene.add(seat);
    }
    const rb = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1, 1), mat(0x24448f));
    rb.position.set(rowX, 0.5, 4.5);
    rb.visible = false;
    scene.add(rb);
    solid(rb);
  }

  const followCam = new FollowCam(camera);
  followCam.setRoom(-29, 29, -11.8, 11.8, 7);
  followCam.snap(christian.group.position);
  const player = new PlayerController(christian, input, [
    ...bounds,
    { minX: -30, maxX: 30, minZ: 12.4, maxZ: 13 },   // back wall
    { minX: -30, maxX: 30, minZ: -13, maxZ: -12.4 }, // window wall
    { minX: 29.4, maxX: 30, minZ: -13, maxZ: 13 },
    { minX: -30, maxX: -29.4, minZ: -13, maxZ: 13 },
  ]);
  const interactions = new Interactions(scene);
  const guide = new GuideMarker(scene);
  guide.setTarget(-6, 10.8);

  // story state
  let phase = 'explore';
  // tv watched, then phone rings.

  interactions.add({
    pos: new THREE.Vector3(-6, 0, 10.8),
    radius: 3.6,
    label: 'Watch TV',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'TV', text: '…and it’s a packed house for the crosstown rivalry — Churchill vs Wooton, THE BIG GAME!' },
        { speaker: 'Christian', text: 'Classic. Half the county is at that game right now.' },
        { speaker: 'TV', text: 'Bulldogs driving down the field — Wooton’s defense is gonna have to dig in…' },
      ]);
      phase = 'phoneSoon';
      guide.clear();
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(24, 0, -4),
    radius: 2.4,
    label: 'Check-in counter',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Agent', text: 'Welcome to Dulles! Flight home for the holidays?' },
        { speaker: 'Christian', text: 'You know it. Back in MoCo for the week.' },
      ]);
      player.frozen = false;
    },
  });

  // coffee at the cafe — a little moment of life
  interactions.add({
    pos: new THREE.Vector3(-2, 0, -3.5), radius: 2.2, label: 'Order a coffee', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'One large coffee, please. It\'s going to be a long day.' },
        { speaker: 'Agent', text: 'Holiday travel, huh? You look like you\'ve got a whole saga ahead of you. Good luck out there.' },
      ]);
      showObjective('☕ coffee acquired. Warmth +10.', 2500);
      player.frozen = false;
    },
  });

  // the pilot — uniformed, waiting by the windows with his roller bag
  const pilot = makePerson({
    photo: faces.pilot, top: 0x1c2a4a, bottom: 0x14181f, hair: 0x3a2e22, hairStyle: 'short', skin: 0xe0b090, name: 'The Pilot',
  });
  pilot.group.position.set(20, 0, -8);
  pilot.group.rotation.y = Math.PI * 0.8;
  scene.add(pilot.group);
  // captain hat
  const hat = new THREE.Group();
  const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.09, 12), mat(0x101828));
  const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.155, 0.02, 12), mat(0x0a0e18));
  hatBrim.position.y = -0.045;
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.141, 0.141, 0.025, 12), new THREE.MeshBasicMaterial({ color: 0xd8b040 }));
  hatBand.position.y = -0.02;
  hat.add(hatTop, hatBrim, hatBand);
  hat.position.set(0, 1.79 * 0.95 + 0.09, -8 * 0);
  // attach relative to pilot head instead of world — parent to group
  hat.position.set(0, 1.86, 0);
  pilot.group.add(hat);
  interactions.add({
    pos: new THREE.Vector3(20, 0, -8), radius: 2.4, label: 'The Pilot', once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'The Pilot', text: 'Rough approach in that crosswind, huh? Dulles in December — never a dull moment.' },
        { speaker: 'Christian', text: 'You got us down smooth. Appreciate it, captain.' },
        { speaker: 'The Pilot', text: 'Enjoy the holidays. And drive safe — the 267 is a skating rink tonight.' },
      ]);
      player.frozen = false;
    },
  });

  // exit door trigger — active only after the phone call finishes
  const exitInteract = interactions.add({
    pos: new THREE.Vector3(14, 0, 12),
    radius: 2.6,
    label: 'Head to the car',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Babe never changes. All right — Olivia’s first, then the swap. Let’s roll.' },
      ]);
      // scene transition placeholder: drive scene comes next
      const { driveScene } = await import('./drive.js');
      game.switchScene(driveScene);
    },
  });
  exitInteract.hidden = true;

  const chatter = makeChatter(scene, travelers, ['✈️','🧳','☕','😴','🎄']);
  setTimeout(() => phoneText('Stacy ❤️', 'landed?? tell me you didn&#39;t miss the swap season poster at baggage claim'), 6000);
  showObjective('You just landed at Dulles — follow the gold beacon and catch the game on the terminal TV.', 8000);

  let phoneTimer = -1;
  let elapsed = 0;
  let jetT = 0;


  // collectibles: vintage cameras for Stacy + vinyl records
  const pickups = new Pickups(scene);
  const inv = inventory();
  pickups.add(makeCameraMesh(), -8, -9, 'camera--8--14', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeCameraMesh(), 9, -5, 'camera-9--18', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeRecordMesh(), -12, -6, 'record--12--8', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });
  pickups.add(makeRecordMesh(), 6, -10, 'record-12--12', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });

  // concourse carpet runners — dark blue walking lanes like real terminals
  for (const rz of [-4, 4]) {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(54, 0.03, 1.1), new THREE.MeshStandardMaterial({ color: 0x232e48, roughness: 0.98 }));
    runner.position.set(0, 0.02, rz);
    runner.receiveShadow = true;
    scene.add(runner);
  }

  // scattered luggage near the seating — lived-in terminal feel
  const bagColors = [0x8a3040, 0x2a4a6a, 0x4a4a52, 0x6a5a3a, 0x3a5a4a];
  const bagSpots = [[-8.2, 1.8, 0.3], [1.8, 2.4, -0.2], [9.5, 1.2, 0.5], [-14.5, 5.2, 0.1], [4.5, -3.5, -0.4], [-3.5, -5.8, 0.6], [16.5, -2.5, 0.2]];
  for (let i = 0; i < bagSpots.length; i++) {
    const [bx, bz, br] = bagSpots[i];
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), mat(bagColors[i % bagColors.length]));
    bag.position.set(bx, 0.31, bz);
    bag.rotation.y = br * 3;
    bag.castShadow = true;
    scene.add(bag);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), mat(0x222226));
    handle.position.set(bx, 0.75, bz);
    handle.rotation.y = br * 3;
    scene.add(handle);
  }
  // a few rolling travelers pulling bags
  // (static props only — walkers already animate)

  // vending machine corner + interaction
  const vend = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.8), mat(0x8a2030));
  vend.position.set(-20.5, 1.05, -8);
  scene.add(vend);
  solid(vend);
  const vendGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.4), new THREE.MeshBasicMaterial({ color: 0x2a4a6a }));
  vendGlass.position.set(-20.5, 1.35, -7.55);
  scene.add(vendGlass);
  interactions.add({
    pos: new THREE.Vector3(-20.5, 0, -7.2),
    radius: 2.0,
    label: 'Vending machine',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Four dollars for a water. Airport prices never change.' },
        { speaker: 'Stacy', text: 'Get the pretzels. You always get the pretzels.' },
      ]);
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(0, 0, 10.5),
    radius: 2.6,
    label: 'Check the departure board',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Delayed, delayed, delayed... ours was the only one that landed early. Figures.' },
      ]);
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(14, 0, 2),
    radius: 2.2,
    label: 'Watch the plane',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'There it is. The metal bird that carried me out of LA sunshine and into a Maryland winter.' },
      ]);
      player.frozen = false;
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-9, 0, 8.5),
    radius: 2.0,
    label: 'Overpriced coffee',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Seven dollar coffee. I missed you, east coast. I think.' },
      ]);
      player.frozen = false;
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-16, 0, 3),
    radius: 2.2,
    label: 'People-watch',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Everybody at Dulles is either coming home or leaving it. Guess which one I am.' },
      ]);
      player.frozen = false;
    },
  });

  // parked jet visible through the windows at the gate — big tail fin anchor
  const parked = new THREE.Group();
  const pfus = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 10, 6, 10), mat(0xd8dde4));
  pfus.rotation.z = Math.PI / 2;
  pfus.position.y = 2.2;
  parked.add(pfus);
  const ptail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 1.8), mat(0x2a4a8a));
  ptail.position.set(-5.2, 4.4, 0);
  parked.add(ptail);
  for (const pw of [-1, 1]) {
    const pwing = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 1.4), mat(0xc8ccd4));
    pwing.position.set(0.5, 1.8, pw * 4);
    pwing.rotation.x = pw * 0.12;
    parked.add(pwing);
  }
  const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 8), mat(0x9aa0a8));
  engine.rotation.x = Math.PI / 2;
  engine.position.set(0.8, 1.2, 2.8);
  parked.add(engine);
  parked.position.set(-6, 0, -22);
  parked.rotation.y = 0.15;
  scene.add(parked);
  // jet bridge connecting to it
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2, 7), mat(0x8a8f96));
  bridge.position.set(-3, 2.4, -15.5);
  scene.add(bridge);

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      elapsed += dt;
      player.update(dt);
      if (!this._murmur) {
        this._murmur = null;
        try { this._murmur = positionalLoop({ type: 'noise', freq: 320, x: 0, z: -4, maxDist: 26, gain: 0.05, rate: 4 }); } catch {}
      }
      if (this._murmur) this._murmur.update(player.person.group.position.x, player.person.group.position.z);
      chatter.update(dt);
      pickups.update(dt, christian.group.position);
      guide.update(dt, christian.group.position);
      // jet flyby loop
      jetT += dt;
      const jt = (jetT % 24) / 24;
      jet.position.set(-40 + jt * 95, 2 + jt * jt * 26, -20 - jt * 6);
      jet.rotation.z = 0.12 + jt * 0.2;
      travelers.forEach((tw) => { if (tw.seated) { if (tw.tr.torso) tw.tr.torso.position.y += Math.sin(elapsed * 1.4 + tw.ph) * 0.0004; } else tw.tr.animateIdle(elapsed + tw.ph); });
      walkers.forEach((w) => {
        w.tr.group.position.x += w.dir * w.speed * dt;
        if (w.tr.group.position.x > 22) w.dir = -1;
        if (w.tr.group.position.x < -22) w.dir = 1;
        w.tr.group.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        w.tr.animateWalk(dt, 0.9);
        // suitcase trails a step behind with a little lag sway
        const back = w.dir > 0 ? -0.55 : 0.55;
        w.caseM.position.set(w.tr.group.position.x + back + Math.sin(elapsed * 3 + w.ph) * 0.04, 0.26, w.lane);
      });
      followCam.update(dt, christian.group.position);

      // snow fall
      const pos = snow.geometry.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        pos.array[i * 3 + 1] -= dt * 1.4;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 12;
      }
      pos.needsUpdate = true;

      // npcs pace the concourse
      for (const n of npcs) {
        n.p.group.position.x += n.dir * n.speed * dt;
        if (n.p.group.position.x > 27) n.dir = -1;
        if (n.p.group.position.x < -27) n.dir = 1;
        n.p.group.rotation.y = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        n.p.animateWalk(dt, 0.7);
      }

      // tv refresh a few times a second
      tvTimer += dt;
      if (tvTimer > 0.25) { drawTV(elapsed); tvTimer = 0; }

      // interaction prompt + trigger
      const near = interactions.nearest(christian.group.position);
      const prompt = document.getElementById('interact-prompt');
      if (near && !near.hidden && !player.frozen) {
        prompt.classList.remove('hidden');
        prompt.textContent = 'E';
        if (input.consumeInteract()) {
          if (near.once) near.done = true;
          prompt.classList.add('hidden');
          near.action();
        }
      } else {
        prompt.classList.add('hidden');
      }

      // phone call sequence
      if (phase === 'phoneSoon') {
        if (phoneTimer < 0) phoneTimer = elapsed + 1.5;
        if (elapsed > phoneTimer) {
          phase = 'ringing';
          phoneOverlay('Stacy ❤️', true);
          showObjective('Your phone is ringing — press E to answer.', 0);
        }
      }
      if (phase === 'ringing' && input.consumeInteract()) {
        phase = 'called';
        phoneOverlay('Stacy ❤️', false);
        document.getElementById('objective-banner').classList.add('hidden');
        player.frozen = true;
        (async () => {
          await dialogue.play([
            { speaker: 'Christian', text: 'Hey babe — just landed.' },
            { speaker: 'Stacy', text: 'Babe, finally! Are you coming to the swap later today?' },
            { speaker: 'Christian', text: 'Of course. Headed there now.' },
            { speaker: 'Stacy', text: 'Great — can you swing by Olivia’s? She has a few items she wanted to bring.' },
            { speaker: 'Christian', text: 'No problem.' },
            { speaker: 'Stacy', text: 'Drive safe, it’s snowing! See you at the swap ❤️' },
          ]);
          showObjective('Head to the car — the exit is by baggage claim, on the right.', 6000);
          exitInteract.hidden = false;
          guide.setTarget(14, 12);
          player.frozen = false;
        })();
      }
    },
    dispose() {},
  };
}
