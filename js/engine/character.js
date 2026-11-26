import * as THREE from 'three';

// Builds a stylized but human-proportioned person: rounded torso/limbs,
// sphere head with the photo applied as a curved face mask so the likeness
// stays undistorted, hair cap (with optional long hair). NPCs without photos
// get plain skin heads — still human-looking rather than blocky.
const texLoader = new THREE.TextureLoader();

export function makePerson({
  photo = null,
  skin = 0xd9a066,
  hair = 0x3a2a1a,
  top = 0x4a6fa5,
  bottom = 0x2c2c34,
  scale = 1,
  hairStyle = 'short', // 'short' | 'long' | 'bun' | 'none'
  height = 1,
} = {}) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.0 });

  const H = 1.78 * height; // total target height
  const u = H / 1.78;      // unit scale for proportions

  // ---- torso: tapered capsule-ish cylinder, wider at shoulders ----
  const torsoGeo = new THREE.CylinderGeometry(0.185 * u, 0.15 * u, 0.62 * u, 12);
  const torso = new THREE.Mesh(torsoGeo, mat(top));
  torso.position.y = 1.13 * u;
  torso.scale.z = 0.72;
  g.add(torso);
  // shoulders cap
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.185 * u, 12, 8), mat(top));
  shoulders.position.y = 1.44 * u;
  shoulders.scale.set(1, 0.55, 0.72);
  g.add(shoulders);
  // hips
  const hips = new THREE.Mesh(new THREE.SphereGeometry(0.155 * u, 12, 8), mat(bottom));
  hips.position.y = 0.84 * u;
  hips.scale.set(1.05, 0.6, 0.8);
  g.add(hips);

  // ---- legs: capsules pivoting at the hip ----
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.095 * u, 0.82 * u, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.062 * u, 0.62 * u, 4, 10), mat(bottom));
    leg.position.y = -0.4 * u;
    pivot.add(leg);
    // shoe
    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.07 * u, 8, 6), mat(0x22201e));
    shoe.position.set(0, -0.78 * u, 0.03 * u);
    shoe.scale.set(0.9, 0.55, 1.5);
    pivot.add(shoe);
    g.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  // ---- arms: capsules pivoting at the shoulder ----
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.225 * u, 1.42 * u, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045 * u, 0.5 * u, 4, 8), mat(top));
    arm.position.y = -0.28 * u;
    pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045 * u, 8, 6), mat(skin));
    hand.position.y = -0.56 * u;
    pivot.add(hand);
    pivot.rotation.z = side * 0.09;
    g.add(pivot);
    return pivot;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  // ---- neck + head ----
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * u, 0.055 * u, 0.09 * u, 8), mat(skin));
  neck.position.y = 1.52 * u;
  g.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.66 * u;
  g.add(headGroup);

  const headR = 0.13 * u;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), mat(skin));
  head.scale.set(0.92, 1.08, 0.96);
  headGroup.add(head);

  // face: circular photo disc on the front of the head. MeshBasicMaterial
  // keeps it bright regardless of scene lighting so likenesses always read.
  if (photo) {
    texLoader.load(photo, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const faceMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.02 });
      const face = new THREE.Mesh(new THREE.PlaneGeometry(headR * 2.1, headR * 2.1), faceMat);
      face.position.set(0, -headR * 0.05, headR * 0.99);
      headGroup.add(face);
    });
  }

  // ---- hair ----
  if (hairStyle !== 'none') {
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.09, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(hair));
    hairCap.scale.set(0.94, 1.1, 0.98);
    hairCap.position.y = headR * 0.1;
    hairCap.rotation.x = -0.32;
    headGroup.add(hairCap);
    if (hairStyle === 'long') {
      const back = new THREE.Mesh(new THREE.CapsuleGeometry(headR * 0.85, headR * 1.9, 4, 8), mat(hair));
      back.position.set(0, -headR * 1.15, -headR * 0.52);
      back.scale.z = 0.45;
      headGroup.add(back);
    } else if (hairStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.45, 8, 6), mat(hair));
      bun.position.set(0, headR * 0.72, -headR * 0.72);
      headGroup.add(bun);
    }
  }

  g.scale.setScalar(scale);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });

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

// legacy helper kept for compatibility (faces are now pre-cropped assets)
export function cropPhotoSquare(url) {
  return Promise.resolve(url);
}
