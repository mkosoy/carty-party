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
    panel.position.y = 9.2;
    sg.add(panel);
    for (const gx of [-2.8, 2.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 9.2, 6), mat(0x6a7078));
      post.position.set(gx, 4.6, 0);
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
  // car detail pass: sloped hood, windshield glass, glowing lights, mirrors
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 1.1), mat(0x8a2f2f));
  hood.position.set(0, 0.85, -1.5);
  hood.rotation.x = 0.1;
  car.add(hood);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x8ab8d8, roughness: 0.1, metalness: 0.4 });
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.42, 0.06), glassMat);
  windshield.position.set(0, 1.08, -0.88);
  windshield.rotation.x = 0.42;
  car.add(windshield);
  for (const sx of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.16), mat(0x8a2f2f));
    mirror.position.set(sx * 1.0, 1.0, -0.6);
    car.add(mirror);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    tail.position.set(sx * 0.68, 0.62, 2.12);
    car.add(tail);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
    head.position.set(sx * 0.66, 0.62, -2.12);
    car.add(head);
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

  // ---- radio audio: each station sounds like itself ----
  const radioAC = () => {
    if (!window.__ac) window.__ac = new (window.AudioContext || window.webkitAudioContext)();
    if (window.__ac.state === 'suspended') window.__ac.resume().catch(() => {});
    return window.__ac;
  };
  let radioNodes = null;
  function stopRadio() {
    if (!radioNodes) return;
    for (const n of radioNodes.all) { try { n.stop ? n.stop() : n.disconnect(); } catch {} }
    for (const iv of radioNodes.ivs) clearInterval(iv);
    radioNodes = null;
  }
  window.__radioStop = stopRadio;
  function noiseBufAC(AC, secs = 1.5) {
    const buf = AC.createBuffer(1, AC.sampleRate * secs, AC.sampleRate);
    const dd = buf.getChannelData(0);
    for (let i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
    return buf;
  }
  function startRadio(idx) {
    stopRadio();
    const AC = radioAC();
    const master = AC.createGain();
    master.gain.value = 0;
    master.connect(AC.destination);
    master.gain.linearRampToValueAtTime(0.09, AC.currentTime + 0.8);
    const all = [master];
    const nodes = { all, ivs: [] };
    const N2 = (semi, base = 220) => base * Math.pow(2, semi / 12);

    if (idx === 0) {
      // WAMU NPR: speech-cadence murmur — bandpassed noise gated in bursts
      const src = AC.createBufferSource();
      src.buffer = noiseBufAC(AC, 2); src.loop = true;
      const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 300; bp.Q.value = 2.5;
      const gate = AC.createGain(); gate.gain.value = 0;
      src.connect(bp); bp.connect(gate); gate.connect(master);
      src.start();
      all.push(src, bp, gate);
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        // speech-like bursts: talk for a bit, pause
        const talking = Math.random() > 0.25;
        gate.gain.setTargetAtTime(talking ? 0.5 + Math.random() * 0.3 : 0.02, t, 0.09);
      }, 420));
    } else if (idx === 4) {
      // DC101 christmas: sleigh bells — bright metallic noise bursts in a swinging pattern
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        for (let k = 0; k < 2; k++) {
          const src = AC.createBufferSource();
          src.buffer = noiseBufAC(AC, 0.06);
          const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000;
          const g = AC.createGain();
          g.gain.setValueAtTime(0.5, t + k * 0.09);
          g.gain.exponentialRampToValueAtTime(0.001, t + k * 0.09 + 0.14);
          src.connect(hp); hp.connect(g); g.connect(master);
          src.start(t + k * 0.09);
        }
      }, 460));
      // underneath: soft pad of a familiar progression
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        [0, 4, 7].forEach((s) => {
          const o = AC.createOscillator();
          o.type = 'sine'; o.frequency.value = N2(s, 330);
          const g = AC.createGain();
          g.gain.setValueAtTime(0.05, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
          o.connect(g); g.connect(master);
          o.start(t); o.stop(t + 1.9);
        });
      }, 1900));
    } else if (idx === 1) {
      // The Drive classic rock: chugging power-chord riff
      const riff = [0, 0, 3, 0, 5, 3, 0, -2];
      let ri = 0;
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        const semi = riff[ri % riff.length]; ri++;
        for (const det of [0, 7]) {
          const o = AC.createOscillator();
          o.type = 'sawtooth'; o.frequency.value = N2(semi + det - 12, 220);
          const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
          const g = AC.createGain();
          g.gain.setValueAtTime(0.14, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          o.connect(f); f.connect(g); g.connect(master);
          o.start(t); o.stop(t + 0.26);
        }
      }, 240));
    } else if (idx === 2) {
      // Hot 99.5 pop: bright arpeggio loop
      const arp = [0, 4, 7, 12, 7, 4];
      let ai = 0;
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        const o = AC.createOscillator();
        o.type = 'square'; o.frequency.value = N2(arp[ai % arp.length], 440);
        ai++;
        const g = AC.createGain();
        g.gain.setValueAtTime(0.05, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.22);
      }, 190));
    } else {
      // WMZQ country: alternating twangy bass two-step
      const line = [0, 7, 0, 7, 3, 7, 5, 7];
      let ci = 0;
      nodes.ivs.push(setInterval(() => {
        const t = AC.currentTime;
        const o = AC.createOscillator();
        o.type = 'triangle'; o.frequency.value = N2(line[ci % line.length] - 12, 220);
        ci++;
        const g = AC.createGain();
        g.gain.setValueAtTime(0.16, t);
        // twang: fast pitch drop at the start
        o.frequency.setValueAtTime(N2(line[(ci - 1) % line.length] - 12, 220) * 1.06, t);
        o.frequency.exponentialRampToValueAtTime(N2(line[(ci - 1) % line.length] - 12, 220), t + 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.32);
      }, 270));
    }
    radioNodes = nodes;
  }


  // ---- phases ----
  let phase = 'intro';

  // lane dodger state
  const LANES = [-4.6, -2.3, 0, 2.3, 4.6];
  let carLaneX = 0, speed = 19, timer = 100, score = 0, finished = false, crashed = false;
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
      // person-shaped hazard with simple head so it reads as a pedestrian
      const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.9, 4, 8), mat(color));
      p.position.y = 0.95;
      g.add(p);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat(0xe8c098));
      hd.position.y = 1.85;
      g.add(hd);
    }
    // floating label so the joke lands at speed: always faces the camera
    const lc = document.createElement('canvas');
    lc.width = 256; lc.height = 64;
    const lx = lc.getContext('2d');
    lx.fillStyle = 'rgba(0,0,0,0.65)';
    lx.beginPath();
    lx.roundRect(0, 0, 256, 64, 14);
    lx.fill();
    lx.font = 'bold 30px Arial';
    lx.textAlign = 'center';
    lx.fillStyle = '#ffe9b8';
    lx.fillText(label, 128, 42);
    const ltex = new THREE.CanvasTexture(lc);
    ltex.colorSpace = THREE.SRGBColorSpace;
    const lsprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ltex, depthTest: false }));
    lsprite.scale.set(2.4, 0.6, 1);
    lsprite.position.y = 2.6;
    g.add(lsprite);
    const lane = LANES[Math.floor(Math.random() * LANES.length)];
    g.position.set(lane, 0, -150);
    scene.add(g);
    obstacles.push({ g, kind });
  }

  function makePickup() {
    // a proper thanksgiving turkey: round brown body, fan of tail feathers,
    // head with beak + red wattle — clearly a turkey at speed
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), mat(0x7a4a26));
    body.position.y = 0.45;
    body.scale.set(1, 1.1, 0.9);
    g.add(body);
    // tail feather fan behind
    const fanColors = [0xd07820, 0xc04030, 0xe0a030, 0x9a5020, 0xd07820];
    for (let fi = 0; fi < 5; fi++) {
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.5, 5), mat(fanColors[fi]));
      const fa = (-0.5 + fi * 0.25) * Math.PI * 0.8;
      feather.position.set(Math.sin(fa) * 0.28, 0.55 + Math.cos(fa) * 0.18, 0.22);
      feather.rotation.x = -0.5;
      feather.rotation.z = -fa;
      g.add(feather);
    }
    // head on a little neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.28, 8), mat(0x8a5a30));
    neck.position.set(0, 0.85, -0.18);
    neck.rotation.x = 0.3;
    g.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), mat(0x3a6a9a));
    head.position.set(0, 1.0, -0.26);
    g.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.14, 6), mat(0xe0a030));
    beak.position.set(0, 0.99, -0.38);
    beak.rotation.x = -Math.PI / 2;
    g.add(beak);
    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(0xd02030));
    wattle.position.set(0, 0.9, -0.33);
    wattle.scale.set(0.7, 1.4, 0.7);
    g.add(wattle);
    // golden halo ring so it reads as a boost pickup
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.045, 8, 24), new THREE.MeshBasicMaterial({ color: 0xffd663 }));
    halo.rotation.x = Math.PI / 2;
    halo.position.y = 0.12;
    g.add(halo);
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
    setTimeout(() => { try { startRadio(stationIdx); } catch {} }, 1200); // auto-start the radio
    phase = 'cruise';
  }

  let cruiseTimer = 0;
  let radioBanner = 0;


  window.__sceneHint = '\u2190 \u2192 steer \u00b7 avoid the hazards \u00b7 grab turkeys for speed boost';
  // the mormon temple on 495 — the most recognizable moco drive landmark: white spires glowing
  const temple = new THREE.Group();
  const tbase = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3), new THREE.MeshStandardMaterial({ color: 0xe8e8f0, emissive: 0x8890a8, emissiveIntensity: 0.25 }));
  tbase.position.y = 1.25;
  temple.add(tbase);
  for (const [sx, h] of [[-1.4, 3.2], [0, 4.6], [1.4, 3.2]]) {
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, h, 6), new THREE.MeshStandardMaterial({ color: 0xf0f0f8, emissive: 0x99a0b8, emissiveIntensity: 0.3 }));
    spire.position.set(sx, 2.5 + h / 2, 0);
    temple.add(spire);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.1, 6), new THREE.MeshStandardMaterial({ color: 0xc8a040, emissive: 0xc8a040, emissiveIntensity: 0.5 }));
    tip.position.set(sx, 2.5 + h + 0.55, 0);
    temple.add(tip);
  }
  temple.position.set(14, 0, -190);
  temple.scale.set(1.6, 1.6, 1.6);
  scene.add(temple);
  decor.push(temple);

  // oncoming traffic: a parallel carriageway to the left with headlights streaming past
  const onRoad = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 400), new THREE.MeshStandardMaterial({ color: 0x2c2e32, roughness: 0.95 }));
  onRoad.position.set(-13.5, 0.01, -100);
  scene.add(onRoad);
  const traffic = [];
  function makeTrafficCar() {
    const tc = new THREE.Group();
    const tcol = [0x4a5a6a, 0x6a4a4a, 0x3a3a3e, 0x7a7a82, 0x2a4a3a][Math.floor(Math.random() * 5)];
    const tb = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 4), mat(tcol));
    tb.position.y = 0.55;
    tc.add(tb);
    const tcab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 2), mat(0x2c3140));
    tcab.position.set(0, 1, 0.2);
    tc.add(tcab);
    // headlights: bright glows facing the camera
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.06), new THREE.MeshBasicMaterial({ color: 0xfff5d0 }));
      hl.position.set(hx, 0.55, 2.02);
      tc.add(hl);
    }
    for (const tx of [-0.6, 0.6]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xff2828 }));
      tl.position.set(tx, 0.55, -2.02);
      tc.add(tl);
    }
    const lane = [-16.5, -13.5, -10.5][Math.floor(Math.random() * 3)];
    tc.position.set(lane, 0, -270 - Math.random() * 30);
    scene.add(tc);
    traffic.push(tc);
    return tc;
  }
  for (let i = 0; i < 5; i++) {
    const t = makeTrafficCar();
    t.position.z = -40 - i * 55 - Math.random() * 20;
  }

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
        for (const tc of traffic) {
          tc.position.z += dt * 19;
          if (tc.position.z > 14) {
            tc.position.z = -270 - Math.random() * 40;
            tc.position.x = [-16.5, -13.5, -10.5][Math.floor(Math.random() * 3)];
          }
        }
        if (input.consumeInteract()) {
          stationIdx = (stationIdx + 1) % stations.length;
          const st = stations[stationIdx];
          showObjective(`📻 ${st.freq} — ${st.name}`, 3200);
          try { startRadio(stationIdx); } catch {}
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
            showObjective('YO YOGI RUN — dodge everything, grab turkeys for speed! A/D or joystick to steer.', 7000);
            this._timerShown = true;
          })();
        }
      }

      if (phase === 'run' && !finished) {
        // steering
        const { x } = input.axes();
        carLaneX = Math.max(-5.5, Math.min(5.5, carLaneX + x * dt * 17));
        car.position.x += (carLaneX - car.position.x) * Math.min(1, dt * 13);
        car.rotation.z = -x * 0.12;
        car.rotation.y = -x * 0.2;

        timer -= dt;
        const sp = document.getElementById('objective-banner');
        sp.classList.remove('hidden');
        const mm = Math.max(0, Math.floor(timer / 10));
        const ss = Math.max(0, Math.floor((timer % 10) * 6));
        sp.textContent = `🍣 Yo Yogi closes soon! ${mm}:${String(ss).padStart(2, '0')} — speed x${(speed / 19).toFixed(1)}`;

        if (timer <= 0 && !finished) {
          finished = true;
          crashed = false;
          (async () => {
            await dialogue.play([
              { speaker: 'Passenger', text: 'They’re closing… we missed it. Ah man.' },
              { speaker: 'Christian', text: '…Or did we? Watch this. (You can retry — I believe in us.)' },
            ]);
            // retry
            timer = 100; finished = false; speed = 19;
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
        // oncoming traffic streams toward camera faster than the world scroll
        for (const tc of traffic) {
          tc.position.z += dz * 1.9;
          if (tc.position.z > 14) {
            tc.position.z = -270 - Math.random() * 40;
            tc.position.x = [-16.5, -13.5, -10.5][Math.floor(Math.random() * 3)];
          }
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
        if (this._distance > (window.__runDistance || 1050) && !finished) {
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
            const c = await choice(['🦃 Run it back — retry the Yo Yogi run', "Continue to Olivia's"]);
            if (c === 0) {
              const { driveScene } = await import('./drive.js');
              game.switchScene(driveScene);
            } else {
              const { houseScene } = await import('./house.js');
              game.switchScene(houseScene);
            }
          })();
        }
      }
    },
    dispose() {
      document.getElementById('objective-banner').classList.add('hidden');
    },
  };
}
