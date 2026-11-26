import * as THREE from 'three';
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
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sp.scale.set(0.85, 0.21, 1);
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
  name = null,
} = {}) {
  const g = new THREE.Group();
  const mat = (c, rough = 0.85) => new THREE.MeshStandardMaterial({ color: c, roughness: rough, metalness: 0.0 });

  const H = 1.78 * height;
  const u = H / 1.78;

  // ---- torso: tapered, shoulders, hem band ----
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.185 * u, 0.155 * u, 0.62 * u, 14), mat(top));
  torso.position.y = 1.13 * u;
  torso.scale.z = 0.72;
  g.add(torso);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.185 * u, 14, 10), mat(top));
  shoulders.position.y = 1.44 * u;
  shoulders.scale.set(1, 0.55, 0.72);
  g.add(shoulders);
  // hem band at the bottom of the top
  const hem = new THREE.Mesh(new THREE.CylinderGeometry(0.168 * u, 0.172 * u, 0.055 * u, 14), mat(new THREE.Color(top).multiplyScalar(0.82).getHex()));
  hem.position.y = 0.845 * u;
  hem.scale.z = 0.74;
  g.add(hem);
  // collar rim
  if (collar) {
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
  // hips + belt
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.155 * u, 14, 10), mat(bottom));
  hips.position.y = 0.84 * u;
  hips.scale.set(1.05, 0.6, 0.8);
  g.add(hips);


  // ---- legs: capsule + cuff + proper boots ----
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.095 * u, 0.82 * u, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.062 * u, 0.62 * u, 4, 10), mat(bottom));
    leg.position.y = -0.4 * u;
    pivot.add(leg);
    // boot: shaft + toe box
    const bootMat = mat(shoes, 0.6);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.068 * u, 0.075 * u, 0.12 * u, 10), bootMat);
    shaft.position.y = -0.72 * u;
    pivot.add(shaft);
    const toe = new THREE.Mesh(new THREE.BoxGeometry(0.11 * u, 0.07 * u, 0.2 * u), bootMat);
    toe.position.set(0, -0.79 * u, 0.045 * u);
    pivot.add(toe);
    g.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---- arms: sleeve + cuff + hand ----
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.225 * u, 1.42 * u, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048 * u, 0.5 * u, 4, 10), mat(top));
    arm.position.y = -0.28 * u;
    pivot.add(arm);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * u, 0.052 * u, 0.04 * u, 8), mat(new THREE.Color(top).multiplyScalar(0.8).getHex()));
    cuff.position.y = -0.52 * u;
    pivot.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.047 * u, 10, 8), mat(skin));
    hand.position.y = -0.58 * u;
    hand.scale.set(0.85, 1.15, 0.9);
    pivot.add(hand);
    pivot.rotation.z = side * 0.07;
    g.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- neck + head ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * u, 0.058 * u, 0.1 * u, 10), mat(skin));
  neck.position.y = 1.52 * u;
  g.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.67 * u;
  g.add(headGroup);

  const headR = 0.125 * u;
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
      const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(headR * 2.35, headR * 2.35), faceMat);
      face.position.set(0, -headR * 0.02, headR * 0.96);
      headGroup.add(face);
    });
  } else {
    const skinCss = '#' + new THREE.Color(skin).getHexString();
    const female = hairStyle === 'long' || hairStyle === 'bun';
    const faceTex = npcFace({ skin: skinCss, female, mouthCurve: 0.3 + Math.random() * 0.5 });
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent: true, alphaTest: 0.02 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(headR * 1.9, headR * 1.9), faceMat);
    face.position.set(0, -headR * 0.02, headR * 0.95);
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
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.72, headR * 2.4, 4, 10), hairMat);
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
    walkPhase: 0,
    animateWalk(dt, speed) {
      api.walkPhase += dt * speed * 3.4;
      const s = Math.min(speed, 1);
      const swing = Math.sin(api.walkPhase) * 0.5 * s;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.75;
      armR.rotation.x = swing * 0.75;
      torso.position.y = baseTorsoY + Math.abs(Math.sin(api.walkPhase)) * 0.025 * u * s;
    },
    animateIdle(t) {
      const b = Math.sin(t * 1.6) * 0.012 * u;
      torso.position.y = baseTorsoY + b;
      legL.rotation.x = 0; legR.rotation.x = 0;
      armL.rotation.x = 0; armR.rotation.x = 0;
    },
    sit() {
      legL.rotation.x = -Math.PI / 2;
      legR.rotation.x = -Math.PI / 2;
      g.position.y -= 0.42 * u;
    },
  };
  return api;
}

// legacy helper kept for compatibility
export function cropPhotoSquare(url) {
  return Promise.resolve(url);
}
