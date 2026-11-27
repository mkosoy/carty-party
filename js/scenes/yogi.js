import * as THREE from 'three';
import { sfxChime } from '../engine/sfx.js';
import { makePerson, playerIdentity } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective } from '../engine/core.js';

// Yo Yogi — the frozen yogurt shop at rio in Gaithersburg. The whole drive
// chapter is a race to get here before 9pm. Bright, cheerful, closing soon.
export async function yogiScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x241c26);
  scene.fog = new THREE.Fog(0x241c26, 26, 60);
  scene.add(new THREE.AmbientLight(0xfff0e8, 0.95));
  const key = new THREE.DirectionalLight(0xfff4e0, 0.7);
  key.position.set(4, 12, 5);
  key.castShadow = true;
  scene.add(key);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // white tile floor with a pink grout grid
  const tileC = document.createElement('canvas');
  tileC.width = 128; tileC.height = 128;
  const tc = tileC.getContext('2d');
  tc.fillStyle = '#f4eee8'; tc.fillRect(0, 0, 128, 128);
  tc.strokeStyle = '#e8b8c8'; tc.lineWidth = 3;
  tc.strokeRect(0, 0, 128, 128);
  const tileT = new THREE.CanvasTexture(tileC);
  tileT.wrapS = tileT.wrapT = THREE.RepeatWrapping;
  tileT.repeat.set(12, 8);
  tileT.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 20), new THREE.MeshStandardMaterial({ map: tileT, roughness: 0.25 }));
  floor.receiveShadow = true;
  scene.add(floor);
  // walls: hot pink accent back wall, cream sides
  for (const [w, h, d, x, z, c] of [
    [30, 5.5, 0.4, 0, -10, 0xd8508a], [30, 5.5, 0.4, 0, 10, 0xf0e0d0], [0.4, 5.5, 20, -15, 0, 0xf0e0d0], [0.4, 5.5, 20, 15, 0, 0xf0e0d0],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    wall.position.set(x, h / 2, z);
    scene.add(wall);
  }
  const bounds = [
    { minX: -15, maxX: 15, minZ: -10.4, maxZ: -9.9 }, { minX: -15, maxX: 15, minZ: 9.9, maxZ: 10.4 },
    { minX: -15.4, maxX: -14.9, minZ: -10.4, maxZ: 10.4 }, { minX: 14.9, maxX: 15.4, minZ: -10.4, maxZ: 10.4 },
  ];

  // YO YOGI neon sign on the pink wall
  const neonC = document.createElement('canvas');
  neonC.width = 512; neonC.height = 128;
  const nc = neonC.getContext('2d');
  nc.fillStyle = '#00000000';
  nc.font = 'bold 80px Georgia';
  nc.textAlign = 'center';
  nc.shadowColor = '#ff80c0'; nc.shadowBlur = 24;
  nc.fillStyle = '#ffd0e8';
  nc.fillText('yo yogi', 256, 90);
  const neonT = new THREE.CanvasTexture(neonC);
  neonT.colorSpace = THREE.SRGBColorSpace;
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: neonT, transparent: true }));
  neon.position.set(0, 4.2, -9.75);
  scene.add(neon);

  // menu board
  const menuC = document.createElement('canvas');
  menuC.width = 512; menuC.height = 256;
  const mc = menuC.getContext('2d');
  mc.fillStyle = '#28202a'; mc.fillRect(0, 0, 512, 256);
  mc.fillStyle = '#ffd0e8'; mc.font = 'bold 34px Georgia'; mc.textAlign = 'center';
  mc.fillText('TONIGHT\u2019S FLAVORS', 256, 44);
  mc.font = '24px Georgia'; mc.fillStyle = '#f0e8d8'; mc.textAlign = 'left';
  const flavors = ['tart original', 'mango tango', 'cake batter', 'very berry', 'peppermint stick', 'salted caramel'];
  flavors.forEach((f, i) => mc.fillText('• ' + f, 60 + (i % 2) * 220, 90 + Math.floor(i / 2) * 48));
  const menuT = new THREE.CanvasTexture(menuC);
  menuT.colorSpace = THREE.SRGBColorSpace;
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.75), new THREE.MeshBasicMaterial({ map: menuT }));
  menu.position.set(-8, 3.4, -9.78);
  scene.add(menu);

  // flavor dispenser wall: 8 machines with levers along the back wall
  const dispColors = [0xf8f0e0, 0xffc858, 0xf8e8c8, 0xe85878, 0xffffff, 0xc89058, 0x98d8c8, 0xd898f8];
  for (let i = 0; i < 8; i++) {
    const dx = -6.5 + i * 1.85;
    const mach = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xe8e8ee, roughness: 0.3, metalness: 0.4 }));
    mach.position.set(dx, 1.9, -9.3);
    scene.add(mach);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.7), new THREE.MeshStandardMaterial({ color: dispColors[i], emissive: dispColors[i], emissiveIntensity: 0.25 }));
    face.position.set(dx, 2.35, -8.93);
    scene.add(face);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), mat(0x303038));
    lever.position.set(dx, 1.55, -8.9);
    scene.add(lever);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.22, 8), mat(0x484858));
    nozzle.position.set(dx, 1.35, -9.0);
    scene.add(nozzle);
  }
  bounds.push({ minX: -8.5, maxX: 8, minZ: -10.4, maxZ: -8.8 });

  // toppings bar — long counter with little colorful bins
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
  barTop.position.set(-8, 0.95, 2);
  scene.add(barTop);
  const barBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.9, 1.2), mat(0xf0d0e0));
  barBody.position.set(-8, 0.45, 2);
  scene.add(barBody);
  const topColors = [0x6a4a2e, 0xffe060, 0xff6070, 0x60c860, 0xffffff, 0x9040a0, 0xff9040, 0x603020, 0x80c0ff, 0xfff0a0];
  for (let i = 0; i < 10; i++) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.3, metalness: 0.5 }));
    bin.position.set(-10.6 + i * 0.58, 1.06, 2);
    scene.add(bin);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), new THREE.MeshStandardMaterial({ color: topColors[i], roughness: 0.9 }));
    fill.position.set(-10.6 + i * 0.58, 1.12, 2);
    scene.add(fill);
  }
  bounds.push({ minX: -11.5, maxX: -4.5, minZ: 1.3, maxZ: 2.7 });

  // the service counter along the east wall — where the swirl game happens
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0xf0e8f0, roughness: 0.25 }));
  counter.position.set(11, 0.5, 0);
  scene.add(counter);
  bounds.push({ minX: 10.3, maxX: 11.7, minZ: -4, maxZ: 4 });
  // cup stack on the counter
  for (let i = 0; i < 3; i++) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.28, 10), mat(0xfff8f0));
    cup.position.set(10.9, 1.15 + i * 0.12, -3);
    scene.add(cup);
  }

  // tables with stools
  for (const [tx, tz] of [[2, 5], [-2, 7], [5, 7.5]]) {
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    table.position.set(tx, 0.85, tz);
    scene.add(table);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), mat(0x909098));
    leg.position.set(tx, 0.42, tz);
    scene.add(leg);
    for (const [ox, oz] of [[0.9, 0], [-0.9, 0], [0, 0.9]]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), mat(0xd8508a));
      stool.position.set(tx + ox, 0.25, tz + oz);
      scene.add(stool);
    }
    bounds.push({ minX: tx - 0.75, maxX: tx + 0.75, minZ: tz - 0.75, maxZ: tz + 0.75 });
  }

  // storefront windows on the south wall — strip-mall parking lot at night
  for (const wx of [-8, 0, 8]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.8), new THREE.MeshBasicMaterial({ color: 0x101828 }));
    win.position.set(wx, 3.2, 9.78);
    win.rotation.y = Math.PI;
    scene.add(win);
    // sodium parking lot lights
    for (let l = 0; l < 2; l++) {
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.14, 8), new THREE.MeshBasicMaterial({ color: 0xffc860 }));
      lamp.position.set(wx - 1.6 + l * 3.2, 3.6, 9.75);
      lamp.rotation.y = Math.PI;
      scene.add(lamp);
    }
  }

  // CLOSES AT 9 sign — the legend itself
  const signC = document.createElement('canvas');
  signC.width = 256; signC.height = 128;
  const sc = signC.getContext('2d');
  sc.fillStyle = '#fff8e8'; sc.fillRect(0, 0, 256, 128);
  sc.fillStyle = '#c03050'; sc.font = 'bold 30px Georgia'; sc.textAlign = 'center';
  sc.fillText('CLOSES AT 9', 128, 58);
  sc.font = '18px Georgia'; sc.fillStyle = '#604858';
  sc.fillText('no exceptions. not even you.', 128, 92);
  const signT = new THREE.CanvasTexture(signC);
  signT.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), new THREE.MeshBasicMaterial({ map: signT }));
  sign.position.set(8, 3.2, -9.78);
  scene.add(sign);

  // the teenage employee behind the counter, plus two customers
  const employee = makePerson({ top: 0xd8508a, bottom: 0x3a3a42, hair: 0x4a2e18, hairStyle: 'bun', skin: 0xc89878, name: 'Kayla' });
  employee.group.position.set(12.5, 0, 1);
  employee.group.rotation.y = -Math.PI / 2;
  scene.add(employee.group);
  const visitors = [employee];
  for (const [vx, vz, vr, top, hair] of [[3, 5.8, -2.6, 0x5a7a9a, 0x2a1a10], [-1.4, 6.6, 2.8, 0x8a5a7a, 0x6a4a2e]]) {
    const cust = makePerson({ top, bottom: 0x2c2c34, hair, hairStyle: Math.random() > 0.5 ? 'long' : 'short', skin: 0xd8a880 });
    cust.group.position.set(vx, 0, vz);
    cust.group.rotation.y = vr;
    scene.add(cust.group);
    visitors.push(cust);
  }

  // ---- the player ----
  const hero = makePerson({ photo: faces.christian, top: 0x4a5a6a, bottom: 0x2c2c34, hair: 0x6a4a2e, skin: 0xd8a880, ...playerIdentity(faces) });
  hero.group.position.set(0, 0, -7);
  hero.group.rotation.y = 0;
  scene.add(hero.group);
  const player = new PlayerController(hero, input, bounds);
  const followCam = new FollowCam(camera);
  followCam.setRoom(-14.5, 14.5, -9.5, 9.5);
  followCam.snap(hero.group.position);

  const interactions = new Interactions(scene);
  const say = (lines) => async () => { player.frozen = true; await dialogue.play(lines); player.frozen = false; };

  // ---- the perfect swirl minigame ----
  // a cup fills under the dispenser; press E once to start it filling and once
  // to stop. land in the green zone. five cups, fill speed rises each round.
  const st = { active: false, done: false, filling: false, fill: 0, round: 0, score: 0, cupMesh: null, fillMesh: null };
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(20,10,20,.85);color:#ffd0e8;padding:8px 18px;border-radius:12px;font-family:Georgia;font-size:16px;z-index:30;display:none';
  document.body.appendChild(hud);

  function spawnCup() {
    if (st.cupMesh) scene.remove(st.cupMesh);
    const cupG = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xfff8f0, transparent: true, opacity: 0.85, roughness: 0.2 }));
    cupG.add(cup);
    const fillM = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xf8e8c8, roughness: 0.6 }));
    fillM.position.y = -0.18;
    cupG.add(fillM);
    // target band — the green zone ring floats where the perfect fill is
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.015, 6, 16), new THREE.MeshBasicMaterial({ color: 0x60ff80 }));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.05;
    cupG.add(band);
    cupG.position.set(10.9, 1.25, 0);
    scene.add(cupG);
    st.cupMesh = cupG;
    st.fillMesh = fillM;
  }

  interactions.add({
    pos: new THREE.Vector3(9.5, 0, 0), radius: 2.4, label: 'Work the swirl machine',
    action: async () => {
      if (st.active || st.done) return;
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Kayla', text: 'You want to work the machine? Okay but the perfect swirl is sacred. Stop the fill inside the green ring.' },
        { speaker: 'Christian', text: 'Five cups. Cake batter. Watch a master at work.' },
        { speaker: 'Kayla', text: 'Press E to start the pour, press E again to stop. It fills faster every cup!' },
      ]);
      player.frozen = false;
      st.active = true;
      st.round = 0;
      st.score = 0;
      hud.style.display = 'block';
      spawnCup();
      showObjective('press E to start the pour — press E again in the green zone!', 4000);
    },
  });

  interactions.add({ pos: new THREE.Vector3(-8, 0, 2), radius: 2.2, label: 'The toppings bar', action: say([
    { speaker: 'Christian', text: 'Mochi, boba, crushed peppermint, tiny marshmallows. The toppings bar is the real reason anyone comes here.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(8, 0, -7), radius: 2.4, label: 'The CLOSES AT 9 sign', action: say([
    { speaker: 'Christian', text: 'The sign that launched a hundred highway merges. Sacred text. The constitution of Gaithersburg.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(-8, 0, -7), radius: 2.6, label: 'The menu board', action: say([
    { speaker: 'Kayla', text: 'Peppermint stick is seasonal. Cake batter is forever. Tart original is for people who read the ingredients.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(2, 0, 5), radius: 2.2, label: 'The window seats', action: say([
    { speaker: 'Christian', text: 'Half of MoCo\u2019s big decisions got made at these little pink tables. Also at least three breakups per winter.' },
  ]) });

  window.__sceneHint = 'WASD — move · E — interact · work the swirl machine at the counter';
  showObjective('Yo Yogi — you made it before 9. The swirl machine awaits.', 6000);

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: hero, self: this };
      player.update(dt);
      followCam.update(dt, hero.group.position);
      const nearI = interactions.nearest(hero.group.position);
      const promptEl = document.getElementById('interact-prompt');
      const swirlReady = st.active && Math.hypot(hero.group.position.x - 9.5, hero.group.position.z - 0) < 3.2;
      if (st.active && swirlReady) {
        promptEl.textContent = st.filling ? 'E — STOP the pour!' : 'E — start the pour';
        promptEl.classList.remove('hidden');
      } else if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) promptEl.classList.add('hidden');

      if (input.consumeInteract()) {
        if (st.active && swirlReady && !player.frozen) {
          if (!st.filling && st.fill === 0) {
            st.filling = true;
          } else if (st.filling) {
            st.filling = false;
            // score: perfect fill is 0.62 (green band zone 0.5–0.75)
            const f = st.fill;
            let pts;
            if (f >= 0.5 && f <= 0.75) { pts = 20; showObjective('PERFECT SWIRL! +$20', 1500); sfxChime(); }
            else if (f >= 0.35 && f < 0.5) { pts = 8; showObjective('a little light… +$8', 1500); }
            else if (f > 0.75 && f <= 0.92) { pts = 6; showObjective('overflowing! +$6', 1500); }
            else { pts = 0; showObjective(f < 0.35 ? 'sad empty cup. $0' : 'total disaster. $0', 1500); }
            st.score += pts;
            st.round++;
            st.fill = 0;
            if (st.round >= 5) {
              st.active = false;
              st.done = true;
              hud.style.display = 'none';
              scene.remove(st.cupMesh);
              st.cupMesh = null;
              const lines = st.score >= 80
                ? [{ speaker: 'Kayla', text: 'Five perfect swirls. You are hired. I mean — you are SO hired. Can you start Friday?' }, { speaker: 'Christian', text: 'The swirl recognizes the swirl.' }]
                : st.score >= 40
                  ? [{ speaker: 'Kayla', text: 'Not bad! A couple of those were even legal. Come back and practice.' }]
                  : [{ speaker: 'Kayla', text: 'Those cups are a crime against yogurt. The good news: we close at 9, so evidence destruction is imminent.' }];
              player.frozen = true;
              dialogue.play(lines).then(() => {
                player.frozen = false;
                if (st.score >= 40) try { localStorage.setItem('cp-done-yogi', '1'); } catch {}
                setTimeout(() => { if (window.__showMap) window.__showMap(); }, 2500);
              });
            } else {
              spawnCup();
            }
          }
        } else if (nearI && !player.frozen) nearI.action();
      }

      // filling logic
      if (st.active && st.filling && st.fillMesh) {
        st.fill = Math.min(1.0, st.fill + dt * (0.24 + st.round * 0.07));
        const h = 0.02 + st.fill * 0.34;
        st.fillMesh.scale.y = h / 0.02;
        st.fillMesh.position.y = -0.18 + h / 2;
        const inZone = st.fill >= 0.5 && st.fill <= 0.75;
        st.fillMesh.material.color.set(inZone ? 0xa0ffc0 : st.fill > 0.75 ? 0xffc0c0 : 0xf8e8c8);
      }
      if (st.active) hud.innerHTML = `🍦 cup ${st.round + 1}/5 · 💰 $${st.score}`;

      const t = performance.now() / 1000;
      for (const v of visitors) v.animateIdle(t);
      neon.material.opacity = 0.85 + Math.sin(t * 5.2) * 0.15;
    },
  };
}
