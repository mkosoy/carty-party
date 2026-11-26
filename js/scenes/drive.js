import * as THREE from 'three';
import { showObjective, choice } from '../engine/core.js';
import { asphalt } from '../engine/textures.js';

// Scene 2 — the drive. Part A: cruise with radio stations. Part B: the Yo
// Yogi run — a lane-dodging timer game dodging dentists, environmental
// activists, club goers and AI data centers, with sushi-speed pickups.
export async function driveScene(game) {
  const { scene, camera, input, dialogue } = game;

  scene.background = new THREE.Color(0x9fb4d0);
  scene.fog = new THREE.Fog(0x9fb4d0, 40, 160);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff5e0, 0.7);
  sun.position.set(-10, 20, -10);
  scene.add(sun);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // straight winter highway: 3 lanes each way, grass/snow shoulders
  const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.1, 400), new THREE.MeshStandardMaterial({ map: asphalt(1.5, 30), roughness: 0.95 }));
  road.position.z = -100;
  scene.add(road);
  // lane dashes
  const dashes = [];
  for (let z = 8; z > -290; z -= 6) {
    for (const lx of [-2.3, 2.3]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 2.4), mat(0xf0e9a0));
      d.position.set(lx, 0.06, z);
      scene.add(d);
      dashes.push(d);
    }
  }
  // snow ground both sides
  for (const sx of [-1, 1]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(60, 0.1, 400), mat(0xeef2f7));
    g.position.set(sx * 37, -0.02, -100);
    scene.add(g);
  }
  // trees + snowmen sprinkled on the shoulders
  const decor = [];
  for (let i = 0; i < 60; i++) {
    const side = Math.random() > 0.5 ? 1 : -1;
    const z = -Math.random() * 280;
    if (Math.random() < 0.25) {
      // snowman: two white spheres + carrot
      const sm = new THREE.Group();
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), mat(0xffffff));
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), mat(0xffffff));
      b2.position.y = 0.75;
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), mat(0xff7733));
      nose.position.set(0, 0.78, 0.34);
      nose.rotation.x = Math.PI / 2;
      sm.add(b1, b2, nose);
      sm.position.set(side * (9 + Math.random() * 20), 0.5, z);
      scene.add(sm);
      decor.push(sm);
    } else if (Math.random() < 0.42) {
      // pine with snow
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), mat(0x5a4030));
      trunk.position.y = 0.4;
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 8), mat(0x2a4a33));
      leaves.position.y = 1.9;
      const snowCap = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 8), mat(0xf4f8ff));
      snowCap.position.y = 2.7;
      t.add(trunk, leaves, snowCap);
      const s = 0.8 + Math.random() * 1.4;
      t.scale.setScalar(s);
      t.position.set(side * (9 + Math.random() * 24), 0, z);
      scene.add(t);
      decor.push(t);
    } else if (Math.random() < 0.5) {
      // strip mall — rockville pike energy: brick box, colorful awning, sign band
      const sm = new THREE.Group();
      const brick = new THREE.Mesh(new THREE.BoxGeometry(9 + Math.random() * 5, 3.2, 4), mat(0x9a6a52));
      brick.position.y = 1.6;
      sm.add(brick);
      const awning = new THREE.Mesh(new THREE.BoxGeometry(brick.geometry.parameters.width, 0.5, 0.6), mat([0xc04040, 0x3070c0, 0x40a060, 0xd0a030][Math.floor(Math.random() * 4)]));
      awning.position.set(0, 2.2, 2.1);
      sm.add(awning);
      const band = new THREE.Mesh(new THREE.BoxGeometry(brick.geometry.parameters.width, 0.7, 0.15), mat(0xf0ead8));
      band.position.set(0, 3.2, 2.0);
      sm.add(band);
      const snowRoof = new THREE.Mesh(new THREE.BoxGeometry(brick.geometry.parameters.width + 0.2, 0.15, 4.2), mat(0xf4f8ff));
      snowRoof.position.y = 3.3;
      sm.add(snowRoof);
      sm.position.set(side * (12 + Math.random() * 8), 0, z);
      scene.add(sm);
      decor.push(sm);
    } else {
      // downtown bethesda style office block: glassy with snow cap
      const ob = new THREE.Group();
      const h = 6 + Math.random() * 8;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(5 + Math.random() * 3, h, 5), new THREE.MeshStandardMaterial({ color: 0x4a6a8a, roughness: 0.3, metalness: 0.5 }));
      tower.position.y = h / 2;
      ob.add(tower);
      const snowRoof = new THREE.Mesh(new THREE.BoxGeometry(tower.geometry.parameters.width + 0.2, 0.2, 5.2), mat(0xf4f8ff));
      snowRoof.position.y = h + 0.1;
      ob.add(snowRoof);
      ob.position.set(side * (14 + Math.random() * 10), 0, z);
      scene.add(ob);
      decor.push(ob);
    }
  }
  // gantry signs overhead — the real route: bethesda → rockville → gaithersburg
  const signTexts = [
    ['Bethesda Row', 'NEXT 2 LIGHTS'],
    ['Rockville Pike', 'MD-355 NORTH'],
    ['I-270 Gaithersburg', 'KEEP RIGHT'],
    ['Gaithersburg', 'NEXT EXIT'],
    ['🍣 Yo Yogi', 'EXIT 11 — 1 MILE'],
  ];
  for (let i = 0; i < signTexts.length; i++) {
    const cnv = document.createElement('canvas');
    cnv.width = 512; cnv.height = 192;
    const cx2 = cnv.getContext('2d');
    cx2.fillStyle = '#0a5c36';
    cx2.fillRect(0, 0, 512, 192);
    cx2.strokeStyle = '#ffffff';
    cx2.lineWidth = 6;
    cx2.strokeRect(8, 8, 496, 176);
    cx2.fillStyle = '#ffffff';
    cx2.font = 'bold 52px Arial';
    cx2.textAlign = 'center';
    cx2.fillText(signTexts[i][0], 256, 82);
    cx2.font = 'bold 34px Arial';
    cx2.fillText(signTexts[i][1], 256, 142);
    const tex = new THREE.CanvasTexture(cnv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sg = new THREE.Group();
    const panel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.4, 0.15), new THREE.MeshBasicMaterial({ map: tex }));
    panel.position.y = 5.2;
    sg.add(panel);
    for (const gx of [-2.8, 2.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 5.2, 6), mat(0x6a7078));
      post.position.set(gx, 2.6, 0);
      sg.add(post);
    }
    sg.position.set(0, 0, -40 - i * 52);
    scene.add(sg);
    decor.push(sg);
  }
  // distant Baltimore skyline hint far ahead
  for (let i = 0; i < 8; i++) {
    const h = 4 + Math.random() * 8;
    const b = new THREE.Mesh(new THREE.BoxGeometry(3, h, 3), mat(0x8a93a8));
    b.position.set(-10 + i * 3.2, h / 2, -285);
    scene.add(b);
  }

  // the car: boxy sedan, visible in third person
  const car = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.2), mat(0x8a2f2f));
  body.position.y = 0.55;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.1), mat(0x2c3140));
  cabin.position.set(0, 1.05, 0.2);
  car.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.25, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, mat(0x1a1a1a));
    w.position.set(wx, 0.34, wz);
    car.add(w);
  }
  car.position.set(0, 0, 0);
  scene.add(car);

  // ---- drive richness pass ----
  // guardrails both sides
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.5, 400), mat(0x9aa0a8));
    rail.position.set(sx * 7.6, 0.55, -100);
    scene.add(rail);
    const posts = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 400), mat(0x777d85));
    posts.position.set(sx * 7.7, 0.3, -100);
    scene.add(posts);
    decor.push(rail, posts);
  }
  // green highway signs (very I-270): MoCo exits
  function roadSign(text, x, z) {
    const g = new THREE.Group();
    const c = document.createElement('canvas');
    c.width = 512; c.height = 200;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0a5c2e';
    ctx.fillRect(0, 0, 512, 200);
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 188);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.textAlign = 'center';
    const lines = text.split('|');
    lines.forEach((ln, i) => ctx.fillText(ln, 256, 78 + i * 62));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 2), new THREE.MeshBasicMaterial({ map: t }));
    panel.position.y = 4.6;
    g.add(panel);
    for (const px of [-2.2, 2.2]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.8, 6), mat(0x6a7078));
      post.position.set(px, 2.3, -0.1);
      g.add(post);
    }
    g.position.set(x, 0, z);
    scene.add(g);
    decor.push(g);
    return g;
  }
  roadSign('Rockville 2|Gaithersburg 5', 5.5, -60);
  roadSign('Yo Yogi Sushi|NEXT RIGHT', 5.5, -160);
  roadSign('Baltimore 28|Washington 22', -5.5, -230);
  // yo yogi billboard on the right shoulder — the payoff landmark
  const bbC = document.createElement('canvas');
  bbC.width = 512; bbC.height = 256;
  const bx = bbC.getContext('2d');
  const bbG = bx.createLinearGradient(0, 0, 0, 256);
  bbG.addColorStop(0, '#c02838'); bbG.addColorStop(1, '#801828');
  bx.fillStyle = bbG; bx.fillRect(0, 0, 512, 256);
  bx.fillStyle = '#ffe9c8';
  bx.font = 'bold 72px Georgia';
  bx.textAlign = 'center';
  bx.fillText('YO YOGI', 256, 110);
  bx.font = 'italic 34px Georgia';
  bx.fillText('sushi worth speeding for', 256, 165);
  bx.font = '28px Arial';
  bx.fillText('🍣 since 1987 🍣', 256, 215);
  const bbT = new THREE.CanvasTexture(bbC);
  bbT.colorSpace = THREE.SRGBColorSpace;
  const bb = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: bbT }));
  bb.position.set(11, 4.5, -120);
  bb.rotation.y = -0.4;
  scene.add(bb);
  decor.push(bb);
  const bbPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.2, 8), mat(0x5a5048));
  bbPole.position.set(11, 1.6, -120);
  scene.add(bbPole);
  decor.push(bbPole);
  // overpass in the distance
  const op = new THREE.Mesh(new THREE.BoxGeometry(22, 1, 3), mat(0x8a8f98));
  op.position.set(0, 5.5, -200);
  scene.add(op);
  for (const ox of [-8, 8]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1, 5, 2), mat(0x787d85));
    leg.position.set(ox, 2.5, -200);
    scene.add(leg);
  }
  decor.push(op);
  // car detail: headlights glow, taillights, grill
  const headL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  headL.position.set(-0.6, 0.6, -2.12);
  car.add(headL);
  const headR = headL.clone();
  headR.position.x = 0.6;
  car.add(headR);
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.05), new THREE.MeshBasicMaterial({ color: 0xd03030 }));
  tailL.position.set(-0.6, 0.6, 2.12);
  car.add(tailL);
  const tailR = tailL.clone();
  tailR.position.x = 0.6;
  car.add(tailR);
  // side mirrors
  for (const mx of [-1.0, 1.0]) {
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.2), mat(0x8a2f2f));
    mir.position.set(mx, 1.0, -0.6);
    car.add(mir);
  }
  // distant mountains / tree line silhouette strip
  for (let i = 0; i < 20; i++) {
    const tr = new THREE.Mesh(new THREE.ConeGeometry(2 + Math.random() * 2, 4 + Math.random() * 3, 6), mat(0x4a5a52));
    tr.position.set(-60 + i * 6.5, 2, -285 + Math.random() * 10);
    scene.add(tr);
  }


  camera.position.set(0, 4.4, 8.5);
  camera.lookAt(0, 0.8, -6);
  function chaseCam(dt) {
    // locked chase view: behind and above the car, tracking its lane position
    const tx = car.position.x * 0.85;
    camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 5);
    camera.position.y = 4.4;
    camera.position.z = 8.5;
    camera.lookAt(car.position.x * 0.9, 0.8, -8);
  }

  // ---- radio system ----
  const stations = [
    { freq: '88.5', name: 'WAMU — NPR murmuring about the metro', jingle: 'soft thoughtful tones' },
    { freq: '94.7', name: 'The Drive — classic rock block', jingle: 'ZZ Top riff' },
    { freq: '99.5', name: 'Hot 99.5 — the same 6 pop songs in rotation', jingle: 'hyperpop jingle' },
    { freq: '103.5', name: 'WMZQ — county road country', jingle: 'steel guitar twang' },
    { freq: '101.1', name: 'DC101 — jingling all the way, already', jingle: 'sleigh bells' },
  ];
  let stationIdx = 1;

  // ---- phases ----
  let phase = 'intro';

  // lane dodger state
  const LANES = [-4.6, -2.3, 0, 2.3, 4.6];
  let carLaneX = 0, speed = 14, timer = 100, score = 0, finished = false, crashed = false;
  const obstacles = [];
  const pickups = [];
  let spawnTimer = 0, pickupTimer = 4;

  function makeObstacle(kind) {
    const g = new THREE.Group();
    let color, label;
    if (kind === 'dentist') { color = 0xffffff; label = '🦷 dentist'; }
    else if (kind === 'activist') { color = 0x2e8b57; label = '🌲 activist'; }
    else if (kind === 'clubber') { color = 0xd24fd0; label = '🕺 club goer'; }
    else { color = 0x3a3f4a; label = '🖥 AI data center'; }
    if (kind === 'datacenter') {
      const box = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 2.2), mat(0x39404f));
      box.position.y = 0.8;
      g.add(box);
      const led = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.1, 0.1), new THREE.MeshBasicMaterial({ color: 0x50ff70 }));
      led.position.set(0, 1.2, 1.12);
      g.add(led);
    } else {
      const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 4, 8), mat(color));
      p.position.y = 0.95;
      g.add(p);
    }
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    g.position.set(lane, 0, -150);
    scene.add(g);
    obstacles.push({ g, kind });
  }

  function makePickup() {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 10), mat(0x222222));
    roll.rotation.z = Math.PI / 2;
    roll.position.y = 0.4;
    const rice = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.52, 10), mat(0xffffff));
    rice.rotation.z = Math.PI / 2;
    rice.position.y = 0.4;
    g.add(roll, rice);
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    g.position.set(lane, 0, -150);
    scene.add(g);
    pickups.push(g);
  }

  // snow
  const snowCount = 400;
  const snowGeo = new THREE.BufferGeometry();
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 60;
    snowPos[i * 3 + 1] = Math.random() * 14;
    snowPos[i * 3 + 2] = -Math.random() * 60 + 8;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.15 }));
  scene.add(snow);

  // ---- narrative intro ----
  player_frozen: {
    await dialogue.play([
      { speaker: 'Christian', text: 'Okay — car smells like winter. First stop Olivia’s, then the swap in Baltimore.' },
      { speaker: 'Christian', text: 'Let’s see what’s on the radio…' },
    ]);
    showObjective('Cruise down the parkway — tap E to flip radio stations.', 6000);
    phase = 'cruise';
  }

  let cruiseTimer = 0;
  let radioBanner = 0;

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      chaseCam(dt);
      // snow everywhere always
      const pos = snow.geometry.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        pos.array[i * 3 + 1] -= dt * 1.8;
        pos.array[i * 3 + 2] += dt * 6;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 14;
        if (pos.array[i * 3 + 2] > 8) pos.array[i * 3 + 2] = -52;
      }
      pos.needsUpdate = true;

      if (phase === 'cruise') {
        cruiseTimer += dt;
        // gentle auto-drive illusion: dashes scroll
        for (const d of dashes) {
          d.position.z += dt * 10;
          if (d.position.z > 8) d.position.z -= 298;
        }
        for (const dc of decor) {
          dc.position.z += dt * 10;
          if (dc.position.z > 10) dc.position.z -= 290;
        }
        if (input.consumeInteract()) {
          stationIdx = (stationIdx + 1) % stations.length;
          const st = stations[stationIdx];
          showObjective(`📻 ${st.freq} — ${st.name}`, 3200);
        }
        if (cruiseTimer > 4.5 && !this._uberStarted) {
          this._uberStarted = true;
          phase = 'uberCall';
          (async () => {
            document.getElementById('phone-caller').textContent = 'Uber — new request';
            document.getElementById('phone-overlay').classList.remove('hidden');
            await new Promise((r) => setTimeout(r, 2200));
            document.getElementById('phone-overlay').classList.add('hidden');
            await dialogue.play([
              { speaker: 'Passenger', text: 'Hey! Thanks for stopping — no time to waste.' },
              { speaker: 'Passenger', text: 'I just ordered from Yo Yogi, but they close in 20 minutes. I’ll pay you double if you can get there.' },
              { speaker: 'Christian', text: 'No problem — I’m heading that way now. Buckle in, bronco.' },
            ]);
            phase = 'run';
            showObjective('YO YOGI RUN — dodge everything, grab sushi rolls for speed! A/D or joystick to steer.', 7000);
            this._timerShown = true;
          })();
        }
      }

      if (phase === 'run' && !finished) {
        // steering
        const { x } = input.axes();
        carLaneX = Math.max(-5.5, Math.min(5.5, carLaneX + x * dt * 9));
        car.position.x += (carLaneX - car.position.x) * Math.min(1, dt * 8);
        car.rotation.z = -x * 0.12;
        car.rotation.y = -x * 0.2;

        timer -= dt;
        const sp = document.getElementById('objective-banner');
        sp.classList.remove('hidden');
        const mm = Math.max(0, Math.floor(timer / 10));
        const ss = Math.max(0, Math.floor((timer % 10) * 6));
        sp.textContent = `🍣 Yo Yogi closes soon! ${mm}:${String(ss).padStart(2, '0')} — speed x${(speed / 14).toFixed(1)}`;

        if (timer <= 0 && !finished) {
          finished = true;
          crashed = false;
          (async () => {
            await dialogue.play([
              { speaker: 'Passenger', text: 'They’re closing… we missed it. Ah man.' },
              { speaker: 'Christian', text: '…Or did we? Watch this. (You can retry — I believe in us.)' },
            ]);
            // retry
            timer = 100; finished = false; speed = 14;
            for (const o of obstacles) scene.remove(o.g);
            obstacles.length = 0;
          })();
        }

        // spawn obstacles
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          const kinds = ['dentist', 'activist', 'clubber', 'datacenter'];
          makeObstacle(kinds[Math.floor(Math.random() * kinds.length)]);
          spawnTimer = Math.max(0.5, 1.5 - (100 - timer) * 0.008);
        }
        pickupTimer -= dt;
        if (pickupTimer <= 0) { makePickup(); pickupTimer = 5 + Math.random() * 3; }

        // move world toward car
        const dz = speed * dt;
        for (const d of dashes) {
          d.position.z += dz;
          if (d.position.z > 8) d.position.z -= 298;
        }
        for (const dc of decor) {
          dc.position.z += dz;
          if (dc.position.z > 10) dc.position.z -= 290;
        }
        for (let i = obstacles.length - 1; i >= 0; i--) {
          const o = obstacles[i];
          o.g.position.z += dz;
          if (o.g.position.z > 8) { scene.remove(o.g); obstacles.splice(i, 1); continue; }
          // collision with car (car at z≈0)
          if (Math.abs(o.g.position.z - car.position.z) < 1.6 && Math.abs(o.g.position.x - car.position.x) < 1.3) {
            scene.remove(o.g);
            obstacles.splice(i, 1);
            speed = Math.max(9, speed - 4);
            camera.position.x += (Math.random() - 0.5) * 0.3;
            score++;
            const names = { dentist: 'A dentist! flossing in the road!', activist: 'Environmental activist chaining himself to the lane!', clubber: 'Club goer still out from last night!', datacenter: 'An entire AI data center, in the road, in MoCo!' };
            showObjective('💥 ' + (names[o.kind] || 'Obstacle!') + ' Speed lost!', 1800);
          }
        }
        for (let i = pickups.length - 1; i >= 0; i--) {
          const p = pickups[i];
          p.position.z += dz;
          p.rotation.x += dt * 3;
          if (p.position.z > 8) { scene.remove(p); pickups.splice(i, 1); continue; }
          if (Math.abs(p.position.z - car.position.z) < 1.6 && Math.abs(p.position.x - car.position.x) < 1.3) {
            scene.remove(p);
            pickups.splice(i, 1);
            speed = Math.min(30, speed + 3.5);
            showObjective('🍣 sushi speed boost!', 1200);
          }
        }

        // arrival: cover enough distance before timer ends
        this._distance = (this._distance || 0) + dz;
        if (this._distance > (window.__runDistance || 1400) && !finished) {
          finished = true;
          (async () => {
            document.getElementById('objective-banner').classList.add('hidden');
            await dialogue.play([
              { speaker: 'Passenger', text: 'YO YOGI! There — the little sushi spot with the fogged-up windows! You made it!' },
              { speaker: 'Passenger', text: 'Thanks, Christian. Seriously.' },
              { speaker: 'Christian', text: 'No problem. Forget about the tip, though.' },
              { speaker: 'Passenger', text: 'All right… but here — free roll of sushi. You earned it, bronco.' },
              { speaker: 'Christian', text: 'Okay. NOW to Olivia’s. Baltimore after that.' },
            ]);
            const { houseScene } = await import('./house.js');
            game.switchScene(houseScene);
          })();
        }
      }
    },
    dispose() {
      document.getElementById('objective-banner').classList.add('hidden');
    },
  };
}
