import * as THREE from 'three';
import { positionalLoop } from '../engine/sfx.js';
import { runDJMinigame } from '../engine/djbooth.js';
import { Pickups, phoneText } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { makePerson, playerIdentity } from '../engine/character.js';
import { brickWall, concrete } from '../engine/textures.js';
import { FollowCam, PlayerController, Interactions, showObjective, choice, GuideMarker } from '../engine/core.js';

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

    // designed lighting: warm edison pools down the rack aisles, cool fill from the harbor windows
  for (const [lx2, lz2] of [[-8, -4], [0, -4], [8, -4], [-4, 4], [4, 4]]) {
    const edison = new THREE.PointLight(0xffc887, 2.4, 8, 1.8);
    edison.position.set(lx2, 3.6, lz2);
    scene.add(edison);
  }
  const harborFill = new THREE.DirectionalLight(0x7088b8, 0.3);
  harborFill.position.set(0, 4, -14);
  scene.add(harborFill);
// big open brewery floor: brick walls, industrial windows, string lights
  const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 24), new THREE.MeshStandardMaterial({ map: concrete('#6e6a66', 5, 3.5), roughness: 0.9 }));
  floor.receiveShadow = true;
  scene.add(floor);
  const wallN = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 0.4), new THREE.MeshStandardMaterial({ map: (window.__bw5 ||= brickWall('#7a4436', 5, 1.2)), bumpMap: window.__bw5, bumpScale: 0.8, roughness: 0.95 }));
  wallN.position.set(0, 3, -12);
  scene.add(wallN);
  const wallS = new THREE.Mesh(new THREE.BoxGeometry(34, 6, 0.4), new THREE.MeshStandardMaterial({ map: brickWall('#7a4436', 5, 1.2), roughness: 0.95 }));
  wallS.position.set(0, 3, 12);
  scene.add(wallS);
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 24), new THREE.MeshStandardMaterial({ map: brickWall('#74402f', 3.5, 1.2), roughness: 0.95 }));
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
  // window glass painted with the harbor dusk: water, skyline, lit cranes
  const winCanvas = document.createElement('canvas');
  winCanvas.width = 256; winCanvas.height = 192;
  const wc = winCanvas.getContext('2d');
  const skyG = wc.createLinearGradient(0, 0, 0, 130);
  skyG.addColorStop(0, '#2a3c5c'); skyG.addColorStop(0.7, '#7a4a58'); skyG.addColorStop(1, '#c0724a');
  wc.fillStyle = skyG; wc.fillRect(0, 0, 256, 130);
  // skyline silhouettes
  wc.fillStyle = '#141c2c';
  const heights = [40, 60, 30, 75, 45, 55, 35, 65, 42, 58];
  for (let b = 0; b < 10; b++) wc.fillRect(b * 26, 130 - heights[b], 22, heights[b]);
  // lit windows in skyline
  wc.fillStyle = '#ffd9a0';
  for (let b = 0; b < 40; b++) wc.fillRect(6 + (b * 61) % 240, 96 + (b * 23) % 30, 3, 3);
  // water with shimmer
  const waterG = wc.createLinearGradient(0, 130, 0, 192);
  waterG.addColorStop(0, '#28384e'); waterG.addColorStop(1, '#141e2e');
  wc.fillStyle = waterG; wc.fillRect(0, 130, 256, 62);
  wc.fillStyle = 'rgba(255,190,120,0.5)';
  for (let wsh = 0; wsh < 20; wsh++) wc.fillRect((wsh * 37) % 250, 136 + (wsh * 11) % 50, 14, 2);
  const winTex = new THREE.CanvasTexture(winCanvas);
  winTex.colorSpace = THREE.SRGBColorSpace;
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  for (let i = -3; i <= 3; i++) {
    // each window gets a shifted slice of the vista — no copy-paste repetition
    const slice = winTex.clone();
    slice.needsUpdate = true;
    slice.repeat.set(0.55, 1);
    slice.offset.set((i + 3) * 0.065, 0);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), new THREE.MeshBasicMaterial({ map: slice }));
    win.position.set(i * 4.4, 3.4, -11.78);
    scene.add(win);
    // window mullion frames
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.5, 0.06), mat(0x2a2520));
    frame.position.set(i * 4.4, 3.4, -11.84);
    scene.add(frame);
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.04), mat(0x2a2520));
    mull.position.set(i * 4.4, 3.4, -11.76);
    scene.add(mull);
    const mullH = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 0.04), mat(0x2a2520));
    mullH.position.set(i * 4.4, 3.4, -11.76);
    scene.add(mullH);
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

  // dig-through bins in the open floor — the heart of a real swap: big bins heaped with clothes
  const binPalette = [0xd06060, 0x6080c0, 0x60a060, 0xc0a050, 0x9060b0, 0xe0e0d8, 0x406080, 0xc07040];
  for (const [bx, bz] of [[-2.5, 1.5], [1.5, 2.5], [-4.5, 3.5], [4.5, 0.5]]) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.55, 0.9), mat(0x3a5a8a));
    bin.position.set(bx, 0.28, bz);
    scene.add(bin);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.06, 0.98), mat(0x2a4a7a));
    rim.position.set(bx, 0.56, bz);
    scene.add(rim);
    // heaped clothes spilling over the rim
    for (let hi = 0; hi < 5; hi++) {
      const heap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 6), mat(binPalette[(hi + Math.floor(bx)) % binPalette.length]));
      heap.scale.set(1.1, 0.55, 0.9);
      heap.position.set(bx - 0.4 + (hi % 3) * 0.38, 0.6, bz - 0.2 + Math.floor(hi / 3) * 0.4);
      scene.add(heap);
    }
    // one garment draped over the bin edge
    const draped = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.06), mat(binPalette[(Math.floor(bz) + 3) % binPalette.length]));
    draped.position.set(bx + 0.5, 0.42, bz + 0.44);
    draped.rotation.x = 0.35;
    scene.add(draped);
    bounds.push({ minX: bx - 0.75, maxX: bx + 0.75, minZ: bz - 0.55, maxZ: bz + 0.55 });
  }
  // canvas tote bags dropped on the floor by shoppers
  for (const [tx, tz, tc] of [[-1.5, 4.5, 0xf0e8d8], [3.0, 3.8, 0x8a6a4a], [-6.0, 0.5, 0xd8c8a8]]) {
    const tote = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.15), mat(tc));
    tote.position.set(tx, 0.2, tz);
    tote.rotation.y = tx;
    scene.add(tote);
    for (const hs of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 10, Math.PI), mat(tc));
      strap.position.set(tx + hs * 0.08 * Math.cos(tx), 0.42, tz);
      strap.rotation.y = tx;
      scene.add(strap);
    }
  }

  // brewing tanks in the back corner (it's a brewery)
  for (let i = 0; i < 3; i++) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 14), mat(0xb8bcc4));
    tank.position.set(12.5 + i * 2.6, 1.7, -9.5);
    scene.add(tank);
    bounds.push({ minX: tank.position.x - 1.3, maxX: tank.position.x + 1.3, minZ: -10.8, maxZ: -8.2 });
  }

  // ---- REAL swap season branding + authentic details (swapseason.org) ----
  // the actual logo banner over the entrance wall
  const logoTex = new THREE.TextureLoader().load('assets/swapseason-logo.png');
  logoTex.colorSpace = THREE.SRGBColorSpace;
  const logoBanner = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.2), new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, side: THREE.DoubleSide }));
  logoBanner.position.set(0, 4.4, -10.4);
  scene.add(logoBanner);
  // cream backing so the transparent logo pops against brick
  const logoBack = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 2.5), new THREE.MeshBasicMaterial({ color: 0x241d18 }));
  logoBack.position.set(0, 4.4, -10.45);
  scene.add(logoBack);

  // "more taste less waste" tagline banner — their real tagline, cream on forest green
  const tagC = document.createElement('canvas');
  tagC.width = 1024; tagC.height = 128;
  const tg = tagC.getContext('2d');
  tg.fillStyle = '#1e3828';
  tg.fillRect(0, 0, 1024, 128);
  tg.fillStyle = '#f2ead8';
  tg.font = 'italic bold 64px Georgia';
  tg.textAlign = 'center';
  tg.fillText('more taste, less waste', 512, 86);
  const tagT = new THREE.CanvasTexture(tagC);
  tagT.colorSpace = THREE.SRGBColorSpace;
  const tagBanner = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 0.7), new THREE.MeshBasicMaterial({ map: tagT }));
  tagBanner.position.set(-10, 3.9, -10.4);
  scene.add(tagBanner);

  // welcome/check-in table by the entrance: sign-in sheet, the 10-item-max rule — real swap mechanics
  const checkin = new THREE.Group();
  const ciTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.9), mat(0x8a6a4a));
  ciTop.position.y = 0.85;
  checkin.add(ciTop);
  for (const [lx, lz] of [[-1, -0.35], [1, -0.35], [-1, 0.35], [1, 0.35]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.85, 0.07), mat(0x5a4a3a));
    leg.position.set(lx, 0.42, lz);
    checkin.add(leg);
  }
  // welcome sign on the table
  const welC = document.createElement('canvas');
  welC.width = 256; welC.height = 340;
  const wc2 = welC.getContext('2d');
  wc2.fillStyle = '#f2ead8';
  wc2.fillRect(0, 0, 256, 340);
  wc2.fillStyle = '#1e3828';
  wc2.font = 'bold 34px Georgia';
  wc2.textAlign = 'center';
  wc2.fillText('WELCOME!', 128, 52);
  wc2.font = '22px Georgia';
  wc2.fillText('swap season', 128, 90);
  wc2.fillText('—', 128, 116);
  wc2.fillText('10 items max', 128, 156);
  wc2.fillText('clean + damage-free', 128, 190);
  wc2.fillText('take what you love', 128, 224);
  wc2.fillText('leave what you don\'t', 128, 258);
  const welT = new THREE.CanvasTexture(welC);
  welT.colorSpace = THREE.SRGBColorSpace;
  const welSign = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.73), new THREE.MeshBasicMaterial({ map: welT, side: THREE.DoubleSide }));
  welSign.position.set(0.5, 1.35, 0);
  welSign.rotation.x = -0.15;
  checkin.add(welSign);
  // clipboard sign-in sheet
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.4), mat(0xb88a5a));
  clip.position.set(-0.5, 0.9, 0);
  checkin.add(clip);
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  sheet.rotation.x = -Math.PI / 2;
  sheet.position.set(-0.5, 0.915, 0);
  checkin.add(sheet);
  checkin.position.set(-13, 0, 7.5);
  checkin.rotation.y = 0.5;
  scene.add(checkin);
  bounds.push({ minX: -14.4, maxX: -11.6, minZ: 6.6, maxZ: 8.4 });

  // THE CURATED RACK — their real premium section: gold-accented rack with tagged items
  const curated = new THREE.Group();
  const cBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 8), mat(0xc8a040));
  cBar.rotation.z = Math.PI / 2;
  cBar.position.y = 1.7;
  curated.add(cBar);
  for (const lx of [-1.6, 1.6]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.7, 8), mat(0xc8a040));
    leg.position.set(lx, 0.85, 0);
    curated.add(leg);
  }
  const vintageColors = [0x8a2a3a, 0x2a4a6a, 0x6a5a2a, 0x4a2a5a, 0x2a5a4a, 0xaa6a3a];
  const curatedTypes = ['coat', 'dress', 'coat', 'dress', 'coat', 'dress'];
  for (let i = 0; i < 6; i++) {
    const item = makeGarment(vintageColors[i], curatedTypes[i]);
    item.position.set(-1.4 + i * 0.56, 1.66, 0);
    item.rotation.y = (Math.random() - 0.5) * 0.2;
    curated.add(item);
    // little white price/name tag — real curated-rack detail (labeled with your name)
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    tag.position.set(-1.4 + i * 0.56 + 0.12, 1.45, 0.06);
    tag.rotation.z = 0.3;
    curated.add(tag);
  }
  // curated rack sign
  const curC = document.createElement('canvas');
  curC.width = 512; curC.height = 128;
  const cx2 = curC.getContext('2d');
  cx2.fillStyle = '#1a1a1a';
  cx2.fillRect(0, 0, 512, 128);
  cx2.strokeStyle = '#c8a040';
  cx2.lineWidth = 6;
  cx2.strokeRect(4, 4, 504, 120);
  cx2.fillStyle = '#e8c860';
  cx2.font = 'bold 44px Georgia';
  cx2.textAlign = 'center';
  cx2.fillText('THE CURATED RACK', 256, 56);
  cx2.font = 'italic 26px Georgia';
  cx2.fillText('vintage + high-end — labeled pieces', 256, 98);
  const curT = new THREE.CanvasTexture(curC);
  curT.colorSpace = THREE.SRGBColorSpace;
  const curSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: curT, side: THREE.DoubleSide }));
  curSign.position.y = 2.35;
  curated.add(curSign);
  curated.position.set(10.5, 0, -4);
  curated.rotation.y = -0.5;
  scene.add(curated);
  bounds.push({ minX: 8.6, maxX: 12.4, minZ: -5.2, maxZ: -2.8 });

  // MATCHA POP-UP — their real collab detail: little green drink cart
  const matcha = new THREE.Group();
  const cart = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.8), mat(0xf2ead8));
  cart.position.y = 0.48;
  matcha.add(cart);
  const cartTop = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.9), mat(0x5a7a4a));
  cartTop.position.y = 0.98;
  matcha.add(cartTop);
  const matC = document.createElement('canvas');
  matC.width = 256; matC.height = 128;
  const mx = matC.getContext('2d');
  mx.fillStyle = '#5a7a4a';
  mx.fillRect(0, 0, 256, 128);
  mx.fillStyle = '#f2ead8';
  mx.font = 'bold 42px Georgia';
  mx.textAlign = 'center';
  mx.fillText('MATCHA', 128, 58);
  mx.font = '24px Georgia';
  mx.fillText('pop-up', 128, 95);
  const matT = new THREE.CanvasTexture(matC);
  matT.colorSpace = THREE.SRGBColorSpace;
  const matSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: matT }));
  matSign.position.set(0, 0.5, 0.41);
  matcha.add(matSign);
  // matcha cups on top — little green lattes
  for (let ci2 = 0; ci2 < 4; ci2++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8), mat(0x9ac06a));
    cup.position.set(-0.5 + ci2 * 0.33, 1.07, 0);
    matcha.add(cup);
  }
  matcha.position.set(-5, 0, 7.8);
  matcha.rotation.y = -0.3;
  scene.add(matcha);
  bounds.push({ minX: -6.2, maxX: -3.8, minZ: 7.0, maxZ: 8.6 });

  // partner posters on the wall — reunion + echostage, the kind of cross-promo real events do
  function poster(cfg, x, y, z, ry2) {
    const pc = document.createElement('canvas');
    pc.width = 256; pc.height = 384;
    const pctx = pc.getContext('2d');
    if (cfg.grad) {
      const pg = pctx.createLinearGradient(0, 0, 0, 384);
      pg.addColorStop(0, cfg.grad[0]); pg.addColorStop(1, cfg.grad[1]);
      pctx.fillStyle = pg;
    } else pctx.fillStyle = cfg.bg;
    pctx.fillRect(0, 0, 256, 384);
    pctx.fillStyle = cfg.fg;
    pctx.textAlign = 'center';
    pctx.font = 'bold 44px Georgia';
    pctx.fillText(cfg.title, 128, 170);
    pctx.font = 'italic 22px Georgia';
    pctx.fillText(cfg.sub, 128, 212);
    if (cfg.sub2) { pctx.font = '18px Arial'; pctx.fillText(cfg.sub2, 128, 248); }
    const pt = new THREE.CanvasTexture(pc);
    pt.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.5), new THREE.MeshBasicMaterial({ map: pt }));
    pm.position.set(x, y, z);
    pm.rotation.y = ry2;
    scene.add(pm);
  }
  poster({ grad: ['#ff7a4a', '#c04080'], fg: '#fff8ee', title: 'REUNION', sub: 'festival x wellness', sub2: '@experiencereunion' }, -15.8, 2.2, 2, Math.PI / 2);
  poster({ bg: '#0a0a14', fg: '#40e8ff', title: 'ECHOSTAGE', sub: 'dc nightlife', sub2: 'after the swap?' }, -15.8, 2.2, 4.4, Math.PI / 2);

  // mirror corner — swaps always need somewhere to check the fit
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.08), mat(0xc8a040));
  mirrorFrame.position.set(15.8, 1.35, -1);
  mirrorFrame.rotation.y = -Math.PI / 4;
  scene.add(mirrorFrame);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), new THREE.MeshStandardMaterial({ color: 0xbfd4de, roughness: 0.05, metalness: 0.9 }));
  mirror.position.set(15.76, 1.35, -0.96);
  mirror.rotation.y = -Math.PI / 4;
  scene.add(mirror);

  // folding tables with stacked folded clothes — how real swaps handle the overflow
  for (const [fx, fz, fr] of [[-8, 6.5, 0.2], [3, 6.8, -0.15]]) {
    const ftable = new THREE.Group();
    const ftop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 1.0), mat(0xd8d0c0));
    ftop.position.y = 0.78;
    ftable.add(ftop);
    for (const [lx, lz] of [[-1.1, -0.4], [1.1, -0.4], [-1.1, 0.4], [1.1, 0.4]]) {
      const fleg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.78, 0.05), mat(0x888888));
      fleg.position.set(lx, 0.39, lz);
      ftable.add(fleg);
    }
    // folded stacks
    for (let si = 0; si < 5; si++) {
      const foldPalette = [0xc0526a, 0x5a8ac0, 0xe8e0d0, 0x7ab06a, 0x9a6ac0, 0xd0d0d0];
      const col = foldPalette[Math.floor(Math.random() * foldPalette.length)];
      const stackH = 2 + Math.floor(Math.random() * 3);
      for (let sj = 0; sj < stackH; sj++) {
        const folded = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.3), mat(col));
        folded.position.set(-0.9 + si * 0.45, 0.84 + sj * 0.055, (Math.random() - 0.5) * 0.2);
        folded.rotation.y = (Math.random() - 0.5) * 0.2;
        ftable.add(folded);
      }
    }
    ftable.position.set(fx, 0, fz);
    ftable.rotation.y = fr;
    scene.add(ftable);
    bounds.push({ minX: fx - 1.4, maxX: fx + 1.4, minZ: fz - 0.7, maxZ: fz + 0.7 });
  }

  // section signs over the main racks — real swaps sort by type
  function sectionSign(text, x, z) {
    const sc = document.createElement('canvas');
    sc.width = 256; sc.height = 96;
    const sx = sc.getContext('2d');
    sx.fillStyle = '#f2ead8';
    sx.fillRect(0, 0, 256, 96);
    sx.fillStyle = '#1e3828';
    sx.font = 'bold 44px Georgia';
    sx.textAlign = 'center';
    sx.fillText(text, 128, 62);
    const st = new THREE.CanvasTexture(sc);
    st.colorSpace = THREE.SRGBColorSpace;
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.41), new THREE.MeshBasicMaterial({ map: st, side: THREE.DoubleSide }));
    sm.position.set(x, 2.45, z);
    scene.add(sm);
    // hanging wires up to the ceiling — real swap signage hangs
    for (const wx of [-0.45, 0.45]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 3.2, 4), mat(0x222222));
      wire.position.set(x + wx, 4.25, z);
      scene.add(wire);
    }
  }
  sectionSign('TOPS', -8, -4);
  sectionSign('BOTTOMS', -1, -4);
  sectionSign('DRESSES', 6, -4);
  sectionSign('COATS', -8, 2);
  sectionSign('VINTAGE', -1, 2);
  sectionSign('ACCESSORIES', 6, 2);


  // garment generator: hanger hook + shaped clothing (shirt with sleeves, flared dress, lapelled coat)
  function makeGarment(color, type) {
    const gm = new THREE.Group();
    const shade = (hex, f) => new THREE.Color(hex).multiplyScalar(f).getHex();
    // wire hanger: hook + triangle shoulders
    const hookMat = mat(0xb8bcc4, 0.4);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 6, 10, Math.PI * 1.4), hookMat);
    hook.position.y = 0.06;
    gm.add(hook);
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), hookMat);
    wire.rotation.z = Math.PI / 2;
    wire.position.y = -0.06;
    gm.add(wire);
    if (type === 'dress') {
      const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 10), mat(color));
      bodice.position.y = -0.28;
      gm.add(bodice);
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.32, 0.55, 10), mat(color));
      skirt.position.y = -0.68;
      gm.add(skirt);
      for (const sx of [-0.09, 0.09]) {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.02), mat(shade(color, 0.85)));
        strap.position.set(sx, -0.1, 0);
        gm.add(strap);
      }
    } else if (type === 'coat') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.68, 0.07), mat(color));
      body.position.y = -0.44;
      gm.add(body);
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), mat(shade(color, 0.92)));
        sleeve.position.set(side * 0.2, -0.42, 0);
        sleeve.rotation.z = side * 0.18;
        gm.add(sleeve);
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.3, 0.02), mat(shade(color, 0.75)));
        lapel.position.set(side * 0.07, -0.32, 0.045);
        lapel.rotation.y = -side * 0.3;
        gm.add(lapel);
      }
      for (let bi = 0; bi < 3; bi++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), mat(0x2a2a2a, 0.4));
        btn.position.set(0, -0.4 - bi * 0.12, 0.045);
        gm.add(btn);
      }
    } else {
      // shirt: body + two angled sleeves + collar
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.06), mat(color));
      body.position.y = -0.33;
      gm.add(body);
      for (const side of [-1, 1]) {
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.28, 8), mat(shade(color, 0.92)));
        sleeve.position.set(side * 0.18, -0.24, 0);
        sleeve.rotation.z = side * 0.35;
        gm.add(sleeve);
      }
      const collar2 = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), mat(shade(color, 0.78)));
      collar2.position.y = -0.12;
      collar2.rotation.x = Math.PI / 2;
      gm.add(collar2);
      // hem line
      const hemline = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.062), mat(shade(color, 0.82)));
      hemline.position.y = -0.545;
      gm.add(hemline);
    }
    return gm;
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
    // hanging garments — shirts, dresses and coats with real shapes
    const types = ['shirt', 'dress', 'coat', 'shirt', 'shirt', 'dress', 'coat', 'shirt'];
    for (let i = 0; i < 8; i++) {
      const c = clothColors[Math.floor(Math.random() * clothColors.length)];
      const item = makeGarment(c, types[i]);
      item.position.set(-1.9 + i * 0.55, 1.66, 0);
      item.rotation.y = (Math.random() - 0.5) * 0.3;
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


  // ---- Baltimore richness pass ----
  // shade sails overhead (swap.season signature look)
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xe8ddc8, roughness: 0.9, side: THREE.DoubleSide });
  for (const [sx, sz, rot] of [[-6, -2, 0.1], [4, 0, -0.12], [-2, 5, 0.08]]) {
    const sail = new THREE.Mesh(new THREE.CircleGeometry(3.2, 3), sailMat);
    sail.rotation.x = -Math.PI / 2 + 0.15;
    sail.rotation.z = rot;
    sail.position.set(sx, 5.2, sz);
    scene.add(sail);
  }
  // harbor dusk vista outside the north windows: water, domino-sugar-ish glow sign, cranes
  const harbor = new THREE.Mesh(new THREE.PlaneGeometry(60, 8), new THREE.MeshBasicMaterial({ color: 0x0e1e30 }));
  harbor.position.set(0, 2.5, -14.5);
  scene.add(harbor);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), new THREE.MeshStandardMaterial({ color: 0x1a3048, roughness: 0.3, metalness: 0.6 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.5, -14);
  scene.add(water);
  // glowing factory sign across the harbor
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 512; signCanvas.height = 96;
  const sc = signCanvas.getContext('2d');
  sc.fillStyle = '#101820'; sc.fillRect(0, 0, 512, 96);
  sc.font = 'bold 56px Georgia'; sc.textAlign = 'center'; sc.fillStyle = '#ff5a3c';
  sc.fillText('SWAP SEASON', 256, 66);
  const signTex = new THREE.CanvasTexture(signCanvas);
  signTex.colorSpace = THREE.SRGBColorSpace;
  const glowSign = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
  glowSign.position.set(-6, 3.4, -14.2);
  scene.add(glowSign);
  // crane silhouettes
  for (const cx of [4, 9]) {
    const crane = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 0.3), new THREE.MeshBasicMaterial({ color: 0x0a0e16 }));
    crane.position.set(cx, 2, -13.8);
    scene.add(crane);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.25, 0.25), new THREE.MeshBasicMaterial({ color: 0x0a0e16 }));
    arm.position.set(cx - 1.2, 4.3, -13.8);
    scene.add(arm);
  }
  // bar area along south wall with stools + string of pennant flags
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 1.0), mat(0x6a4a2e));
  barTop.position.set(-8, 1.05, 10.6);
  scene.add(barTop);
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(8, 1.0, 0.85), mat(0x3a2e22));
  barBase.position.set(-8, 0.5, 10.6);
  scene.add(barBase);
  bounds.push({ minX: -12.2, maxX: -3.8, minZ: 10.0, maxZ: 11.2 });
  for (let i = 0; i < 4; i++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.7, 10), mat(0x8a6a4a));
    stool.position.set(-11 + i * 2, 0.35, 9.6);
    scene.add(stool);
  }
  // beer taps on the bar
  for (let i = 0; i < 3; i++) {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), mat(0xb89858));
    tap.position.set(-9.5 + i * 1.2, 1.35, 10.6);
    scene.add(tap);
  }
  // pennant bunting across the room
  const flagColors = [0xc0526a, 0xe8c060, 0x5a8ac0, 0x7ab06a, 0xd07ac0];
  for (let i = 0; i < 16; i++) {
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 4), mat(flagColors[i % 5]));
    flag.rotation.x = Math.PI;
    const t = i / 15;
    flag.position.set(-15 + t * 30, 4.6 - Math.sin(t * Math.PI) * 0.5, 7 - t * 14);
    scene.add(flag);
  }
  // DJ booth detail: turntables + speakers
  for (const dx of [-0.7, 0.7]) {
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), mat(0x111116));
    tt.position.set(14 + dx, 1.13, 3);
    scene.add(tt);
    const vinyl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.055, 20), mat(0x050508));
    vinyl.position.set(14 + dx, 1.13, 3);
    scene.add(vinyl);
  }
  for (const spx of [12.6, 15.4]) {
    const spk = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.5), mat(0x14141c));
    spk.position.set(spx, 0.55, 2.2);
    scene.add(spk);
    const cone1 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), mat(0x2a2a38));
    cone1.rotation.x = Math.PI / 2;
    cone1.position.set(spx, 0.75, 1.94);
    scene.add(cone1);
  }
  // christmas corner: small tree + holiday photo backdrop (very swap.season)
  const miniTree = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 9), mat(0x2e5230));
  miniTree.position.set(15.5, 0.8, -8.5);
  scene.add(miniTree);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.9 }));
  backdrop.position.set(15.6, 1.3, -5.5);
  backdrop.rotation.y = -Math.PI / 2 - 0.3;
  scene.add(backdrop);
  // disco ball
  const disco = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0xc0c8d8, roughness: 0.15, metalness: 0.95 }));
  disco.position.set(4, 5.0, 0);
  scene.add(disco);
  // more colored mood lighting
  const magenta = new THREE.PointLight(0xd050a0, 10, 14);
  magenta.position.set(-8, 4.5, -4);
  scene.add(magenta);
  const teal = new THREE.PointLight(0x30c0b0, 10, 14);
  teal.position.set(9, 4.5, 5);
  scene.add(teal);

  // player + Stacy (filming a tiktok with her friend near the entrance)
  const christian = makePerson({ photo: faces.christian, top: 0x5a6b42, bottom: 0x3a3a44, hair: 0x6a4a2e, hairStyle: 'short', jacket: true, skin: 0xe0b088, ...playerIdentity(faces) });
  christian.group.position.set(0, 0, 4);
  scene.add(christian.group);

  const stacy = makePerson({ outfit: 'dress', photo: faces.stacy, top: 0x4a7a52, bottom: 0x2c2c34, hair: 0x2e1e14, hairStyle: 'long', skin: 0xe8c098, name: 'Stacy', });
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
  const interactions = new Interactions(scene);
  const guide = new GuideMarker(scene);
  guide.setTarget(-4, 8);
  // Kylie's Run Club flyer by the entrance — unlocks the track race
  interactions.add({
    pos: new THREE.Vector3(-14.5, 0, 9.5), radius: 2.2, label: 'Run Club flyer',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'A flyer: KYLIE\'S RUN CLUB — Wootton High track, Thursdays. "Marathon prep. Hurdles. No excuses."' },
        { speaker: 'Kylie ❤️', text: 'You thinking about it? Because Maya is FAST and I need the practice. Come watch a lap!' },
      ]);
      const c = await choice(['Head to the Wootton track', 'Stay at the swap']);
      player.frozen = false;
      if (c === 0) {
        const { runclubScene } = await import('./runclub.js');
        game.switchScene(runclubScene);
      }
    },
  });

  // --- DJ booth minigame: make beats, unlock banks with vinyl, publish ---
  interactions.add({
    pos: new THREE.Vector3(13.4, 0, 4.6), radius: 2.2, label: 'DJ the booth — make beats',
    action: async () => {
      player.frozen = true;
      await dialogue.play([{ speaker: 'DJ', text: 'Yo — you want a turn on the decks? The booth is yours, bronco. Make something.' }]);
      const recs = (window.__inventory && window.__inventory.records) || 0;
      const res = await runDJMinigame(recs);
      if (res.perform) {
        state.djPerforming = true;
        showObjective('🎤 your set is live — the crowd is coming over. Walk away whenever, the music keeps spinning.', 5000);
      }
      if (res.published) {
        await dialogue.play([
          { speaker: 'DJ', text: 'You PUBLISHED it?? Bold. SoundCloud is gonna feel that one.' },
          { speaker: 'Stacy', text: 'Already liked it. Obviously.' },
        ]);
      }
      player.frozen = false;
    },
  });

  const state = { met: false, hung: 0, dancing: false, danceScore: 0, djPerforming: false };

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
      // vintage camera payoff — the whole reason christian was collecting them
      const inv2 = inventory();
      if (inv2.cameras > 0) {
        const camLines = [
          { speaker: 'Christian', text: 'Oh — before I forget. I found some vintage cameras on the way. For you.' },
          { speaker: 'Stacy', text: inv2.cameras >= 5
              ? 'WAIT. Five?! Christian — the film grain on these is going to be INSANE. This is the best swap ever.'
              : inv2.cameras >= 2
                ? 'Babe!! Vintage?! These are going to shoot SO well. You know me too well.'
                : 'Ooh — vintage! Look at this little lens. Thank you, babe.' },
        ];
        if (inv2.cameras >= 5) camLines.push({ speaker: 'Stacy', text: 'Full collection energy. TikTok is going to lose its mind.' });
        await dialogue.play(camLines);
      }
      state.met = true;
      guide.setTarget(6, 8);
      showObjective('Hang the clothes on the marked rack — 4 pieces. Walk away anytime to bail.', 5000);
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
      const item = makeGarment(c, ['shirt', 'coat', 'dress', 'shirt'][state.hung % 4]);
      item.position.set(-1.5 + state.hung * 0.85, 1.66, 0);
      dropRack.add(item);
      hungItems.push(item);
      if (state.hung >= 4) {
        try { localStorage.setItem('cp-done-swap', '1'); } catch {}
        await dialogue.play([
          { speaker: 'Christian', text: 'That’s everything — even Tre’s blanket-cardigan. May it find a loving home.' },
          { speaker: 'Stacy', text: 'You’re the best. Okay — enjoy the party! DJ’s actually good tonight.' },
        ]);
        hangInt.done = true;
        guide.clear();
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


  // collectibles: vintage cameras for Stacy + vinyl records
  const pickups = new Pickups(scene);
  const inv = inventory();
  pickups.add(makeCameraMesh(), -10, 5, 'camera--10-5', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeCameraMesh(), 10, -7, 'camera-10--7', (id) => { inv.cameras++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.cameras + ')', 2500); });
  pickups.add(makeRecordMesh(), -6, -9, 'record--6--9', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });
  pickups.add(makeRecordMesh(), 13, 7, 'record-13-7', (id) => { inv.records++; showObjective((id.startsWith('camera') ? '📷 vintage camera for Stacy!' : '🎵 vinyl record — new sound unlocked!') + ' (' + inv.records + ')', 2500); });

  // browsing the racks — the whole point of the swap
  interactions.add({
    pos: new THREE.Vector3(-8, 0, -6), radius: 2.4, label: 'Browse the racks',
    action: async () => {
      player.frozen = true;
      const finds = [
        [{ speaker: 'Christian', text: 'A vintage Wootton letterman jacket. In perfect condition. Who gives this away?' }],
        [{ speaker: 'Christian', text: 'This cardigan has seen things. Tre would love it — wait, he already has one.' }],
        [{ speaker: 'Stacy', text: 'Babe. BABE. Look at this film camera strap — it matches one of yours!' }],
      ];
      await dialogue.play(finds[Math.floor(Math.random() * finds.length)]);
      player.frozen = false;
    },
  });

  // baltimore identity: warehouse stencil sign + oriole-orange accents
  const bmoreC = document.createElement('canvas');
  bmoreC.width = 512; bmoreC.height = 96;
  const bx = bmoreC.getContext('2d');
  bx.fillStyle = '#1a1210';
  bx.fillRect(0, 0, 512, 96);
  bx.font = 'bold 56px Arial';
  bx.textAlign = 'center';
  bx.fillStyle = '#e86018';
  bx.fillText('BALTIMORE', 256, 66);
  const bmoreT = new THREE.CanvasTexture(bmoreC);
  bmoreT.colorSpace = THREE.SRGBColorSpace;
  const bmore = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: bmoreT, transparent: true }));
  bmore.position.set(0, 4.6, -11.8);
  scene.add(bmore);

  // warehouse props: crates, barrels, seating nook
  function crate(x, z, ry = 0) {
    const cr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), mat(0x7a5c38));
    cr.position.set(x, 0.55, z);
    cr.rotation.y = ry;
    scene.add(cr);
    const cr2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat(0x8a6a42));
    cr2.position.set(x + 0.3, 1.55, z - 0.2);
    cr2.rotation.y = ry + 0.4;
    scene.add(cr2);
  }
  crate(-14.5, -8, 0.3);
  crate(14.8, -6.5, -0.2);
  crate(15.2, 8.5, 0.7);
  for (const [bx, bz] of [[-15, 2], [-14.6, 3.6]]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 12), mat(0x5a4a34));
    barrel.position.set(bx, 0.65, bz);
    scene.add(barrel);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.03, 6, 16), mat(0x3a3a3a));
    band.rotation.x = Math.PI / 2;
    band.position.set(bx, 0.9, bz);
    scene.add(band);
  }
  // seating nook: couch + coffee table corner
  const nook = new THREE.Group();
  const nc = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.6, 1), mat(0x6a3a4a));
  nc.position.set(0, 0.5, 0);
  const nback = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 0.3), mat(0x6a3a4a));
  nback.position.set(0, 1.0, -0.4);
  nook.add(nc, nback);
  nook.position.set(-13.5, 0, 8.5);
  nook.rotation.y = Math.PI / 4;
  scene.add(nook);
  const ctable = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.45, 10), mat(0x4a3a2c));
  ctable.position.set(-11.8, 0.22, 7.2);
  scene.add(ctable);

  // record crate digging flavor interaction
  interactions.add({
    pos: new THREE.Vector3(10.5, 0, -8.5),
    radius: 2.4,
    label: 'Dig through records',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Milk crates of vinyl. Somebody’s whole 2009 is in here.' },
        { speaker: 'Maya', text: 'Careful with the pressing — that one’s a first edition!' },
      ]);
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(10.5, 0, -4),
    radius: 2.4,
    label: 'Browse the Curated Rack',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'The Curated Rack. Vintage, high-end, everything labeled with the seller\'s name.' },
        { speaker: 'Olivia', text: 'That leather jacket has your name on it. Well — someone\'s name. That\'s the point.' },
      ]);
      player.frozen = false;
    },
  });
  interactions.add({
    pos: new THREE.Vector3(-5, 0, 7.8),
    radius: 2.2,
    label: 'Grab a matcha',
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Matcha pop-up at a clothing swap. Baltimore you\'re doing the most, and I respect it.' },
      ]);
      showObjective('🍵 matcha acquired. antioxidants +5.', 2500);
      player.frozen = false;
    },
  });

  // central round clothing rack — fills the middle like a real swap meet
  const rack = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 24), mat(0x8a8f96));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 1.6;
  rack.add(ring);
  const rpole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 8), mat(0x8a8f96));
  rpole.position.y = 0.8;
  rack.add(rpole);
  const rackClothColors = [0xc04a5a, 0x4a6ac0, 0x50a060, 0xc0a040, 0x8a5ac0, 0x40a0a0, 0xd07030, 0x707070];
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    const cl = makeGarment(rackClothColors[i % rackClothColors.length], ['shirt', 'dress', 'coat'][i % 3]);
    cl.position.set(Math.cos(ang) * 1.55, 1.56, Math.sin(ang) * 1.55);
    cl.rotation.y = -ang;
    rack.add(cl);
  }
  rack.position.set(2.5, 0, -2);
  scene.add(rack);
  bounds.push({ minX: 0.9, maxX: 4.1, minZ: -3.6, maxZ: -0.4 });

  setTimeout(() => phoneText('Stacy ❤️', 'ten items max!! don&#39;t embarrass me at my own event'), 6000);
  setTimeout(() => phoneText('Mom', 'be nice to everyone. swapping is a gift economy'), 12500);
  return {
    update(dt) {
    if (!this._posLoops) {
      this._posLoops = [];
      try {
        this._posLoops.push(positionalLoop({ type: 'noise', freq: 2400, x: -5, z: 7.8, maxDist: 5, gain: 0.06, rate: 1.5 }));
        this._posLoops.push(positionalLoop({ type: 'sawtooth', freq: 55, x: 14, z: 4.2, maxDist: 11, gain: 0.12 }));
      } catch {}
    }
    if (this._posLoops && typeof christian !== 'undefined') {
      for (const pl of this._posLoops) pl.update(christian.group.position.x, christian.group.position.z);
    }
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      player.update(dt);
      pickups.update(dt, christian.group.position);
      guide.update(dt, christian.group.position);
      followCam.update(dt, christian.group.position);

      // NPCs browse: shuffle around racks — unless christian is performing,
      // then the party migrates to the booth and everyone dances
      for (let ni = 0; ni < npcs.length; ni++) {
        const n = npcs[ni];
        n.t += dt;
        if (state.djPerforming) {
          if (!n.danceSpot) {
            // fan out in an arc facing the dj booth at (13.4, 4.6)
            const aa = -0.6 + ni * 0.42;
            n.tx = 13.4 - Math.cos(aa) * (2.2 + (ni % 2) * 1.2);
            n.tz = 4.6 + Math.sin(aa) * (2.6 + (ni % 3));
            n.danceSpot = true;
          }
          const dx = n.tx - n.p.group.position.x;
          const dz = n.tz - n.p.group.position.z;
          const dd = Math.hypot(dx, dz);
          if (dd > 0.3) {
            n.p.group.position.x += dx / dd * dt * 1.6;
            n.p.group.position.z += dz / dd * dt * 1.6;
            n.p.group.rotation.y = Math.atan2(dx, dz);
            n.p.animateWalk(dt, 1.0);
          } else {
            // dancing in place facing the booth
            n.p.group.rotation.y = Math.atan2(13.4 - n.p.group.position.x, 4.6 - n.p.group.position.z);
            n.p.group.position.y = Math.abs(Math.sin(n.t * 4.4 + ni * 1.7)) * 0.12;
            n.p.animateWalk(dt, 1.3);
          }
          continue;
        }
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
