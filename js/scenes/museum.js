import * as THREE from 'three';
import { makePerson, playerIdentity } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, Pickups } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';
import { sfxChime } from '../engine/sfx.js';

// Smithsonian Air & Space — Mark's home turf. The great hall: suspended
// aircraft overhead, rockets, lunar lander, interactive exhibits.
export async function museumScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x11161f);
  scene.fog = new THREE.Fog(0x11161f, 24, 64);
  scene.add(new THREE.AmbientLight(0x9aa4b8, 1.5));
  const key = new THREE.DirectionalLight(0xfff4e0, 1.15);
  key.position.set(6, 14, 4);
  key.castShadow = true;
  scene.add(key);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // great hall: marble floor, tall walls, skylight strips
  const floor = new THREE.Mesh(new THREE.BoxGeometry(36, 0.2, 22), new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.45, metalness: 0.15 }));
  floor.receiveShadow = true;
  scene.add(floor);
  for (const [w, h, d, x, z] of [
    [36, 8, 0.4, 0, -11], [36, 8, 0.4, 0, 11], [0.4, 8, 22, -18, 0], [0.4, 8, 22, 18, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(0x4a4640));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  for (const [px, pz] of [[-8, -2], [0, 2], [8, -2]]) {
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.1 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(px, 0.13, pz);
    scene.add(pool);
  }
  const bounds = [
    { minX: -18, maxX: 18, minZ: -11.4, maxZ: -10.9 }, { minX: -18, maxX: 18, minZ: 10.9, maxZ: 11.4 },
    { minX: -18.4, maxX: -17.9, minZ: -11.4, maxZ: 11.4 }, { minX: 17.9, maxX: 18.4, minZ: -11.4, maxZ: 11.4 },
  ];
  for (let sx = -12; sx <= 12; sx += 8) {
    const sky = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 16), new THREE.MeshBasicMaterial({ color: 0x8ab8e8 }));
    sky.position.set(sx, 7.9, 0);
    scene.add(sky);
  }
  for (const [lx, lz] of [[-10, -5], [0, 0], [10, 5], [-10, 5], [10, -5]]) {
    const pt = new THREE.PointLight(0xfff0d8, 24, 18);
    pt.position.set(lx, 6, lz);
    scene.add(pt);
  }

  // suspended aircraft — the hall's signature
  function plane(color, scale = 1) {
    const g = new THREE.Group();
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.3 * scale, 2.2 * scale, 4, 8), mat(color));
    fus.rotation.z = Math.PI / 2;
    g.add(fus);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.05 * scale, 2.6 * scale), mat(color));
    wing.position.x = 0.2 * scale;
    g.add(wing);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5 * scale, 0.6 * scale, 0.05 * scale), mat(color));
    tail.position.set(-1.2 * scale, 0.3 * scale, 0);
    g.add(tail);
    const tailw = new THREE.Mesh(new THREE.BoxGeometry(0.4 * scale, 0.04 * scale, 1 * scale), mat(color));
    tailw.position.set(-1.15 * scale, 0.15 * scale, 0);
    g.add(tailw);
    return g;
  }
  const flyers = [];
  for (const [c, s, x, y, z, ry] of [
    [0xc84a3a, 1.3, -8, 5.4, -4, 0.4],
    [0xd8d8e0, 1.0, 2, 6.0, 2, -0.3],
    [0x3a5a8a, 0.8, 10, 5.2, -3, 0.9],
  ]) {
    const pl = plane(c, s);
    pl.position.set(x, y, z);
    pl.rotation.y = ry;
    scene.add(pl);
    flyers.push({ pl, baseY: y, off: Math.random() * 6 });
  }
  // rocket standing tall
  const rocket = new THREE.Group();
  const rbody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 5.5, 12), mat(0xe8e8e8));
  rbody.position.y = 2.75;
  rocket.add(rbody);
  const rnose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 12), mat(0x2a2a30));
  rnose.position.y = 6.2;
  rocket.add(rnose);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.6), mat(0xc84040));
    const a = (i / 4) * Math.PI * 2;
    fin.position.set(Math.cos(a) * 0.55, 0.7, Math.sin(a) * 0.55);
    fin.rotation.y = -a;
    rocket.add(fin);
  }
  rocket.position.set(6, 0, -5);
  scene.add(rocket);
  bounds.push({ minX: 11, maxX: 13, minZ: 5, maxZ: 7 });
  // lunar lander — angular gold foil
  const lander = new THREE.Group();
  const lbody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.0, 1.6), new THREE.MeshStandardMaterial({ color: 0xc89830, metalness: 0.8, roughness: 0.3 }));
  lbody.position.y = 1.2;
  lander.add(lbody);
  const ltop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 8), mat(0x8a8a92));
  ltop.position.y = 2.1;
  lander.add(ltop);
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), mat(0x6a6a72));
    const a = (i / 4) * Math.PI * 2 + 0.78;
    leg.position.set(Math.cos(a) * 1.0, 0.6, Math.sin(a) * 1.0);
    leg.rotation.z = Math.cos(a) * 0.5;
    leg.rotation.x = -Math.sin(a) * 0.5;
    lander.add(leg);
  }
  lander.position.set(-6, 0, -5);
  scene.add(lander);
  bounds.push({ minX: -7.5, maxX: -4.5, minZ: -6.5, maxZ: -3.5 });
  // info desk + museum sign
  const desk = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.05, 16), mat(0x3a3630));
  desk.position.set(0, 0.5, 9);
  scene.add(desk);
  bounds.push({ minX: -1.6, maxX: 1.6, minZ: 7.4, maxZ: 10.6 });
  const sgC = document.createElement('canvas');
  sgC.width = 1024; sgC.height = 128;
  const sg = sgC.getContext('2d');
  sg.fillStyle = '#141821'; sg.fillRect(0, 0, 1024, 128);
  sg.fillStyle = '#e8e0c8'; sg.font = 'bold 64px Georgia'; sg.textAlign = 'center';
  sg.fillText('AIR AND SPACE MUSEUM', 512, 88);
  const sgT = new THREE.CanvasTexture(sgC);
  sgT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.5), new THREE.MeshBasicMaterial({ map: sgT }));
  sign.position.set(0, 6.4, -10.8);
  scene.add(sign);
  // a few other visitors
  const visitors = [];
  for (let i = 0; i < 4; i++) {
    const p = makePerson({ top: [0x4a5a7a, 0x7a4a4a, 0x4a7a5a, 0x6a6a6a][i], bottom: 0x2a2a34, hair: 0x2a1a12, skin: 0xd0a080 });
    p.group.position.set(-6 + i * 4, 0, -2 + (i % 2) * 4);
    p.group.rotation.y = Math.random() * 6.28;
    scene.add(p.group);
    visitors.push(p);
  }

  // mark himself is here — your personal docent, unless you're playing as him
  if ((localStorage.getItem('cp-character') || 'christian') !== 'mark') {
    const markNpc = makePerson({ photo: faces.mark, top: 0x3a4a5c, bottom: 0x2c2c34, hair: 0x2a1c10, hairStyle: 'short', skin: 0xd8a880, name: 'Mark' });
    markNpc.group.position.set(1.6, 0, 4.8);
    markNpc.group.rotation.y = Math.PI;
    scene.add(markNpc.group);
    window.__markNpc = markNpc;
  }
  // display cases with models along the side walls
  for (const [cx, cz, ry] of [[-16.5, -4, Math.PI / 2], [-16.5, 2, Math.PI / 2], [16.5, -2, -Math.PI / 2], [16.5, 4, -Math.PI / 2]]) {
    const ped = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.2), mat(0x3a3630));
    ped.position.set(cx, 0.5, cz);
    scene.add(ped);
    const vitrine = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 1.0), new THREE.MeshStandardMaterial({ color: 0xa8d0e8, transparent: true, opacity: 0.22, roughness: 0.05 }));
    vitrine.position.set(cx, 1.45, cz);
    scene.add(vitrine);
    const model = plane([0xc84a3a, 0xd8d8e0, 0x3a5a8a, 0xc89830][Math.floor(Math.abs(cx + cz)) % 4], 0.3);
    model.position.set(cx, 1.4, cz);
    model.rotation.y = ry + Math.random();
    scene.add(model);
    bounds.push({ minX: cx - 0.8, maxX: cx + 0.8, minZ: cz - 0.8, maxZ: cz + 0.8 });
  }
  // wall murals: clouds-and-sky canvases between the windows
  for (const [mx, hue] of [[-14, '#3a5a8a'], [-5, '#4a6a9a'], [5, '#3a5a8a'], [14, '#4a6a9a']]) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const xc = c.getContext('2d');
    const gr = xc.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, hue); gr.addColorStop(1, '#1a2a42');
    xc.fillStyle = gr; xc.fillRect(0, 0, 256, 128);
    xc.fillStyle = 'rgba(255,255,255,0.5)';
    for (let cl = 0; cl < 5; cl++) {
      xc.beginPath();
      xc.ellipse(30 + cl * 48, 90 - Math.random() * 30, 26, 10, 0, 0, 6.29);
      xc.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.2), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(mx, 4.4, -10.85);
    scene.add(m);
  }
  // floor medallion at center — the museum compass rose
  const med = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshStandardMaterial({ color: 0x6a6458, roughness: 0.3, metalness: 0.3 }));
  med.rotation.x = -Math.PI / 2;
  med.position.set(0, 0.115, 0);
  scene.add(med);
  const star2 = new THREE.Mesh(new THREE.CircleGeometry(1.4, 8), new THREE.MeshBasicMaterial({ color: 0xc8a040 }));
  star2.rotation.x = -Math.PI / 2;
  star2.position.set(0, 0.12, 0);
  scene.add(star2);

  // player — default mark if christian unchosen? respect the picker
  const hero = makePerson({ photo: faces.mark, top: 0x3a4a5c, bottom: 0x2c2c34, hair: 0x2a1c10, hairStyle: 'short', skin: 0xd8a880, ...playerIdentity(faces) });
  hero.group.position.set(0, 0, 4.5);
  hero.group.rotation.y = Math.PI;
  hero.group.rotation.y = Math.PI;
  scene.add(hero.group);
  const player = new PlayerController(hero, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.setRoom(-17.5, 17.5, -10.5, 10.5);
  followCam.snap(hero.group.position);

  const interactions = new Interactions(scene);
  const say = (lines) => async () => { player.frozen = true; await dialogue.play(lines); player.frozen = false; };
  interactions.add({ pos: new THREE.Vector3(-8, 0, -4), radius: 3.4, label: 'The red biplane', action: say([
    { speaker: 'Mark', text: 'Fabric and wire and pure audacity. People flew these before radio. Before parachutes, sometimes.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(6, 0, -5), radius: 3.4, label: 'The rocket', action: say([
    { speaker: 'Mark', text: 'Every gram on a rocket fights for its life. Engineering as a contact sport. Beautiful.' },
    { speaker: 'Christian', text: 'You get this look on your face every time. Every single time.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(-6, 0, -5), radius: 3.4, label: 'The lunar lander', action: say([
    { speaker: 'Mark', text: 'They landed on the moon in something that looks like a craft project. Gold foil and grit.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(0, 0, 9.8), radius: 2.6, label: 'Ask the info desk', action: say([
    { speaker: 'Christian', text: 'Mark has now explained the lander to three separate strangers. The docents are taking notes. From HIM.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(2, 0, 2), radius: 3.0, label: 'The white plane', action: say([
    { speaker: 'Mark', text: 'The suspended gallery is the best room in DC. Fight me. Actually do not, I will cry about airplanes.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(0, 0, -8), radius: 3.2, label: 'Look up', action: say([
    { speaker: 'Christian', text: 'A whole ceiling of flying machines. This is Mark\u2019s cathedral.' },
    { speaker: 'Mark', text: 'When I was nine my dad brought me here and I cried at the X-15. Actually cried. In public.' },
    { speaker: 'Christian', text: 'You are tearing up right now.' },
    { speaker: 'Mark', text: 'It is a VERY fast plane, Christian.' },
  ]) });

  // ---- paper airplane station minigame ----
  const station = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.9), mat(0x5a4a38));
  station.position.set(10, 0.45, 8);
  scene.add(station);
  bounds.push({ minX: 9.2, maxX: 10.8, minZ: 7.5, maxZ: 8.5 });
  const paperOnTable = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
  paperOnTable.rotation.x = Math.PI / 2;
  paperOnTable.position.set(10, 0.95, 8);
  scene.add(paperOnTable);

  const fl = { active: false, plane: null, vx: 0, vy: 0, heading: 0, rings: [], score: 0, done: false };
  function ringAt(x, y, z) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 24), new THREE.MeshStandardMaterial({ color: 0x40c8ff, emissive: 0x2090c0, emissiveIntensity: 0.7 }));
    r.position.set(x, y, z);
    r.visible = false;
    scene.add(r);
    return r;
  }
  for (const [rx, ry, rz] of [[0, 2.2, 2], [-4, 2.8, -3], [3, 3.2, -7], [-1, 2.4, -9]]) fl.rings.push(ringAt(rx, ry, rz));

  interactions.add({ pos: new THREE.Vector3(10, 0, 7), radius: 2.2, label: 'Paper airplane station', action: async () => {
    if (fl.active) return;
    player.frozen = true;
    if (!fl.done) {
      await dialogue.play([
        { speaker: 'Mark', text: 'The paper airplane station. Aerodynamics for the people. Watch this — a perfect dart fold.' },
        { speaker: 'Christian', text: 'Steer with left and right, hold forward to keep lift. Through the rings!' },
      ]);
    }
    fl.active = true;
    fl.score = 0;
    fl.heading = Math.PI;
    fl.vy = 0.6;
    const dart = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }));
    dart.position.set(hero.group.position.x, 1.6, hero.group.position.z - 0.5);
    dart.rotation.x = -Math.PI / 2;
    scene.add(dart);
    fl.plane = dart;
    for (const r of fl.rings) { r.visible = true; r.userData.hit = false; r.material.emissiveIntensity = 0.7; }
    showObjective('FLY! steer left/right · hold W for lift · thread the rings!', 3500);
  }});

  const pickups = new Pickups(scene);
  const invC = inventory();
  pickups.add(makeCameraMesh(), -16, -8, 'camera-museum-1', () => { invC.cameras++; sfxChime(); showObjective('📷 vintage camera for Stacy — left behind the display case!', 2500); });
  pickups.add(makeRecordMesh(), 15, 8, 'record-museum-1', () => { invC.records++; sfxChime(); showObjective('🎵 vinyl record — someone hid it by the vitrines!', 2500); });

  window.__sceneHint = 'WASD — move · E — interact · explore the hall';
  showObjective('Air & Space — wander the great hall. Mark knows every bolt here.', 6000);

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: hero, self: this };
      player.update(dt);
      if (!fl.active) followCam.update(dt, hero.group.position);
      pickups.update(dt, hero.group.position);
      const nearI = interactions.nearest(hero.group.position);
      const promptEl = document.getElementById('interact-prompt');
      if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) promptEl.classList.add('hidden');
      if (nearI && !player.frozen && input.consumeInteract()) nearI.action();
      if (fl.active && fl.plane) {
        const pl = fl.plane;
        const steer = (input.keys.has('ArrowLeft') || input.keys.has('KeyA') || input.joyX < -0.3) ? 1 : (input.keys.has('ArrowRight') || input.keys.has('KeyD') || input.joyX > 0.3) ? -1 : 0;
        fl.heading += steer * dt * 1.9;
        const lift = (input.keys.has('ArrowUp') || input.keys.has('KeyW') || input.joyY < -0.3) ? 1.15 : 0;
        fl.vy += (-0.55 + lift * 0.9) * dt;
        fl.vy = Math.max(-1.4, Math.min(0.9, fl.vy));
        const spd = 4.2;
        pl.position.x += Math.sin(fl.heading) * spd * dt;
        pl.position.z += Math.cos(fl.heading) * spd * dt;
        pl.position.y += fl.vy * dt * 2.2;
        pl.rotation.z = -steer * 0.5;
        pl.rotation.y = fl.heading + Math.PI;
        pl.position.x = Math.max(-16, Math.min(16, pl.position.x));
        pl.position.z = Math.max(-9.5, Math.min(9.5, pl.position.z));
        camera.position.lerp(new THREE.Vector3(pl.position.x - Math.sin(fl.heading) * 4.2, pl.position.y + 2.3, pl.position.z - Math.cos(fl.heading) * 4.2), 0.1);
        camera.lookAt(pl.position.x + Math.sin(fl.heading) * 2.5, pl.position.y - 0.3, pl.position.z + Math.cos(fl.heading) * 2.5);
        for (const r of fl.rings) {
          if (!r.userData.hit && pl.position.distanceTo(r.position) < 0.95) {
            r.userData.hit = true;
            r.material.emissiveIntensity = 2.2;
            r.material.color.set(0x60ff80);
            fl.score++;
            showObjective('RING! ' + fl.score + '/4', 1200);
          }
        }
        if (pl.position.y <= 0.15) {
          fl.active = false;
          fl.done = true;
          scene.remove(pl);
          fl.plane = null;
          for (const r of fl.rings) r.visible = false;
          const lines = fl.score >= 3
            ? [{ speaker: 'Mark', text: 'FOUR-ring aerobatics! The Smithsonian should hire you. I mean it. I know the director. I do not know the director.' }]
            : fl.score >= 1
              ? [{ speaker: 'Mark', text: 'Respectable glide ratio! Bernoulli would nod politely. Try again — the rings are right there.' }]
              : [{ speaker: 'Christian', text: 'The lawn dart approach. Bold. The floor appreciated it.' }];
          player.frozen = true;
          dialogue.play(lines).then(() => {
            player.frozen = false;
            if (fl.score >= 3) try { localStorage.setItem('cp-done-museum', '1'); } catch {}
            followCam.snap(hero.group.position);
          });
        }
      }
            const t = performance.now() / 1000;
      for (const f of flyers) f.pl.position.y = f.baseY + Math.sin(t * 0.5 + f.off) * 0.08;
      for (const v of visitors) v.animateIdle(t);
    },
  };
}
