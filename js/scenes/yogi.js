import * as THREE from 'three';
import { sfxChime } from '../engine/sfx.js';
import { makePerson, playerIdentity } from '../engine/character.js';
import { FollowCam, PlayerController, Interactions, showObjective, Pickups } from '../engine/core.js';
import { inventory, makeCameraMesh, makeRecordMesh } from '../engine/collectibles.js';

// Yo Yogi Sushi — downtown crown / rio, Gaithersburg. The whole drive chapter
// is a race to get here before 9pm. Conveyor belt sushi, warm wood, closing soon.
export async function yogiScene(game) {
  const { scene, camera, input, dialogue, faces } = game;

  scene.background = new THREE.Color(0x241c26);
  scene.fog = new THREE.Fog(0x241c26, 26, 60);
  scene.add(new THREE.AmbientLight(0xffe8d0, 0.85));
  const key = new THREE.DirectionalLight(0xfff4e0, 0.7);
  key.position.set(4, 12, 5);
  key.castShadow = true;
  scene.add(key);

  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

  // white tile floor with a pink grout grid
  const tileC = document.createElement('canvas');
  tileC.width = 128; tileC.height = 128;
  const tc = tileC.getContext('2d');
  tc.fillStyle = '#6a4a34'; tc.fillRect(0, 0, 128, 128);
  tc.strokeStyle = '#543a28'; tc.lineWidth = 3;
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
    [30, 5.5, 0.4, 0, -10, 0x8a2030], [30, 5.5, 0.4, 0, 10, 0x4a3a2c], [0.4, 5.5, 20, -15, 0, 0x4a3a2c], [0.4, 5.5, 20, 15, 0, 0x4a3a2c],
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
  nc.shadowColor = '#ff5040'; nc.shadowBlur = 24;
  nc.fillStyle = '#ffe0c8';
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
  mc.fillText('TONIGHT\u2019S ROLLS', 256, 44);
  mc.font = '24px Georgia'; mc.fillStyle = '#f0e8d8'; mc.textAlign = 'left';
  const flavors = ['california roll', 'spicy tuna', 'dragon roll', 'salmon nigiri', 'the bronco special', 'veggie crunch'];
  flavors.forEach((f, i) => mc.fillText('• ' + f, 60 + (i % 2) * 220, 90 + Math.floor(i / 2) * 48));
  const menuT = new THREE.CanvasTexture(menuC);
  menuT.colorSpace = THREE.SRGBColorSpace;
  const menu = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.75), new THREE.MeshBasicMaterial({ map: menuT }));
  menu.position.set(-8, 3.4, -9.78);
  scene.add(menu);

  // sushi bar along the back wall: dark counter, display case, itamae behind
  const sushiBar = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.4 }));
  sushiBar.position.set(-0.5, 0.5, -8.8);
  scene.add(sushiBar);
  const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: 0xc8e8f0, transparent: true, opacity: 0.25, roughness: 0.05 }));
  caseGlass.position.set(-1.5, 1.4, -8.8);
  scene.add(caseGlass);
  // fish in the case
  const fishColors = [0xff8060, 0xffb080, 0xf0f0e8, 0xe85858, 0xffd0a0, 0x98c8a8];
  for (let i = 0; i < 6; i++) {
    const fillet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.3), new THREE.MeshStandardMaterial({ color: fishColors[i], roughness: 0.5 }));
    fillet.position.set(-5.5 + i * 1.5, 1.15, -8.8);
    scene.add(fillet);
  }
  // hanging red lanterns along the bar
  for (let i = 0; i < 4; i++) {
    const lant = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd83030, emissive: 0xff4020, emissiveIntensity: 0.5 }));
    lant.scale.y = 1.25;
    lant.position.set(-6 + i * 3.6, 3.4, -7.8);
    scene.add(lant);
    const glow = new THREE.PointLight(0xff6040, 4, 5);
    glow.position.set(-6 + i * 3.6, 3.2, -7.6);
    scene.add(glow);
  }
  // noren curtain strips over the kitchen door
  for (let i = 0; i < 4; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.4), new THREE.MeshLambertMaterial({ color: 0x28406a, side: THREE.DoubleSide }));
    strip.position.set(6.2 + i * 0.58, 3.2, -9.7);
    scene.add(strip);
  }
  // ----- the conveyor belt: ellipse loop around the room center -----
  const beltGroup = new THREE.Group();
  const beltTop = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.42, 8, 40), new THREE.MeshStandardMaterial({ color: 0x8a8a92, roughness: 0.35, metalness: 0.5 }));
  beltTop.rotation.x = Math.PI / 2;
  beltTop.scale.set(1.25, 1, 0.75);
  beltTop.position.y = 1.0;
  beltGroup.add(beltTop);
  const beltBase = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.46, 8, 40), new THREE.MeshLambertMaterial({ color: 0x2e2e36 }));
  beltBase.rotation.x = Math.PI / 2;
  beltBase.scale.set(1.25, 1, 0.75);
  beltBase.position.y = 0.85;
  beltGroup.add(beltBase);
  beltGroup.position.set(-1, 0, 0.5);
  scene.add(beltGroup);
  // sushi plates riding the belt
  const plateTypes = [
    { key: 'tuna', color: 0xe85050, label: 'spicy tuna' },
    { key: 'salmon', color: 0xff9860, label: 'salmon nigiri' },
    { key: 'cali', color: 0xf0e8c8, label: 'california roll' },
    { key: 'veggie', color: 0x78c868, label: 'veggie crunch' },
  ];
  const beltPlates = [];
  for (let i = 0; i < 8; i++) {
    const pg = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.2 }));
    pg.add(plate);
    const pt = plateTypes[i % 4];
    for (let b = 0; b < 2; b++) {
      const bite = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.14), new THREE.MeshStandardMaterial({ color: pt.color, roughness: 0.55 }));
      bite.position.set(-0.07 + b * 0.15, 0.07, 0);
      pg.add(bite);
    }
    pg.userData.type = pt.key;
    pg.userData.t = (i / 8) * Math.PI * 2;
    beltGroup.add(pg);
    beltPlates.push(pg);
  }
  bounds.push({ minX: -8.5, maxX: 6, minZ: -10.4, maxZ: -8.2 });
  bounds.push({ minX: -5.6, maxX: 3.8, minZ: -2.4, maxZ: 3.6 });

  // toppings bar — long counter with little colorful bins
  const barTop = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 1.4), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.4 }));
  barTop.position.set(-8, 0.95, 2);
  scene.add(barTop);
  const barBody = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.9, 1.2), mat(0x54382a));
  barBody.position.set(-8, 0.45, 2);
  scene.add(barBody);
  const topColors = [0xe8a0a8, 0x78a858, 0x3a3a30, 0xd8d0c0, 0xe8a0a8, 0x78a858, 0x3a3a30, 0xd8d0c0, 0xc85848, 0xf0e8d8];
  for (let i = 0; i < 10; i++) {
    const bin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.5), new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.3, metalness: 0.5 }));
    bin.position.set(-10.6 + i * 0.58, 1.06, 2);
    scene.add(bin);
    const fill = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.1, 0.42), new THREE.MeshStandardMaterial({ color: topColors[i], roughness: 0.9 }));
    fill.position.set(-10.6 + i * 0.58, 1.12, 2);
    scene.add(fill);
  }
  bounds.push({ minX: -11.5, maxX: -4.5, minZ: 1.3, maxZ: 2.7 });

  // the pickup counter along the east wall
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
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.35 }));
    table.position.set(tx, 0.85, tz);
    scene.add(table);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.85, 8), mat(0x909098));
    leg.position.set(tx, 0.42, tz);
    scene.add(leg);
    for (const [ox, oz] of [[0.9, 0], [-0.9, 0], [0, 0.9]]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), mat(0x6a3040));
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
  const employee = makePerson({ top: 0xf0f0e8, bottom: 0x3a3a42, hair: 0x4a2e18, hairStyle: 'bun', skin: 0xc89878, name: 'Kayla' });
  employee.group.position.set(4.5, 0, -8.0);
  employee.group.rotation.y = Math.PI;
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

  // ---- the conveyor grab minigame ----
  // plates circle the belt; your order ticket names a plate; press E when the
  // right plate crosses the glowing grab zone. five orders, belt speeds up.
  const st = { active: false, done: false, round: 0, score: 0, order: null, beltSpeed: 0.5 };
  const hud = document.createElement('div');
  hud.style.cssText = 'position:fixed;top:60px;left:50%;transform:translateX(-50%);background:rgba(20,10,10,.85);color:#ffe0c8;padding:8px 18px;border-radius:12px;font-family:Georgia;font-size:16px;z-index:30;display:none';
  document.body.appendChild(hud);
  // grab zone marker on the east rim of the belt
  const grabRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 20), new THREE.MeshBasicMaterial({ color: 0x60ff80 }));
  grabRing.rotation.x = Math.PI / 2;
  grabRing.position.set(4.25, 1.12, 0);
  grabRing.visible = false;
  beltGroup.add(grabRing);

  interactions.add({
    pos: new THREE.Vector3(3.6, 0, 0.5), radius: 2.4, label: 'Grab from the conveyor belt',
    action: async () => {
      if (st.active || st.done) return;
      player.frozen = true;
      await dialogue.play([
        { speaker: 'Kayla', text: 'You want to try the belt? Fine — watch the ticket, grab the plate it says WHEN it passes right in front of you.' },
        { speaker: 'Christian', text: 'Five orders. The bronco special had better be real.' },
        { speaker: 'Kayla', text: 'Press E as the right plate crosses the glowing grab zone. Grab the wrong plate and the itamae judges you.' },
      ]);
      player.frozen = false;
      st.active = true;
      st.round = 0;
      st.score = 0;
      st.order = plateTypes[Math.floor(Math.random() * 4)];
      hud.style.display = 'block';
      grabRing.visible = true;
      showObjective('press E when the right plate crosses the glowing zone!', 4000);
    },
  });

  interactions.add({ pos: new THREE.Vector3(-8, 0, 2), radius: 2.2, label: 'The condiment station', action: say([
    { speaker: 'Christian', text: 'Pickled ginger, wasabi, the good soy. The wasabi-to-courage ratio here is deeply personal.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(8, 0, -7), radius: 2.4, label: 'The CLOSES AT 9 sign', action: say([
    { speaker: 'Christian', text: 'The sign that launched a hundred highway merges. Sacred text. The constitution of Gaithersburg.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(-8, 0, -7), radius: 2.6, label: 'The sushi case', action: say([
    { speaker: 'Kayla', text: 'The salmon is the move. The bronco special is not on the menu, do not ask about the bronco special.' },
  ]) });
  interactions.add({ pos: new THREE.Vector3(2, 0, 5), radius: 2.2, label: 'The window seats', action: say([
    { speaker: 'Christian', text: 'Half of MoCo\u2019s big decisions got made over conveyor sushi. Also at least three breakups per winter.' },
  ]) });

  const pickups = new Pickups(scene);
  const invC = inventory();
  pickups.add(makeCameraMesh(), -13.5, 8.5, 'camera-yogi-1', () => { invC.cameras++; sfxChime(); showObjective('📷 vintage camera for Stacy — abandoned at the window seat!', 2500); });
  pickups.add(makeRecordMesh(), 13.5, 8.5, 'record-yogi-1', () => { invC.records++; sfxChime(); showObjective('🎵 vinyl record — someone traded it for sushi!', 2500); });

  window.__sceneHint = 'WASD — move · E — interact · grab sushi off the conveyor belt';
  showObjective('Yo Yogi Sushi — you made it before 9. The belt is moving.', 6000);

  return {
    update(dt) {
      window.__sceneHooks = { interactions, player, christian: hero, self: this };
      player.update(dt);
      followCam.update(dt, hero.group.position);
      pickups.update(dt, hero.group.position);
      // plates ride the belt forever — even outside the minigame it is alive
      for (const pg of beltPlates) {
        pg.userData.t += dt * (st.active ? st.beltSpeed + st.round * 0.09 : 0.28);
        const t2 = pg.userData.t % (Math.PI * 2);
        pg.position.set(Math.cos(t2) * 3.4 * 1.25, 1.08, Math.sin(t2) * 3.4 * 0.75);
        pg.rotation.y = -t2;
      }

      const nearI = interactions.nearest(hero.group.position);
      const promptEl = document.getElementById('interact-prompt');
      const grabReady = st.active && Math.hypot(hero.group.position.x - 3.6, hero.group.position.z - 0.5) < 3.0;
      if (st.active && grabReady) {
        promptEl.textContent = 'E — grab the plate!';
        promptEl.classList.remove('hidden');
      } else if (nearI && !player.frozen) {
        promptEl.textContent = 'E — ' + nearI.label;
        promptEl.classList.remove('hidden');
      } else if (promptEl) promptEl.classList.add('hidden');

      if (input.consumeInteract()) {
        if (st.active && grabReady && !player.frozen) {
          // which plate is in the grab zone? belt-local x near max (cos(t) ~ 1, sin ~ 0)
          let bestP = null, bestD = 0.8;
          for (const pg of beltPlates) {
            const d = Math.hypot(pg.position.x - 4.25, pg.position.z - 0);
            if (d < bestD) { bestD = d; bestP = pg; }
          }
          if (!bestP) {
            showObjective('nothing there! grabbed air.', 1300);
          } else if (bestP.userData.type === st.order.key) {
            st.score += 20;
            sfxChime();
            showObjective('GOT IT — ' + st.order.label + '! +$20', 1500);
            st.round++;
          } else {
            st.score = Math.max(0, st.score - 5);
            showObjective('wrong plate! the itamae sighs. -$5', 1500);
            st.round++;
          }
          if ((bestP || !bestP) && st.round > 0 && (bestP === null || true)) {
            // new order if round advanced
          }
          if (st.round >= 5) {
            st.active = false;
            st.done = true;
            hud.style.display = 'none';
            grabRing.visible = false;
            const lines = st.score >= 80
              ? [{ speaker: 'Kayla', text: 'Five-for-five off a moving belt. You are officially the bronco special.' }, { speaker: 'Christian', text: 'Tell the sign. The sign should know what I am.' }]
              : st.score >= 40
                ? [{ speaker: 'Kayla', text: 'Respectable belt work! You only mildly embarrassed yourself. Come back anytime before 9.' }]
                : [{ speaker: 'Kayla', text: 'You grabbed everything except the food. Impressive, in a way. We close at 9 — practice is over.' }];
            player.frozen = true;
            dialogue.play(lines).then(() => {
              player.frozen = false;
              if (st.score >= 40) try { localStorage.setItem('cp-done-yogi', '1'); } catch {}
              setTimeout(() => { if (window.__showMap) window.__showMap(); }, 2500);
            });
          } else if (bestP) {
            st.order = plateTypes[Math.floor(Math.random() * 4)];
          }
        } else if (nearI && !player.frozen) nearI.action();
      }

      if (st.active) hud.innerHTML = `🍣 order ${st.round + 1}/5: <b>${st.order ? st.order.label : ''}</b> · 💰 $${st.score}`;

      const t = performance.now() / 1000;
      for (const v of visitors) v.animateIdle(t);
      neon.material.opacity = 0.85 + Math.sin(t * 5.2) * 0.15;
    },
  };
}
