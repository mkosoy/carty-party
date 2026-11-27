import * as THREE from 'three';
import { fabricWeave } from './textures.js';
import { npcFace } from './textures.js';

// Character builder v3 — quality-bar pass. Human-proportioned bodies with
// layered clothing detail (collars, cuffs, hems, belts, boots), sculpted
// multi-piece hair, and illustrated portrait faces on the cast. NPCs get
// procedural faces. Everything stays procedural + texture-light so it runs
// on mobile.
const texLoader = new THREE.TextureLoader();

function makeNameTag(name) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,14,24,0.55)';
  const w = Math.max(90, ctx.measureText ? 100 : 100);
  // pill background
  ctx.beginPath();
  ctx.roundRect(28, 8, 200, 48, 24);
  ctx.fill();
  ctx.fillStyle = '#ffe9b8';
  ctx.font = 'bold 30px Georgia';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, sizeAttenuation: false }));
  sp.scale.set(0.16, 0.04, 1);
  sp.renderOrder = 5;
  return sp;
}

export function makePerson({
  photo = null,
  skin = 0xd9a066,
  hair = 0x3a2a1a,
  top = 0x4a6fa5,
  bottom = 0x2c2c34,
  shoes = 0x2a2422,
  scale = 1,
  hairStyle = 'short', // 'short' | 'long' | 'bun' | 'curly' | 'receding' | 'none'
  height = 1,
  jacket = false,       // open jacket layer over the torso
  collar = true,
  outfit = null,        // 'shirt' | 'hoodie' | 'tee' | 'sweater' | 'jacket' — auto-varied when null
  name = null,
} = {}) {
  const isFeminine = hairStyle === 'long' || hairStyle === 'bun';
  if (!outfit) {
    const pool = jacket ? ['jacket'] : (isFeminine ? ['dress', 'shirt', 'sweater', 'dress', 'hoodie'] : ['shirt', 'hoodie', 'tee', 'sweater', 'shirt', 'hoodie', 'sweater']);
    const seed = (typeof top === 'number' ? top : 0) * 31 + (typeof bottom === 'number' ? bottom : 0) * 7 + (typeof hair === 'number' ? hair : 0);
    outfit = pool[Math.abs(seed) % pool.length];
  }
  if (jacket) outfit = 'jacket';
  const g = new THREE.Group();
  // blob shadow — keeps characters grounded when real shadow maps are off (mobile low-power)
  if (!makePerson._blobTex) {
    const bc = document.createElement('canvas');
    bc.width = 64; bc.height = 64;
    const bx = bc.getContext('2d');
    const bg = bx.createRadialGradient(32, 32, 4, 32, 32, 30);
    bg.addColorStop(0, 'rgba(0,0,0,0.42)');
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    bx.fillStyle = bg;
    bx.fillRect(0, 0, 64, 64);
    makePerson._blobTex = new THREE.CanvasTexture(bc);
  }
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.62),
    new THREE.MeshBasicMaterial({ map: makePerson._blobTex, transparent: true, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  blob.renderOrder = 1;
  g.add(blob);
  const weave = fabricWeave(2, 2);
  const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.0, map: weave, bumpMap: weave, bumpScale: 0.15 });
  const smoothMat = (c, rough = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.0 });

  const H = 1.78 * height;
  const u = H / 1.78;

  // ---- torso: tapered, shoulders, hem band ----
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.152 * u, 0.13 * u, 0.62 * u, 16), mat(top));
  torso.position.y = 1.13 * u;
  torso.scale.z = 0.72;
  g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.163 * u, 24, 18), mat(top));
  shoulders.position.y = 1.44 * u;
  shoulders.scale.set(1, 0.55, 0.72);
  g.add(shoulders);
  // hem band at the bottom of the top
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.168 * u, 0.172 * u, 0.055 * u, 14), mat(new THREE.Color(top).multiplyScalar(0.82).getHex()));
  hem.position.y = 0.845 * u;
  hem.scale.z = 0.74;
  g.add(hem);
  if (outfit === 'dress') {
    // fit-and-flare: bodice is the torso, skirt flares from the waist
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * u, 0.27 * u, 0.42 * u, 14), mat(top));
    skirt.position.y = 0.68 * u;
    skirt.scale.z = 0.78;
    g.add(skirt);
    // waistband accent
    const waist = new THREE.Mesh(new THREE.TorusGeometry(0.15 * u, 0.014 * u, 6, 14), mat(new THREE.Color(top).multiplyScalar(0.7).getHex()));
    waist.position.y = 0.88 * u;
    waist.rotation.x = Math.PI / 2;
    waist.scale.z = 0.78;
    g.add(waist);
  }

  // collar rim
  if (collar && outfit === 'shirt') {
    const col = new THREE.Mesh(new THREE.TorusGeometry(0.075 * u, 0.02 * u, 8, 14), mat(new THREE.Color(top).multiplyScalar(0.78).getHex()));
    col.position.y = 1.5 * u;
    col.rotation.x = Math.PI / 2;
    col.scale.z = 0.8;
    g.add(col);
  }
  // open jacket: two front panels slightly darker
  if (jacket) {
    const jc = new THREE.Color(top).multiplyScalar(0.7).getHex();
    for (const side of [-1, 1]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.09 * u, 0.52 * u, 0.02 * u), mat(jc));
      panel.position.set(side * 0.1 * u, 1.15 * u, 0.14 * u);
      panel.rotation.y = -side * 0.25;
      g.add(panel);
    }
  }
  // outfit-specific construction — shirts get plackets, hoodies get hoods + kangaroo pockets, etc.
  if (outfit === 'shirt' || outfit === 'jacket' || outfit === 'dress') {
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.028 * u, 0.5 * u, 0.012 * u), mat(new THREE.Color(top).multiplyScalar(0.88).getHex()));
    placket.position.set(0, 1.13 * u, 0.121 * u);
    g.add(placket);
    for (let bi = 0; bi < 3; bi++) {
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.011 * u, 6, 6), smoothMat(0xe8e4da, 0.4));
      btn.position.set(0, (1.3 - bi * 0.14) * u, 0.13 * u);
      g.add(btn);
    }
  }
  if (outfit === 'shirt') {
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.075 * u, 0.085 * u, 0.012 * u), mat(new THREE.Color(top).multiplyScalar(0.85).getHex()));
    pocket.position.set(-0.075 * u, 1.26 * u, 0.117 * u);
    g.add(pocket);
  }
  if (outfit === 'hoodie') {
    // kangaroo pocket
    const kanga = new THREE.Mesh(new THREE.BoxGeometry(0.2 * u, 0.13 * u, 0.03 * u), mat(new THREE.Color(top).multiplyScalar(0.85).getHex()));
    kanga.position.set(0, 0.99 * u, 0.115 * u);
    g.add(kanga);
    // hood resting behind the neck
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.11 * u, 12, 8), mat(new THREE.Color(top).multiplyScalar(0.9).getHex()));
    hood.position.set(0, 1.52 * u, -0.09 * u);
    hood.scale.set(1.1, 0.6, 0.8);
    g.add(hood);
    // drawstrings
    for (const side of [-1, 1]) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * u, 0.006 * u, 0.09 * u, 4), smoothMat(0xe8e4da, 0.5));
      string.position.set(side * 0.035 * u, 1.44 * u, 0.1 * u);
      g.add(string);
    }
  }
  if (outfit === 'sweater') {
    // ribbed collar/cuff/hem bands — chunky knit read
    for (const [ry, rr] of [[1.49, 0.082], [0.86, 0.165]]) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(rr * u, 0.018 * u, 6, 14), mat(new THREE.Color(top).multiplyScalar(0.72).getHex()));
      rib.position.y = ry * u;
      rib.rotation.x = Math.PI / 2;
      rib.scale.z = 0.8;
      g.add(rib);
    }
  }
  if (outfit === 'tee') {
    // simple band collar, no construction details — reads casual
    const teeBand = new THREE.Mesh(new THREE.TorusGeometry(0.07 * u, 0.014 * u, 6, 12), mat(new THREE.Color(top).multiplyScalar(0.9).getHex()));
    teeBand.position.y = 1.5 * u;
    teeBand.rotation.x = Math.PI / 2;
    teeBand.scale.z = 0.8;
    g.add(teeBand);
  }
  // every body type: shoulder seams
  for (const side of [-1, 1]) {
    const seam = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * u, 0.006 * u, 0.16 * u, 4), mat(new THREE.Color(top).multiplyScalar(0.8).getHex()));
    seam.position.set(side * 0.14 * u, 1.47 * u, 0.03 * u);
    seam.rotation.z = side * 0.9;
    seam.rotation.x = 0.3;
    g.add(seam);
  }
  // scarf sometimes — it's a holiday game, scarves everywhere
  const scarfSeed = (typeof top === 'number' ? top : 0) * 13 + (typeof skin === 'number' ? skin : 0);
  if (scarfSeed % 3 === 0 && (outfit === 'shirt' || outfit === 'jacket' || outfit === 'sweater')) {
    const scarfColors = [0xc03838, 0x2a6a3a, 0xd0a030, 0x8a2a5a, 0x3a5a9a];
    const sc = scarfColors[Math.abs(scarfSeed) % scarfColors.length];
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.075 * u, 0.028 * u, 8, 14), mat(sc));
    wrap.position.y = 1.52 * u;
    wrap.rotation.x = Math.PI / 2;
    wrap.scale.z = 0.85;
    g.add(wrap);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07 * u, 0.22 * u, 0.02 * u), mat(sc));
    tail.position.set(0.05 * u, 1.38 * u, 0.12 * u);
    tail.rotation.z = 0.12;
    g.add(tail);
  }

  // hips + belt
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.155 * u, 24, 18), mat(bottom));
  hips.position.y = 0.84 * u;
  hips.scale.set(1.05, 0.6, 0.8);
  g.add(hips);


  // ---- legs: capsule + cuff + proper boots ----
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.095 * u, 0.82 * u, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.074 * u, 0.66 * u, 6, 16), mat(bottom));
    leg.position.y = -0.4 * u;
    pivot.add(leg);
    // boot: shaft + toe box
    const bootMat = mat(shoes, 0.6);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068 * u, 0.075 * u, 0.12 * u, 10), bootMat);
    shaft.position.y = -0.72 * u;
    pivot.add(shaft);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.062 * u, 10, 8), bootMat);
    toe.scale.set(0.95, 0.55, 1.9);
    toe.position.set(0, -0.79 * u, 0.055 * u);
    pivot.add(toe);
    // sole
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.11 * u, 0.022 * u, 0.21 * u), mat(0x1a1a1a, 0.5));
    sole.position.set(0, -0.816 * u, 0.05 * u);
    pivot.add(sole);
    g.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---- arms: sleeve + cuff + hand ----
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.215 * u, 1.42 * u, 0);
    // shoulder cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.06 * u, 10, 8), mat(top));
    pivot.add(cap);
    // upper arm: slightly tapered sleeve down to the elbow
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05 * u, 0.2 * u, 6, 14), mat(top));
    upper.position.y = -0.15 * u;
    pivot.add(upper);
    // elbow joint group so the forearm carries a natural slight bend
    const elbow = new THREE.Group();
    elbow.position.y = -0.3 * u;
    pivot.add(elbow);
    const elbowBall = new THREE.Mesh(new THREE.SphereGeometry(0.042 * u, 8, 8), mat(top));
    elbow.add(elbowBall);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042 * u, 0.2 * u, 6, 14), mat(top));
    forearm.position.y = -0.13 * u;
    elbow.add(forearm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.047 * u, 0.047 * u, 0.04 * u, 8), mat(new THREE.Color(top).multiplyScalar(0.8).getHex()));
    cuff.position.y = -0.25 * u;
    elbow.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.047 * u, 10, 8), smoothMat(skin));
    hand.position.y = -0.31 * u;
    hand.scale.set(0.85, 1.2, 0.9);
    elbow.add(hand);
    // natural relaxed bend at the elbow, slight outward hang
    elbow.rotation.x = -0.18;
    elbow.rotation.z = side * 0.05;
    pivot.rotation.z = side * 0.09;
    g.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);
  // resting posture: arms drift slightly outward instead of hanging like pipes
  armL.rotation.z = 0.14;
  armR.rotation.z = -0.14;

  // ---- neck + head ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * u, 0.058 * u, 0.1 * u, 10), smoothMat(skin));
  neck.position.y = 1.52 * u;
  g.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.67 * u;
  g.add(headGroup);

  const headR = 0.14 * u;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 24, 18), mat(skin, 0.7));
  head.scale.set(0.9, 1.1, 0.95);
  headGroup.add(head);
  // ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), mat(skin, 0.7));
    ear.position.set(side * headR * 0.88, -headR * 0.05, 0);
    ear.scale.set(0.5, 1, 0.7);
    headGroup.add(ear);
  }

  // ---- face: portrait for cast, procedural for NPCs ----
  if (photo) {
    texLoader.load(photo, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02, side: THREE.FrontSide });
      // curved shell wrapping the front of the head instead of a floating plane.
      // cylinder theta=0 sits at +z, so a segment centered there needs no rotation.
      const wrap = 2.0; // radians of coverage
      const geo = new THREE.CylinderGeometry(headR * 1.0, headR * 1.02, headR * 1.85, 18, 1, true, -wrap / 2, wrap);
      const face = new THREE.Mesh(geo, faceMat);
      face.position.set(0, -headR * 0.05, 0);
      headGroup.add(face);
    });
  } else {
    const skinCss = '#' + new THREE.Color(skin).getHexString();
    const female = hairStyle === 'long' || hairStyle === 'bun';
    const faceTex = npcFace({ skin: skinCss, female, mouthCurve: 0.3 + Math.random() * 0.5 });
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, alphaTest: 0.02 });
    const wrap2 = 1.9;
    const geo2 = new THREE.CylinderGeometry(headR * 1.0, headR * 1.02, headR * 1.7, 18, 1, true, -wrap2 / 2, wrap2);
    const face = new THREE.Mesh(geo2, faceMat);
    face.position.set(0, -headR * 0.05, 0);
    headGroup.add(face);
  }

  // ---- sculpted hair ----
  const hairMat = mat(hair, 0.75);
  function hairBall(r, x, y, z, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), hairMat);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    headGroup.add(m);
    return m;
  }
  if (hairStyle === 'short') {
    // cap + swept front volume
    hairBall(headR * 1.06, 0, headR * 0.28, -headR * 0.12, 0.95, 0.85, 0.98);
    hairBall(headR * 0.7, 0, headR * 0.62, headR * 0.28, 1.05, 0.55, 0.9);
  } else if (hairStyle === 'receding') {
    // thin cap further back + side tufts
    hairBall(headR * 1.02, 0, headR * 0.3, -headR * 0.28, 0.92, 0.72, 0.9);
    hairBall(headR * 0.32, -headR * 0.82, headR * 0.1, -headR * 0.1, 0.5, 0.9, 0.9);
    hairBall(headR * 0.32, headR * 0.82, headR * 0.1, -headR * 0.1, 0.5, 0.9, 0.9);
  } else if (hairStyle === 'curly') {
    // tight textured cap: cluster of small bumps
    hairBall(headR * 1.05, 0, headR * 0.3, -headR * 0.05, 0.95, 0.82, 0.95);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      hairBall(headR * 0.34, Math.cos(a) * headR * 0.62, headR * 0.68, Math.sin(a) * headR * 0.5 - headR * 0.05, 1, 0.9, 1);
    }
  } else if (hairStyle === 'long') {
    // cap + volume at back falling past shoulders + side strands
    hairBall(headR * 1.07, 0, headR * 0.26, -headR * 0.1, 0.96, 0.88, 0.98);
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.72, headR * 2.4, 6, 18), hairMat);
    back.position.set(0, -headR * 1.3, -headR * 0.55);
    back.scale.z = 0.5;
    headGroup.add(back);
    for (const side of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.16, headR * 1.2, 4, 8), hairMat);
      strand.position.set(side * headR * 0.88, -headR * 0.5, headR * 0.12);
      headGroup.add(strand);
    }
  } else if (hairStyle === 'bun') {
    hairBall(headR * 1.06, 0, headR * 0.28, -headR * 0.08, 0.95, 0.85, 0.96);
    hairBall(headR * 0.5, 0, headR * 0.95, -headR * 0.55, 1, 0.9, 1);
    // loose strands
    for (const side of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.09, headR * 0.5, 4, 6), hairMat);
      strand.position.set(side * headR * 0.8, -headR * 0.15, headR * 0.3);
      strand.rotation.z = side * 0.15;
      headGroup.add(strand);
    }
  }

  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  if (name) {
    const tag = makeNameTag(name);
    tag.position.y = 2.12 * u;
    g.add(tag);
  }

  const baseTorsoY = torso.position.y;
  const api = {
    group: g,
    head,
    headGroup,
    armL,
    armR,
    legL,
    legR,
    torso,
    walkPhase: 0,
    animateWalk(dt, speed) {
      api.walkPhase += dt * speed * 3.4;
      const s = Math.min(speed, 1);
      const swing = Math.sin(api.walkPhase) * 0.5 * s;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.75;
      armR.rotation.x = swing * 0.75;
      // fluidity pass: forward lean with speed, torso twist counter to stride,
      // slight hip sway — reads as momentum instead of a rigid sliding capsule
      torso.position.y = baseTorsoY + Math.abs(Math.sin(api.walkPhase)) * 0.03 * u * s;
      torso.rotation.x = 0.06 * s;
      torso.rotation.y = Math.sin(api.walkPhase) * 0.07 * s;
      if (api.shouldersMesh) api.shouldersMesh.rotation.y = Math.sin(api.walkPhase) * 0.05 * s;
    },
    animateIdle(t) {
      const b = Math.sin(t * 1.6) * 0.012 * u;
      torso.position.y = baseTorsoY + b;
      legL.rotation.x = 0; legR.rotation.x = 0;
      armL.rotation.x = 0; armR.rotation.x = 0;
      // gentle sway keeps the resting posture alive
      armL.rotation.z = 0.14 + Math.sin(t * 1.1) * 0.02;
      armR.rotation.z = -0.14 - Math.sin(t * 1.1 + 0.5) * 0.02;
      // ease posture back to neutral so the walk lean doesn't stick
      torso.rotation.x *= 0.85;
      torso.rotation.y *= 0.85;
      // subtle head life: slow look-around sway + tiny tilt
      headGroup.rotation.y = Math.sin(t * 0.45) * 0.16;
      headGroup.rotation.z = Math.sin(t * 0.7 + 1.3) * 0.03;
    },
    sit(seatTop) {
      legL.rotation.x = -Math.PI / 2;
      legR.rotation.x = -Math.PI / 2;
      blob.visible = false; // shadow lives on the floor, not inside the chair
      // exact geometry: hip pivot is 0.82u above group origin. place the group so
      // the hips land just above the seat surface — no floating, no sinking.
      if (typeof seatTop === 'number') {
        g.position.y = seatTop - 0.82 * u + 0.06 * u;
      } else {
        g.position.y -= 0.42 * u;
      }
    },
  };
  return api;
}

// legacy helper kept for compatibility
export function cropPhotoSquare(url) {
  return Promise.resolve(url);
}

// who the player chose on the map screen — falls back to christian
export function playerIdentity(faces) {
  const cid = (typeof localStorage !== 'undefined' && localStorage.getItem('cp-character')) || 'christian';
  const fem = ['olivia', 'stacy', 'kylie'].includes(cid);
  return {
    photo: faces[cid] || faces.christian,
    name: cid[0].toUpperCase() + cid.slice(1),
    outfit: fem ? 'dress' : undefined,
    hairStyle: fem ? 'long' : 'short',
    hair: fem ? 0x2e1e14 : 0x6a4a2e,
  };
}
