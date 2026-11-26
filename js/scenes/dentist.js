import * as THREE from 'three';
import { makePerson } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective } from '../engine/core.js';
import { carpet } from '../engine/textures.js';

// Dr. Fritz's dental office — unlockable location. Olivia sits in the chair
// and cleans the glunk off every tooth. Too slow and they threaten to bring
// in the OTHER Olivia. Clean them all: Miami trip with the philly fam, and
// the night ends dancing at E11EVEN.
export async function dentistScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x20262e);
  scene.add(new THREE.AmbientLight(0xf0f4ff, 1.0));
  const lamp = new THREE.PointLight(0xf4faff, 40, 30);
  lamp.position.set(0, 4, 0);
  lamp.castShadow = true;
  scene.add(lamp);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // room: teal walls (like Fritz's photo backdrop), floor, cabinets
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 10), new THREE.MeshStandardMaterial({ map: carpet('#b8c4c8', 4, 3), roughness: 0.9 }));
  floor.receiveShadow = true;
  scene.add(floor);
  const wallMat = mat(0x3e7a7a);
  for (const [w, h, d, x, z] of [
    [14, 3.6, 0.3, 0, -5], [14, 3.6, 0.3, 0, 5], [0.3, 3.6, 10, -7, 0], [0.3, 3.6, 10, 7, 0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -7, maxX: 7, minZ: -5.4, maxZ: -4.9 }, { minX: -7, maxX: 7, minZ: 4.9, maxZ: 5.4 },
    { minX: -7.4, maxX: -6.9, minZ: -5.4, maxZ: 5.4 }, { minX: 6.9, maxX: 7.4, minZ: -5.4, maxZ: 5.4 },
  ];

  function box(w, h, d, c, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }

  // dental chair center: reclined seat + headrest + base
  box(1.0, 0.5, 1.0, 0x4a5560, 0, 0.25, 0);           // pedestal
  const seat = box(0.9, 0.25, 2.2, 0x6a8aaa, 0, 0.65, 0.3);  // chair body
  box(0.9, 0.2, 0.5, 0x6a8aaa, 0, 0.85, -0.85);       // headrest end
  box(0.9, 0.18, 0.6, 0x5a7a9a, 0, 0.72, 1.35);       // leg rest
  bounds.push({ minX: -0.8, maxX: 0.8, minZ: -1.2, maxZ: 1.8 });

  // big overhead dental light on articulated arm
  const arm1 = box(0.08, 1.2, 0.08, 0xd8dce0, 0.9, 2.6, -0.5);
  arm1.rotation.z = 0.5;
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 0.18, 12), mat(0xe8ecef));
  lampHead.position.set(0.3, 2.1, -0.2);
  scene.add(lampHead);
  const lampGlow = new THREE.PointLight(0xffffff, 14, 6);
  lampGlow.position.set(0.3, 1.9, -0.2);
  scene.add(lampGlow);

  // tool tray with little instruments
  box(0.7, 0.05, 0.5, 0xc8ccd0, 1.6, 1.0, 0.3);
  box(0.06, 1.0, 0.06, 0x9aa0a8, 1.6, 0.5, 0.3);
  for (let i = 0; i < 4; i++) box(0.05, 0.03, 0.16, 0xe8e8e8, 1.45 + i * 0.12, 1.05, 0.3);
  bounds.push({ minX: 1.2, maxX: 2.0, minZ: 0, maxZ: 0.7 });

  // cabinet wall + sink + mirror
  box(3.5, 1.0, 0.7, 0xd8d4c8, -4.5, 0.5, -4.5);
  box(3.5, 0.08, 0.75, 0x8a9498, -4.5, 1.04, -4.5);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ color: 0xaac4d8, roughness: 0.05, metalness: 0.9 }));
  mirror.position.set(-4.5, 2.1, -4.83);
  scene.add(mirror);
  bounds.push({ minX: -6.3, maxX: -2.7, minZ: -4.9, maxZ: -4.0 });

  // posters: tooth chart + braces ad + a diploma
  const poster = document.createElement('canvas');
  poster.width = 128; poster.height = 160;
  const pc = poster.getContext('2d');
  pc.fillStyle = '#f0f4f8'; pc.fillRect(0, 0, 128, 160);
  pc.fillStyle = '#2a6a8a'; pc.font = 'bold 16px Arial'; pc.textAlign = 'center';
  pc.fillText('BRUSH 2x', 64, 30);
  pc.fillText('A DAY!', 64, 50);
  pc.fillStyle = '#ffffff';
  for (let t = 0; t < 8; t++) {
    pc.beginPath();
    pc.arc(30 + (t % 4) * 24, 85 + Math.floor(t / 4) * 30, 9, 0, Math.PI * 2);
    pc.fill();
    pc.strokeStyle = '#8aa'; pc.stroke();
  }
  const posterTex = new THREE.CanvasTexture(poster);
  posterTex.colorSpace = THREE.SRGBColorSpace;
  const posterMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.25), new THREE.MeshBasicMaterial({ map: posterTex }));
  posterMesh.position.set(2.8, 1.9, -4.83);
  scene.add(posterMesh);
  // diploma
  const dip = box(0.7, 0.55, 0.04, 0xd8c8a8, 4.5, 2.1, -4.82);
  // window with Miami beach poster tease
  const winTexC = document.createElement('canvas');
  winTexC.width = 128; winTexC.height = 96;
  const wc = winTexC.getContext('2d');
  const wg = wc.createLinearGradient(0, 0, 0, 96);
  wg.addColorStop(0, '#3a7ab8'); wg.addColorStop(0.6, '#88c8e8'); wg.addColorStop(0.62, '#e8d8a8'); wg.addColorStop(1, '#d8c898');
  wc.fillStyle = wg; wc.fillRect(0, 0, 128, 96);
  wc.fillStyle = '#2a5a3a';
  wc.fillRect(20, 45, 4, 20);  // palm trunk
  wc.beginPath(); wc.arc(22, 42, 12, 0, Math.PI * 2); wc.fill();
  const winTex = new THREE.CanvasTexture(winTexC);
  winTex.colorSpace = THREE.SRGBColorSpace;
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.35), new THREE.MeshBasicMaterial({ map: winTex }));
  win.position.set(-6.83, 2.0, 0);
  win.rotation.y = Math.PI / 2;
  scene.add(win);

  // waiting corner: chairs + magazines
  for (let i = 0; i < 3; i++) {
    box(0.6, 0.45, 0.55, 0x8a6a9a, 4.5 + i * 0.8, 0.35, 4.4);
    box(0.6, 0.5, 0.12, 0x8a6a9a, 4.5 + i * 0.8, 0.6, 4.7);
  }
  box(0.5, 0.35, 0.4, 0x6a5a48, 3.6, 0.18, 4.3);

  // ---- cast ----
  // playing as Olivia
  const olivia = makePerson({ photo: faces.olivia, top: 0x222226, bottom: 0x222226, hair: 0x16100e, hairStyle: 'long', skin: 0xe8c098, name: 'Olivia', });
  olivia.group.position.set(-3, 0, 2);
  scene.add(olivia.group);

  // dr fritz — photo face, bald + glasses look, black polo
  const fritzFaceTex = new THREE.TextureLoader().load('assets/faces2/fritz.png');
  fritzFaceTex.colorSpace = THREE.SRGBColorSpace;
  const fritz = makePerson({ photo: fritzFaceTex, top: 0x222222, bottom: 0x3a3a44, hair: 0x888888, hairStyle: 'receding', skin: 0xe8c0a0, name: 'Dr. Fritz', });
  fritz.group.position.set(1.8, 0, -1.2);
  fritz.group.rotation.y = Math.PI * 0.8;
  scene.add(fritz.group);

  const followCam = new FollowCam(camera);
  followCam.setRoom(-6.8, 6.8, -4.8, 4.8);
  followCam.snap(olivia.group.position);
  const player = new PlayerController(olivia, input, bounds);
  const interactions = new Interactions();

  // intro dialogue
  setTimeout(async () => {
    player.frozen = true;
    await dialogue.play([
      { speaker: 'Dr. Fritz', text: 'Olivia! Come in, come in. The family is in Miami this weekend — but YOU have teeth to clean first.' },
      { speaker: 'Olivia', text: 'Wait — I\'m the dentist here?? I thought I had an appointment.' },
      { speaker: 'Dr. Fritz', text: 'Details, details. Sit in the chair — the glunk isn\'t going to scrape itself. And work fast…' },
      { speaker: 'Dr. Fritz', text: '…because if you\'re too slow, we bring in the OTHER Olivia. And nobody wants that confusion.' },
    ]);
    player.frozen = false;
    showObjective('Sit in the dental chair (E) and clean every tooth!', 5000);
  }, 600);

  // ---------------- the teeth minigame (DOM canvas overlay) ----------------
  function runTeethMinigame() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:60;background:radial-gradient(circle at 50% 40%, #3a1520, #180a10 75%);display:flex;align-items:center;justify-content:center;flex-direction:column;';
      const cv = document.createElement('canvas');
      cv.width = Math.min(window.innerWidth * 0.92, 900);
      cv.height = Math.min(window.innerHeight * 0.62, 520);
      cv.style.cssText = 'border-radius:18px;box-shadow:0 10px 60px rgba(0,0,0,.6);touch-action:none;cursor:crosshair;max-width:92vw;';
      overlay.appendChild(cv);
      const hud = document.createElement('div');
      hud.style.cssText = 'color:#ffe9b8;font-family:Georgia,serif;font-size:20px;margin-top:12px;text-align:center;text-shadow:0 2px 6px #000;';
      overlay.appendChild(hud);
      const warn = document.createElement('div');
      warn.style.cssText = 'color:#ff6a6a;font-family:Georgia,serif;font-size:17px;margin-top:6px;height:24px;font-style:italic;text-shadow:0 2px 6px #000;';
      overlay.appendChild(warn);
      document.body.appendChild(overlay);

      const ctx = cv.getContext('2d');
      // teeth layout: two rows of 7
      const teeth = [];
      const cols = 7;
      for (let row = 0; row < 2; row++) {
        for (let i = 0; i < cols; i++) {
          const tx = cv.width * (0.14 + i * (0.72 / (cols - 1)));
          const ty = cv.height * (row === 0 ? 0.3 : 0.68);
          teeth.push({ x: tx, y: ty, r: 30 + (i === 0 || i === cols - 1 ? -4 : 4), glunk: 1.0, row, clean: false });
        }
      }
      const total = teeth.length;
      let cleaned = 0;
      let startT = performance.now();
      const TIME_LIMIT = 75; // seconds for all teeth before the other olivia gets closer
      let warned = 0;
      const warnLines = [
        'Dr. Fritz: hmm, slower than I hoped…',
        'Dr. Fritz: watch out — or we bring in the OTHER Olivia.',
        'Dr. Fritz: she\'s literally in the parking lot. FASTER.',
      ];
      // mouth background drawing
      function drawMouth() {
        // lips
        ctx.fillStyle = '#7a2838';
        ctx.beginPath();
        ctx.ellipse(cv.width / 2, cv.height / 2, cv.width * 0.46, cv.height * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        // inner mouth
        ctx.fillStyle = '#4a1018';
        ctx.beginPath();
        ctx.ellipse(cv.width / 2, cv.height / 2, cv.width * 0.41, cv.height * 0.36, 0, 0, Math.PI * 2);
        ctx.fill();
        // gums
        ctx.fillStyle = '#a84858';
        ctx.beginPath();
        ctx.ellipse(cv.width / 2, cv.height * 0.32, cv.width * 0.38, cv.height * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cv.width / 2, cv.height * 0.7, cv.width * 0.38, cv.height * 0.14, 0, 0, Math.PI * 2);
        ctx.fill();
        // tongue
        ctx.fillStyle = '#c86878';
        ctx.beginPath();
        ctx.ellipse(cv.width / 2, cv.height * 0.88, cv.width * 0.2, cv.height * 0.1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      function drawTooth(t) {
        // tooth body
        ctx.fillStyle = t.clean ? '#ffffff' : '#f0ead8';
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, t.r * 0.72, t.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,100,80,0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (t.clean) {
          // sparkle
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.font = `${t.r * 0.8}px Arial`;
          ctx.textAlign = 'center';
          ctx.fillText('✦', t.x + t.r * 0.2, t.y - t.r * 0.2);
        } else {
          // glunk blobs proportional to remaining glunk
          const n = Math.ceil(t.glunk * 5);
          ctx.fillStyle = '#6a8a2a';
          for (let g = 0; g < n; g++) {
            const gx = t.x + Math.sin(g * 2.4 + t.x) * t.r * 0.4;
            const gy = t.y + Math.cos(g * 1.9 + t.y) * t.r * 0.5;
            ctx.beginPath();
            ctx.arc(gx, gy, 5 + t.glunk * 6, 0, Math.PI * 2);
            ctx.fill();
          }
          if (t.glunk > 0.5) {
            ctx.fillStyle = '#4a6a1a';
            ctx.beginPath();
            ctx.arc(t.x - t.r * 0.2, t.y + t.r * 0.25, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      // scaler tool cursor
      let tool = { x: cv.width / 2, y: cv.height / 2, down: false };
      function pos(e) {
        const r = cv.getBoundingClientRect();
        const p = e.touches ? e.touches[0] : e;
        return { x: (p.clientX - r.left) * (cv.width / r.width), y: (p.clientY - r.top) * (cv.height / r.height) };
      }
      function move(e) {
        const p = pos(e);
        tool.x = p.x; tool.y = p.y;
        e.preventDefault();
      }
      function down(e) { tool.down = true; move(e); }
      function up() { tool.down = false; }
      cv.addEventListener('mousemove', move);
      cv.addEventListener('mousedown', down);
      window.addEventListener('mouseup', up);
      cv.addEventListener('touchmove', move, { passive: false });
      cv.addEventListener('touchstart', down, { passive: false });
      cv.addEventListener('touchend', up);

      let lastT = performance.now();
      let scrubFx = [];
      function frame() {
        const now = performance.now();
        const dt = (now - lastT) / 1000;
        lastT = now;
        const elapsedS = (now - startT) / 1000;

        // scrubbing logic
        if (tool.down) {
          let scrubbing = false;
          for (const t of teeth) {
            if (t.clean) continue;
            const d = Math.hypot(tool.x - t.x, tool.y - t.y);
            if (d < t.r + 14) {
              t.glunk -= dt * 0.85;
              scrubbing = true;
              scrubFx.push({ x: tool.x + (Math.random() - 0.5) * 20, y: tool.y + (Math.random() - 0.5) * 20, life: 0.5 });
              if (t.glunk <= 0) {
                t.glunk = 0;
                t.clean = true;
                cleaned++;
              }
            }
          }
        }

        // warnings on time milestones
        const warnIdx = Math.floor((elapsedS / TIME_LIMIT) * 3);
        if (warnIdx > warned && warnIdx <= 3 && cleaned < total) {
          warned = warnIdx;
          warn.textContent = warnLines[Math.min(warned - 1, 2)];
          if (warned === 2 && window.__game?.dialogue?.voiceManifest == null) {}
        }

        // render
        ctx.clearRect(0, 0, cv.width, cv.height);
        drawMouth();
        for (const t of teeth) drawTooth(t);
        // scrub particles
        ctx.fillStyle = 'rgba(200,230,255,0.7)';
        for (const p of scrubFx) {
          p.life -= dt;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3 + p.life * 5, 0, Math.PI * 2);
          ctx.fill();
        }
        scrubFx = scrubFx.filter((p) => p.life > 0);
        // tool
        ctx.strokeStyle = '#e8ecf0';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tool.x, tool.y);
        ctx.lineTo(tool.x + 18, tool.y - 34);
        ctx.stroke();
        ctx.fillStyle = tool.down ? '#50d0ff' : '#a0a8b0';
        ctx.beginPath();
        ctx.arc(tool.x, tool.y, 7, 0, Math.PI * 2);
        ctx.fill();

        const pct = Math.max(0, 1 - elapsedS / TIME_LIMIT);
        hud.innerHTML = `🦷 teeth cleaned: ${cleaned} / ${total} &nbsp;·&nbsp; <span style="color:${pct < 0.35 ? '#ff8a6a' : '#a8e8a8'}">other-Olivia meter: ${'▮'.repeat(Math.ceil((1 - pct) * 10)).padEnd(10, '▯')}</span><br><span style="font-size:14px;opacity:.85">hold click / finger on a tooth and scrub the glunk off</span>`;

        if (cleaned >= total) {
          document.body.removeChild(overlay);
          resolve({ won: true, time: elapsedS });
          return;
        }
        if (elapsedS > TIME_LIMIT * 1.6) {
          // mercy: still finish but with the other olivia arrived
          document.body.removeChild(overlay);
          resolve({ won: cleaned >= total * 0.7, slow: true, time: elapsedS });
          return;
        }
        requestAnimationFrame(frame);
      }
      frame();
    });
  }

  interactions.add({
    pos: new THREE.Vector3(0, 0, 0.3), radius: 2.2, label: 'Sit in the chair',
    action: async () => {
      player.frozen = true;
      showObjective('🦷 the cleaning begins…', 1500);
      await new Promise((r) => setTimeout(r, 1200));
      const result = await runTeethMinigame();
      if (result.won && !result.slow) {
        await dialogue.play([
          { speaker: 'Dr. Fritz', text: 'Every tooth — sparkling! Not a speck of glunk left. You know what that means…' },
          { speaker: 'Olivia', text: 'Miami??' },
          { speaker: 'Dr. Fritz', text: 'MIAMI. With the philly fam. And tonight — you dance at E11EVEN. You earned it.' },
        ]);
        const { miamiScene } = await import('./miami.js');
        game.switchScene(miamiScene);
      } else if (result.won) {
        await dialogue.play([
          { speaker: 'Dr. Fritz', text: 'Clean… but slow. The other Olivia was ALREADY in the parking lot. Close one. Miami — but she\'s coming too.' },
        ]);
        const { miamiScene } = await import('./miami.js');
        game.switchScene(miamiScene);
      } else {
        await dialogue.play([
          { speaker: 'Dr. Fritz', text: 'Too slow! OTHER OLIVIA — get in here! You, out of the chair. Come back when your wrists are faster.' },
        ]);
        player.frozen = false;
      }
    },
  });

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: olivia, self: this };
      player.update(dt);
      followCam.update(dt, olivia.group.position);
      const near = interactions.nearest(olivia.group.position);
      const prompt = document.getElementById('interact-prompt');
      if (near && !player.frozen) {
        prompt.textContent = 'E — ' + near.label;
        prompt.classList.remove('hidden');
      } else {
        prompt.classList.add('hidden');
      }
      if (near && !player.frozen && input.consumeInteract()) {
        near.action();
      }
    },
  };
}
