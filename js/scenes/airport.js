import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, phoneOverlay, choice } from '../engine/core.js';

// Scene 1 — Washington Dulles. Long concourse, big windows looking at snow,
// seating rows, a wall TV playing "Churchill vs Wooton: The Big Game",
// arrivals signage, and the phone call from Stacy that starts the story.
export async function airportScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x2a3a55);
  scene.fog = new THREE.Fog(0x2a3a55, 45, 130);

  // lighting: cool terminal light + warm spots
  scene.add(new THREE.AmbientLight(0xd8e2f2, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
  sun.position.set(8, 14, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const mat = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const bounds = [];
  const solid = (mesh, pad = 0) => {
    mesh.updateMatrixWorld();
    const b = new THREE.Box3().setFromObject(mesh);
    bounds.push({ minX: b.min.x - pad, maxX: b.max.x + pad, minZ: b.min.z - pad, maxZ: b.max.z + pad });
  };

  // floor: polished terrazzo-ish
  const floor = new THREE.Mesh(new THREE.BoxGeometry(60, 0.2, 26), mat(0x9aa0b4));
  floor.position.y = -0.1;
  floor.receiveShadow = true;
  scene.add(floor);

  // curved-roof hint: a series of white arches overhead (Dulles' iconic curve)
  for (let i = -3; i <= 3; i++) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(13, 0.35, 8, 24, Math.PI), mat(0xe8ecf2));
    arch.position.set(i * 8, 0, 0);
    arch.rotation.y = Math.PI / 2;
    arch.scale.y = 0.5;
    scene.add(arch);
  }

  // window wall (north, -z): glass panels with snowy airfield beyond
  const windowWall = new THREE.Mesh(new THREE.BoxGeometry(60, 7, 0.3), new THREE.MeshLambertMaterial({ color: 0x6f87a8, transparent: true, opacity: 0.35 }));
  windowWall.position.set(0, 3.5, -12.8);
  scene.add(windowWall);
  solid(windowWall);
  // mullions
  for (let x = -28; x <= 28; x += 4) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.25, 7, 0.4), mat(0x39404f));
    mull.position.set(x, 3.5, -12.8);
    scene.add(mull);
  }
  // snow field outside + a parked plane silhouette
  const field = new THREE.Mesh(new THREE.BoxGeometry(90, 0.1, 30), mat(0xf2f5fa));
  field.position.set(0, -0.05, -28);
  scene.add(field);
  const plane = new THREE.Group();
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 12, 12), mat(0xd7dbe2));
  fus.rotation.z = Math.PI / 2;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.8, 0.3), mat(0x2f4d8f));
  tail.position.set(-5.6, 1.8, 0);
  plane.add(fus, tail);
  plane.position.set(-12, 1.2, -24);
  scene.add(plane);

  // back wall (south) with signage
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(60, 7, 0.3), mat(0x3c4356));
  backWall.position.set(0, 3.5, 12.8);
  scene.add(backWall);
  solid(backWall);
  // east/west walls
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 26), mat(0x454c60));
    w.position.set(sx * 29.8, 3.5, 0);
    scene.add(w);
    solid(w);
  }

  // signage texture helper
  function textSign(text, w = 6, h = 1.2, bg = '#182130', fg = '#ffd663', font = 54) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = Math.round(512 * h / w);
    const ctx = c.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = fg;
    ctx.font = `bold ${font}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, c.width / 2, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  }

  const sign = textSign('Washington Dulles International', 12, 1.4);
  sign.position.set(0, 5.4, 12.55);
  sign.rotation.y = Math.PI;
  scene.add(sign);

  const gateSign = textSign('Gates C1–C30  →', 5, 1, '#182130', '#ffffff');
  gateSign.position.set(-12, 4.6, 12.55);
  gateSign.rotation.y = Math.PI;
  scene.add(gateSign);

  const bagSign = textSign('← Baggage Claim', 5, 1, '#182130', '#ffffff');
  bagSign.position.set(12, 4.6, 12.55);
  bagSign.rotation.y = Math.PI;
  scene.add(bagSign);

  // ceiling with glowing light strips
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(60, 0.3, 26), mat(0xd4d9e4));
  ceil.position.y = 7;
  scene.add(ceil);
  for (let x = -26; x <= 26; x += 6.5) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 24), new THREE.MeshBasicMaterial({ color: 0xfff4d8 }));
    strip.position.set(x, 6.82, 0);
    scene.add(strip);
    const pl = new THREE.PointLight(0xfff0d0, 8, 18);
    pl.position.set(x, 6.2, 0);
    scene.add(pl);
  }

  // departures board: flipping-flight-info look
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 512; boardCanvas.height = 256;
  const bctx = boardCanvas.getContext('2d');
  bctx.fillStyle = '#101418';
  bctx.fillRect(0, 0, 512, 256);
  bctx.font = 'bold 24px monospace';
  const flights = [
    ['BA292  LONDON', 'ON TIME', '#50ff70'],
    ['UA847  CHICAGO', 'BOARDING', '#ffd663'],
    ['DL1102 ATLANTA', 'DELAYED', '#ff6060'],
    ['AA2058 DALLAS', 'ON TIME', '#50ff70'],
    ['WN664  BALTIMORE', 'BOARDING', '#ffd663'],
  ];
  flights.forEach(([f, st, c], i) => {
    bctx.fillStyle = '#e8e8e8';
    bctx.fillText(f, 24, 44 + i * 44);
    bctx.fillStyle = c;
    bctx.fillText(st, 340, 44 + i * 44);
  });
  const boardTex = new THREE.CanvasTexture(boardCanvas);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(6, 4.2, 12.55);
  board.rotation.y = Math.PI;
  scene.add(board);

  // coffee kiosk mid-terminal
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2), mat(0x7a4a2a));
  kiosk.position.set(-16, 1.2, 6);
  scene.add(kiosk);
  solid(kiosk);
  const kioskSign = textSign('POTOMAC COFFEE', 3, 0.7, '#3a2a1a', '#ffd663', 44);
  kioskSign.position.set(-16, 2.9, 6);
  scene.add(kioskSign);

  // seating rows: banks of blue airport chairs
  for (const rowX of [-9, 0, 9]) {
    for (let i = 0; i < 5; i++) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat(0x24448f));
      seat.scale.set(1, 0.9, 0.9);
      seat.position.set(rowX - 2 + i * 1.05, 0.45, -7);
      scene.add(seat);
    }
    const rowBound = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1, 1), mat(0x24448f));
    rowBound.position.set(rowX, 0.5, -7);
    rowBound.visible = false;
    scene.add(rowBound);
    solid(rowBound);
  }

  // check-in counters on the east side
  for (let i = 0; i < 3; i++) {
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 1.4), mat(0xb8bcc8));
    counter.position.set(24, 0.6, -4 + i * 4);
    scene.add(counter);
    solid(counter);
  }

  // THE TV: wall-mounted, playing Churchill vs Wooton
  const tvCanvas = document.createElement('canvas');
  tvCanvas.width = 512; tvCanvas.height = 288;
  const tvCtx = tvCanvas.getContext('2d');
  const tvTex = new THREE.CanvasTexture(tvCanvas);
  const tv = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.9), new THREE.MeshBasicMaterial({ map: tvTex }));
  tv.position.set(-6, 3.4, 12.5);
  tv.rotation.y = Math.PI;
  scene.add(tv);
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(3.7, 2.2, 0.15), mat(0x111111));
  tvFrame.position.set(-6, 3.4, 12.58);
  scene.add(tvFrame);
  let tvTimer = 0;
  function drawTV(t) {
    tvCtx.fillStyle = '#0d3311';
    tvCtx.fillRect(0, 0, 512, 288);
    // football field lines
    tvCtx.strokeStyle = '#ffffff';
    tvCtx.lineWidth = 2;
    for (let x = 40; x < 512; x += 55) {
      tvCtx.beginPath(); tvCtx.moveTo(x, 40); tvCtx.lineTo(x, 248); tvCtx.stroke();
    }
    // scoreboard
    tvCtx.fillStyle = '#000000cc';
    tvCtx.fillRect(96, 8, 320, 44);
    tvCtx.fillStyle = '#ffd663';
    tvCtx.font = 'bold 26px Georgia';
    tvCtx.textAlign = 'center';
    const c = 10 + Math.floor(Math.sin(t * 0.3) * 3 + 3);
    const w = 7 + Math.floor(Math.cos(t * 0.23) * 3 + 3);
    tvCtx.fillText(`CHURCHILL ${c} — WOOTON ${w}`, 256, 30);
    tvCtx.fillStyle = '#ffffff';
    tvCtx.font = 'italic 20px Georgia';
    tvCtx.fillText('THE BIG GAME — live', 256, 272);
    tvTex.needsUpdate = true;
  }
  drawTV(0);

  // players (dot players) on the TV field are just moving noise — skip for perf

  // snow particles outside
  const snowGeo = new THREE.BufferGeometry();
  const snowCount = 600;
  const snowPos = new Float32Array(snowCount * 3);
  for (let i = 0; i < snowCount; i++) {
    snowPos[i * 3] = (Math.random() - 0.5) * 80;
    snowPos[i * 3 + 1] = Math.random() * 12;
    snowPos[i * 3 + 2] = -14 - Math.random() * 25;
  }
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
  scene.add(snow);

  // player: Christian, arriving near baggage claim
  const christian = makePerson({
    photo: faces.christian, top: 0x8a6d4b, bottom: 0x2e2e38, hair: 0x54382a, hairStyle: 'short', skin: 0xe0b088,
  });
  christian.group.position.set(8, 0, 6);
  christian.group.rotation.y = Math.PI;
  scene.add(christian.group);

  // a couple of background travelers walking with rolling bags
  const npcs = [];
  for (let i = 0; i < 4; i++) {
    const n = makePerson({ top: [0x7a4a4a, 0x4a7a5a, 0x5a4a7a, 0x777770][i], bottom: 0x333340, hair: [0x2a1a12, 0x54382a, 0x14100c, 0x8a6a3a][i], hairStyle: i % 2 ? 'long' : 'short', skin: [0xe8c098, 0xb87a50, 0xd8a878, 0x8a5a3a][i], height: [0.95, 1.04, 0.98, 1.0][i] });
    n.group.position.set(-20 + i * 9, 0, 3 - (i % 2) * 5);
    scene.add(n.group);
    npcs.push({ p: n, dir: i % 2 ? 1 : -1, speed: 1 + Math.random() });
  }

  const followCam = new FollowCam(camera);
  followCam.snap(christian.group.position);
  const player = new PlayerController(christian, input, [
    ...bounds,
    { minX: -30, maxX: 30, minZ: 12.4, maxZ: 13 },   // back wall
    { minX: -30, maxX: 30, minZ: -13, maxZ: -12.4 }, // window wall
    { minX: 29.4, maxX: 30, minZ: -13, maxZ: 13 },
    { minX: -30, maxX: -29.4, minZ: -13, maxZ: 13 },
  ]);
  const interactions = new Interactions();

  // story state
  let phase = 'explore';
  // tv watched, then phone rings.

  interactions.add({
    pos: new THREE.Vector3(-6, 0, 10.8),
    radius: 2.6,
    label: 'Watch TV',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'TV', text: '…and it’s a packed house for the crosstown rivalry — Churchill vs Wooton, THE BIG GAME!' },
        { speaker: 'Christian', text: 'Classic. Half the county is at that game right now.' },
        { speaker: 'TV', text: 'Bulldogs driving down the field — Wooton’s defense is gonna have to dig in…' },
      ]);
      phase = 'phoneSoon';
      player.frozen = false;
    },
  });

  interactions.add({
    pos: new THREE.Vector3(24, 0, -4),
    radius: 2.4,
    label: 'Check-in counter',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Agent', text: 'Welcome to Dulles! Flight home for the holidays?' },
        { speaker: 'Christian', text: 'You know it. Back in MoCo for the week.' },
      ]);
      player.frozen = false;
    },
  });

  // exit door trigger — active only after the phone call finishes
  const exitInteract = interactions.add({
    pos: new THREE.Vector3(14, 0, 12),
    radius: 2.6,
    label: 'Head to the car',
    once: true,
    action: async () => {
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Christian', text: 'Babe never changes. All right — Olivia’s first, then the swap. Let’s roll.' },
      ]);
      // scene transition placeholder: drive scene comes next
      const { driveScene } = await import('./drive.js');
      game.switchScene(driveScene);
    },
  });
  exitInteract.hidden = true;

  showObjective('You just landed at Dulles. Stretch your legs — check out the terminal.', 7000);

  let phoneTimer = -1;
  let elapsed = 0;

  return {
    update(dt) {
      window.__sceneHooks = { interactions: typeof interactions !== "undefined" ? interactions : null, player: typeof player !== "undefined" ? player : null, christian: typeof christian !== "undefined" ? christian : null, self: this };
      elapsed += dt;
      player.update(dt);
      followCam.update(dt, christian.group.position);

      // snow fall
      const pos = snow.geometry.attributes.position;
      for (let i = 0; i < snowCount; i++) {
        pos.array[i * 3 + 1] -= dt * 1.4;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 12;
      }
      pos.needsUpdate = true;

      // npcs pace the concourse
      for (const n of npcs) {
        n.p.group.position.x += n.dir * n.speed * dt;
        if (n.p.group.position.x > 27) n.dir = -1;
        if (n.p.group.position.x < -27) n.dir = 1;
        n.p.group.rotation.y = n.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        n.p.animateWalk(dt, 0.7);
      }

      // tv refresh a few times a second
      tvTimer += dt;
      if (tvTimer > 0.25) { drawTV(elapsed); tvTimer = 0; }

      // interaction prompt + trigger
      const near = interactions.nearest(christian.group.position);
      const prompt = document.getElementById('interact-prompt');
      if (near && !near.hidden && !player.frozen) {
        prompt.classList.remove('hidden');
        prompt.textContent = 'E';
        if (input.consumeInteract()) {
          if (near.once) near.done = true;
          prompt.classList.add('hidden');
          near.action();
        }
      } else {
        prompt.classList.add('hidden');
      }

      // phone call sequence
      if (phase === 'phoneSoon') {
        if (phoneTimer < 0) phoneTimer = elapsed + 1.5;
        if (elapsed > phoneTimer) {
          phase = 'ringing';
          phoneOverlay('Stacy ❤️', true);
          showObjective('Your phone is ringing — press E to answer.', 0);
        }
      }
      if (phase === 'ringing' && input.consumeInteract()) {
        phase = 'called';
        phoneOverlay('Stacy ❤️', false);
        document.getElementById('objective-banner').classList.add('hidden');
        player.frozen = true;
        (async () => {
          await dialogue.play([
            { speaker: 'Christian', text: 'Hey babe — just landed.' },
            { speaker: 'Stacy', text: 'Babe, finally! Are you coming to the swap later today?' },
            { speaker: 'Christian', text: 'Of course. Headed there now.' },
            { speaker: 'Stacy', text: 'Great — can you swing by Olivia’s? She has a few items she wanted to bring.' },
            { speaker: 'Christian', text: 'No problem.' },
            { speaker: 'Stacy', text: 'Drive safe, it’s snowing! See you at the swap ❤️' },
          ]);
          showObjective('Head to the car — the exit is by baggage claim, on the right.', 6000);
          exitInteract.hidden = false;
          player.frozen = false;
        })();
      }
    },
    dispose() {},
  };
}
