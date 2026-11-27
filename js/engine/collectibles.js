
// ambient chatter bubbles — little emoji clouds that pop over NPCs, fade, drift
export function makeChatter(scene, people, emojis, interval = 4) {
  const bubbles = [];
  function spawn() {
    const p = people[Math.floor(Math.random() * people.length)];
    if (!p) return;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.beginPath();
    x.roundRect(6, 8, 52, 40, 12);
    x.fill();
    x.font = '26px serif';
    x.textAlign = 'center';
    x.fillStyle = '#222';
    x.fillText(emojis[Math.floor(Math.random() * emojis.length)], 32, 38);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
    spr.scale.set(0.5, 0.5, 1);
    const grp = p.group || p.tr || p;
    if (!grp || !grp.position) return;
    spr.position.set(grp.position.x, 2.1, grp.position.z);
    spr.userData.life = 0;
    spr.userData.baseY = 2.1;
    spr.userData.host = grp;
    scene.add(spr);
    bubbles.push(spr);
  }
  let t = Math.random() * interval;
  return {
    update(dt) {
      t -= dt;
      if (t <= 0) { spawn(); t = interval * (0.7 + Math.random() * 0.6); }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.userData.life += dt;
        b.position.y = b.userData.baseY + b.userData.life * 0.25;
        b.position.x = b.userData.host.position.x;
        b.position.z = b.userData.host.position.z;
        b.material.opacity = Math.min(1, b.userData.life * 3) * Math.max(0, 1 - (b.userData.life - 1.6));
        if (b.userData.life > 2.6) { scene.remove(b); bubbles.splice(i, 1); }
      }
    },
  };
}

import * as THREE from 'three';

// Shared inventory across scenes: cameras for Stacy, vinyl records that
// unlock music. Persisted on window so scene switches keep it.
export function inventory() {
  if (!window.__inventory) window.__inventory = { cameras: 0, records: 0, items: [] };
  return window.__inventory;
}

// vintage camera: body + lens + viewfinder bump
export function makeCameraMesh() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, metalness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.1), mat(0x2a2622));
  g.add(body);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.09, 12), mat(0x111111));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0.02, 0, 0.09);
  g.add(lens);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 12), new THREE.MeshStandardMaterial({ color: 0x3a5a8a, roughness: 0.1, metalness: 0.8 }));
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0.02, 0, 0.135);
  g.add(glass);
  const vf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), mat(0x8a7a5a));
  vf.position.set(-0.05, 0.1, 0);
  g.add(vf);
  const leather = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.102), mat(0x6a4a2e));
  leather.position.y = -0.04;
  g.add(leather);
  return g;
}

// vinyl record: black disc + colored label
export function makeRecordMesh() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.015, 24), new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3 }));
  g.add(disc);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.017, 16), new THREE.MeshStandardMaterial({ color: 0xc04040, roughness: 0.6 }));
  g.add(label);
  g.rotation.z = Math.PI / 2.3;
  return g;
}
