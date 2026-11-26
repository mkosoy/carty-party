import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { showObjective } from '../engine/core.js';

// Kylie's Run Club — Wootton High School track. Marathon prep: hurdles,
// racing three other runners, two laps, best lap time wins. SPACE / tap
// to jump. Hitting a hurdle costs you speed.
export async function runclubScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x2a3450);
  scene.fog = new THREE.Fog(0x2a3450, 30, 90);
  scene.add(new THREE.AmbientLight(0x8090b0, 0.85));
  const dusk = new THREE.DirectionalLight(0xffc890, 0.7);
  dusk.position.set(-20, 14, -8);
  dusk.castShadow = true;
  scene.add(dusk);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // ---- the track: ellipse lanes. a=18, b=10 (x radius, z radius) ----
  const A = 18, B = 10;
  // infield grass
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.1, 48), mat(0x3e6a3a));
  grass.scale.set(A - 2.6, 1, B - 2.6);
  grass.position.y = 0.02;
  scene.add(grass);
  // track surface: flat ring mesh
  function ringGeo(inner, outer, seg = 72) {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, outer, outer * (B / A), 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, inner, inner * (B / A), 0, Math.PI * 2, true);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, seg);
  }
  const track = new THREE.Mesh(ringGeo(A - 2.4, A + 2.4), new THREE.MeshStandardMaterial({ color: 0xa04a3a, roughness: 0.9 }));
  track.rotation.x = -Math.PI / 2;
  track.position.y = 0.06;
  track.receiveShadow = true;
  scene.add(track);
  // lane lines: thin white rings
  for (const off of [-1.6, -0.8, 0, 0.8, 1.6]) {
    const line = new THREE.Mesh(ringGeo(A + off - 0.03, A + off + 0.03), new THREE.MeshBasicMaterial({ color: 0xf0ead8 }));
    line.rotation.x = -Math.PI / 2;
    line.position.y = 0.075;
    scene.add(line);
  }
  // outer ground
  const outer = new THREE.Mesh(new THREE.BoxGeometry(90, 0.05, 70), mat(0x355030));
  outer.position.y = -0.03;
  scene.add(outer);

  // ---- Wootton signage — unmistakable ----
  function bigSign(text, sub, w, h, x, y, z, ry = 0) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 256;
    const x2 = c.getContext('2d');
    x2.fillStyle = '#1a2a4a';
    x2.fillRect(0, 0, 512, 256);
    x2.strokeStyle = '#c8a040'; x2.lineWidth = 10;
    x2.strokeRect(8, 8, 496, 240);
    x2.fillStyle = '#f0d060';
    x2.font = 'bold 64px Georgia';
    x2.textAlign = 'center';
    x2.fillText(text, 256, 118);
    x2.fillStyle = '#e8e8e8';
    x2.font = 'italic 32px Georgia';
    x2.fillText(sub, 256, 180);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t }));
    m.position.set(x, y, z);
    m.rotation.y = ry;
    scene.add(m);
    return m;
  }
  bigSign('WOOTTON', 'P A T R I O T S', 8, 4, 0, 2.6, -13.4);
  bigSign("KYLIE'S RUN CLUB", 'marathon prep — respect the grind', 6, 3, -14, 2.2, 8, Math.PI / 4);

  // bleachers along one straightaway
  for (let r = 0; r < 4; r++) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 0.9), mat(0x8a9098));
    row.position.set(0, 0.3 + r * 0.5, -13.2 - r * 0.9);
    scene.add(row);
    // little crowd blobs
    for (let s = 0; s < 8; s++) {
      if (Math.random() < 0.55) {
        const spec = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), mat([0xc05050, 0x5070c0, 0xd0c050, 0x60c060][s % 4]));
        spec.position.set(-7 + s * 2, 0.75 + r * 0.5, -13.2 - r * 0.9);
        scene.add(spec);
      }
    }
  }
  // stadium light poles
  for (const [lx, lz] of [[-16, -12], [16, -12], [-16, 12], [16, 12]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 9, 8), mat(0x4a5058));
    pole.position.set(lx, 4.5, lz);
    scene.add(pole);
    const headbar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 0.3), mat(0x3a4048));
    headbar.position.set(lx, 9, lz);
    scene.add(headbar);
    for (let b = 0; b < 4; b++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfff0d0 }));
      bulb.position.set(lx - 0.6 + b * 0.4, 8.8, lz);
      scene.add(bulb);
    }
    const flood = new THREE.PointLight(0xffe8c0, 30, 30);
    flood.position.set(lx, 8.6, lz);
    scene.add(flood);
  }
  // field goal posts at both ends of the infield
  for (const gz of [-6.5, 6.5]) {
    const gp = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.4, 6), mat(0xe8c840));
    post.position.y = 1.7;
    gp.add(post);
    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 6), mat(0xe8c840));
    cross.rotation.z = Math.PI / 2;
    cross.position.y = 2.6;
    gp.add(cross);
    for (const ux of [-1.7, 1.7]) {
      const up = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 6), mat(0xe8c840));
      up.position.set(ux, 3.7, 0);
      gp.add(up);
    }
    gp.position.set(0, 0, gz);
    scene.add(gp);
  }

  // ---- runners on the oval ----
  // parametric position on lane: theta -> x,z (+ derivative for facing)
  function posOnTrack(theta, laneOffset) {
    const r = A + laneOffset;
    return {
      x: r * Math.cos(theta),
      z: (r * (B / A)) * Math.sin(theta),
    };
  }
  function tangentAngle(theta) {
    // derivative direction
    const dx = -A * Math.sin(theta);
    const dz = B * Math.cos(theta);
    return Math.atan2(dx, dz);
  }

  const kylie = makePerson({ photo: faces.kylie, top: 0x5a7ab0, bottom: 0x222230, hair: 0xd8b878, hairStyle: 'long', skin: 0xe8c8a8, name: 'Kylie', });
  scene.add(kylie.group);
  const rivals = [];
  const rivalLooks = [
    { top: 0xc05050, bottom: 0x2c2c34, skin: 0x8a5a3a, hair: 0x111111, hairStyle: 'short', name: 'Maya' },
    { top: 0x50b060, bottom: 0x222230, skin: 0xe8c098, hair: 0x3a2a1a, hairStyle: 'bun', name: 'Jess' },
    { top: 0xe8c840, bottom: 0x1c1c24, skin: 0xb87a50, hair: 0x2a1a12, hairStyle: 'curly', name: 'Devon' },
  ];
  for (const look of rivalLooks) {
    const r = makePerson(look);
    scene.add(r.group);
    rivals.push(r);
  }

  // hurdles in kylie's lane (lane offset 0) at fixed thetas
  const hurdleThetas = [];
  const TOTAL_HURDLES = 7;
  for (let i = 0; i < TOTAL_HURDLES; i++) hurdleThetas.push((i + 1) * (Math.PI * 2 / (TOTAL_HURDLES + 1)));
  const hurdleMeshes = [];
  for (const th of hurdleThetas) {
    const h = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), mat(0xe8e8e8));
    bar.position.y = 0.55;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.03, 0.075), mat(0x1a2a4a));
    stripe.position.y = 0.51;
    h.add(bar, stripe);
    for (const hx of [-0.4, 0.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), mat(0x8a9098));
      leg.position.set(hx, 0.27, 0);
      h.add(leg);
    }
    const p = posOnTrack(th, 0);
    h.position.set(p.x, 0.06, p.z);
    h.rotation.y = tangentAngle(th);
    scene.add(h);
    hurdleMeshes.push(h);
  }

  // race state
  const LAPS = 2;
  let theta = 0;               // kylie's angle position
  let speed = 0;               // angular speed
  let kylieY = 0, kylieVy = 0, airborne = false;
  let hurdleCooldown = 0;
  const rivalsState = rivals.map((r, i) => ({
    theta: -0.05 - i * 0.03,
    lane: (i + 1) * 0.8 - 1.2,
    baseSpeed: 1.42 + i * 0.04, // rad/sec-ish scaled below
    wobble: Math.random() * 6,
  }));
  const BASE_SPEED = 2.1;      // theta units per second scaled
  const SPEED_SCALE = 0.55;    // theta rad per second base
  let raceStarted = false;
  let raceDone = false;
  let startT = 0;
  let lapCount = 0;
  let lastTheta = 0;
  let lapTimes = [];
  let lapStartT = 0;
  let finishOrder = [];
  let place = null;

  // countdown + intro
  setTimeout(async () => {
    await dialogue.play([
      { speaker: 'Kylie', text: 'Wootton track. Two laps, seven hurdles, three very fast friends. Marathon prep doesn\'t care about feelings.' },
      { speaker: 'Maya', text: 'New lap time or it didn\'t happen, Kylie. Ready… set —' },
    ]);
    let cd = 3;
    showObjective('3', 900);
    await new Promise((r) => setTimeout(r, 900));
    showObjective('2', 900);
    await new Promise((r) => setTimeout(r, 900));
    showObjective('1', 900);
    await new Promise((r) => setTimeout(r, 900));
    showObjective('GO! SPACE / tap to hurdle!', 2200);
    raceStarted = true;
    startT = performance.now();
    lapStartT = startT;
  }, 800);

  // HUD
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:40;color:#ffe9b8;font-family:Georgia,serif;font-size:20px;text-shadow:0 2px 6px #000;background:rgba(10,14,26,.55);padding:8px 18px;border-radius:12px;';
  document.body.appendChild(hud);
  const cleanupH = () => hud.remove();
  window.addEventListener('beforeunload', cleanupH);

  let t = 0;
  return {
    update(dt) {
      window.__sceneHooks = { christian: kylie, self: this };
      t += dt;

      // jump input
      if (raceStarted && !raceDone && input.consumeJump && input.consumeJump()) {
        if (!airborne) { kylieVy = 5.6; airborne = true; }
      }
      // gravity on kylie
      if (airborne) {
        kylieVy -= 15 * dt;
        kylieY += kylieVy * dt;
        if (kylieY <= 0) { kylieY = 0; airborne = false; kylieVy = 0; }
      }

      if (raceStarted && !raceDone) {
        // hurdle collision: check nearest hurdle angular distance
        hurdleCooldown -= dt;
        let slowed = false;
        for (const th of hurdleThetas) {
          for (let lap = 0; lap < LAPS; lap++) {
            const hurdleTheta = th + lap * Math.PI * 2;
            const diff = Math.abs((theta % (Math.PI * 2 * LAPS)) - hurdleTheta);
            if (diff < 0.055 && kylieY < 0.35 && hurdleCooldown <= 0) {
              hurdleCooldown = 1.2;
              slowed = true;
              showObjective('💥 clipped the hurdle!', 900);
            }
          }
        }
        const targetSpeed = slowed || hurdleCooldown > 0.6 ? SPEED_SCALE * 0.45 : SPEED_SCALE;
        speed += (targetSpeed - speed) * Math.min(1, dt * (slowed ? 8 : 2.2));
        theta += speed * dt;
        lastTheta = theta;

        // lap counting
        const totalTheta = theta;
        const newLap = Math.floor(totalTheta / (Math.PI * 2));
        if (newLap > lapCount) {
          lapCount = newLap;
          const now = performance.now();
          lapTimes.push((now - lapStartT) / 1000);
          lapStartT = now;
          if (lapCount < LAPS) showObjective(`lap ${lapCount} done — one more!`, 1600);
        }
        if (lapCount >= LAPS && !raceDone) {
          raceDone = true;
          const total = (performance.now() - startT) / 1000;
          place = 1; // computed below against rivals
          for (const rs of rivalsState) {
            if (rs.theta >= Math.PI * 2 * LAPS) place++;
          }
          (async () => {
            if (place === 1) {
              await dialogue.play([
                { speaker: 'Kylie', text: `NEW LAP TIME — ${total.toFixed(1)} seconds for two laps! First place. The marathon doesn't stand a chance.` },
                { speaker: 'Maya', text: 'Okay that was actually fast. Same time Thursday, Kylie\'s Run Club forever.' },
              ]);
              showObjective('🏆 new lap time! Kylie\'s Run Club complete', 6000);
            } else {
              await dialogue.play([
                { speaker: 'Maya', text: `${total.toFixed(1)} — good grind! But ${place === 2 ? 'Maya' : 'the pack'} got you this time. Thursday. Rematch.` },
              ]);
              showObjective(`finished ${place === 2 ? '2nd' : place === 3 ? '3rd' : '4th'} — retry for the lap record!`, 5000);
            }
          })();
        }

        // rivals advance
        for (let i = 0; i < rivalsState.length; i++) {
          const rs = rivalsState[i];
          const wob = Math.sin(t * 2 + rs.wobble) * 0.08;
          if (rs.theta < Math.PI * 2 * LAPS) rs.theta += (rs.baseSpeed * SPEED_SCALE / 1.5 + wob * 0.1) * dt;
          const rp = posOnTrack(rs.theta % (Math.PI * 2), rs.lane);
          const r = rivals[i];
          r.group.position.set(rp.x, 0, rp.z);
          r.group.rotation.y = tangentAngle(rs.theta % (Math.PI * 2));
          r.animateWalk(dt, 2.6);
        }
      }

      // position kylie
      const kp = posOnTrack(theta % (Math.PI * 2), 0);
      kylie.group.position.set(kp.x, kylieY, kp.z);
      kylie.group.rotation.y = tangentAngle(theta % (Math.PI * 2));
      if (raceStarted && !raceDone) kylie.animateWalk(dt, 3.0);
      else kylie.animateIdle(t);

      // chase camera behind kylie
      const tang = tangentAngle(theta % (Math.PI * 2));
      const cx = kp.x - Math.sin(tang) * 5.5;
      const cz = kp.z - Math.cos(tang) * 5.5;
      camera.position.x += (cx - camera.position.x) * Math.min(1, dt * 3.5);
      camera.position.y += (3.4 - camera.position.y) * Math.min(1, dt * 3.5);
      camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 3.5);
      camera.lookAt(kp.x, 1.2, kp.z);

      // HUD
      if (raceStarted) {
        const elapsed = raceDone ? 0 : (performance.now() - startT) / 1000;
        const lap = Math.min(LAPS, lapCount + 1);
        const lapStr = lapTimes.length ? lapTimes.map((lt) => lt.toFixed(1) + 's').join(' · ') : '—';
        hud.innerHTML = raceDone
          ? `🏁 finished — laps: ${lapStr}`
          : `lap ${lap}/${LAPS} · ${elapsed.toFixed(1)}s · best: ${lapStr}`;
      } else {
        hud.textContent = "Kylie's Run Club — Wootton High";
      }
    },
    dispose() { cleanupH(); },
  };
}
