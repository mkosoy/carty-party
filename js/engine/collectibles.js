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
