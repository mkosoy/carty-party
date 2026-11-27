import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { Input } from './engine/input.js';
import { Dialogue } from './engine/core.js';
import { cropPhotoSquare } from './engine/character.js';
import { airportScene } from './scenes/airport.js';
import { Music } from './engine/music.js';
import { initTitle } from './title.js';
import { initMapScreen } from './mapscreen.js';

const container = document.getElementById('game-container');

window.__lowPower = (navigator.maxTouchPoints > 0 && Math.min(window.innerWidth, window.innerHeight) < 820) || (navigator.hardwareConcurrency || 8) <= 4;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.__lowPower ? 1.4 : 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = window.__lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// cinematic post pipeline: bloom for emissive/neon, vignette for focus
const composer = new EffectComposer(renderer);
let renderPass = null;
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.__lowPower ? window.innerWidth / 2 : window.innerWidth, window.__lowPower ? window.innerHeight / 2 : window.innerHeight), 0.32, 0.55, 0.88);
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms.offset.value = 0.92;
vignettePass.uniforms.darkness.value = 0.85;
const outputPass = new OutputPass();
function rebuildComposer() {
  composer.passes = [];
  if (game && game.scene) {
    renderPass = new RenderPass(game.scene, camera);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(vignettePass);
    composer.addPass(outputPass);
  }
}
window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight));

const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const input = new Input();
const music = new Music();
window.__music = music;
window.__renderer = renderer;
const dialogue = new Dialogue(input);
fetch('assets/voice/manifest.json').then((r) => r.ok ? r.json() : null).then((m) => {
  if (m) dialogue.voiceManifest = m;
}).catch(() => {});
{
  const f = (n) => 'assets/faces2/' + n + '.png';
  dialogue.faceMap = {
    'Christian': f('christian'), 'Stacy': f('stacy'), 'Olivia': f('olivia'),
    'Olivia #2': f('olivia2'), 'Olivia??': f('olivia2'), 'Jim': f('jim'),
    'Mark': f('mark'), 'Kylie ❤️': f('kylie'), 'Tre': f('tre'), 'The Pilot': f('pilot'),
  };
}

// Face crops prepared once and handed to every scene. Crop fractions are
// tuned per photo so the face fills the character head.
async function loadFaces() {
  const f = (n) => 'assets/faces2/' + n + '.png';
  return {
    christian: f('christian'), stacy: f('stacy'), kylie: f('kylie'),
    olivia: f('olivia'), jim: f('jim'), mark: f('mark'),
    tre: f('tre'), olivia2: f('olivia2'), pilot: f('pilot'),
  };
}

window.__game = null;
const game = {
  renderer, camera, input, dialogue,
  faces: null,
  scene: null,
  sceneApi: null,
  async switchScene(factory) {
    try { localStorage.setItem('cp-checkpoint', factory.name.replace('Scene','')); } catch {}
    window.__sparkles = [];
    try { window.__radioStop?.(); } catch {}
    window.__camYaw = 0;
    const mb = document.getElementById('menu-button');
    if (mb) mb.classList.remove('hidden');
    window.__game = this;
    setTimeout(() => { try { const n = factory.name.replace('Scene',''); if (music.scene !== n) music.play(n); } catch {} }, 50);
    if (this.sceneApi?.dispose) this.sceneApi.dispose();
    this.scene = new THREE.Scene();
    // cinematic baseline lighting: soft sky fill + warm key with shadows.
    // scenes add their own mood lighting on top of this floor.
    const hemi = new THREE.HemisphereLight(0xbcc8e0, 0x40382c, 0.32);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff0d8, 0.65);
    key.position.set(6, 10, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(window.__lowPower ? 1024 : 2048, window.__lowPower ? 1024 : 2048);
    key.shadow.camera.left = -18; key.shadow.camera.right = 18;
    key.shadow.camera.top = 18; key.shadow.camera.bottom = -18;
    key.shadow.bias = -0.0004;
    this.scene.add(key);
    window.__sceneName = factory.name;
    this.sceneApi = await factory(this);
    rebuildComposer();
    // chapter title card: scene name fades in/out on entry
    const titles = { airport: 'chapter 1 — dulles', drive: 'chapter 2 — the yo yogi run', house: "chapter 3 — olivia's", swap: 'chapter 4 — the baltimore swap', dc: 'chapter 5 — dc at night', dentist: "dr. fritz's office", miami: 'e11even miami', runclub: "kylie's run club", echostage: 'echostage — bar shift', shopping: "kylie's shopping run", museum: 'air & space museum', hopkins: 'hopkins field lab' };
    const sName = factory.name ? factory.name.replace('Scene', '') : '';
    const titleText = titles[sName];
    if (titleText && !window.__menuSkipCard) {
      let card = document.getElementById('chapter-card');
      if (!card) {
        card = document.createElement('div');
        card.id = 'chapter-card';
        card.style.cssText = 'position:fixed;top:18%;left:0;right:0;text-align:center;z-index:28;pointer-events:none;font-family:Georgia;color:#e8b64c;font-size:clamp(20px,4vw,32px);font-style:italic;text-shadow:0 2px 14px rgba(0,0,0,.9);opacity:0;transition:opacity .9s';
        document.body.appendChild(card);
      }
      card.textContent = titleText;
      card.style.opacity = '0';
      setTimeout(() => { card.style.opacity = '1'; }, 350);
      clearTimeout(window.__cardT);
      window.__cardT = setTimeout(() => { card.style.opacity = '0'; }, 3400);
    }
    // controls hint overlay: visible at scene start, fades away
    let hint = document.getElementById('controls-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'controls-hint';
      hint.style.cssText = 'position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:30;background:rgba(10,12,22,.55);color:#e8dfc8;padding:6px 14px;border-radius:20px;font-family:Georgia;font-size:12.5px;pointer-events:none;transition:opacity 1.2s;white-space:nowrap';
      document.body.appendChild(hint);
    }
    const touch = 'ontouchstart' in window;
    hint.textContent = window.__sceneHint || (touch ? 'left thumb — move · right thumb — camera · tap ✦ to interact' : 'WASD move · shift sprint · space jump · E interact · drag camera');
    window.__sceneHint = null;
    hint.style.opacity = '1';
    clearTimeout(window.__hintT);
    window.__hintT = setTimeout(() => { hint.style.opacity = '0'; }, 14000);
  },
};

// M toggles music mute
window.addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && window.__music?.master) {
    window.__muteToggle = !window.__muteToggle;
    window.__music.master.gain.value = window.__muteToggle ? 0 : 0.16;
  }
});

const clock = new THREE.Clock();
let loopStarted = false;
function loop() {
  if (loopStarted) return;
  loopStarted = true;
  const frame = () => {
    requestAnimationFrame(frame);
    tick();
  };
  requestAnimationFrame(frame);
}
let fovTarget = 58;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  // sprint FOV kick: widens while shift-sprinting, eases back — speed you can feel
  const sprinting = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight') || window.__mobileSprint;
  const inDialogue = dialogue.active;
  const fovGoal = inDialogue ? 50 : (sprinting ? 66 : 58);
  fovTarget += (fovGoal - fovTarget) * Math.min(1, dt * 5);
  if (Math.abs(camera.fov - fovTarget) > 0.05) {
    camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 6);
    camera.updateProjectionMatrix();
  }
  // animate interaction sparkles: bob + pulse
  if (window.__sparkles) {
    const tt = performance.now() / 1000;
    for (const sp of window.__sparkles) {
      sp.spr.position.y = sp.base + Math.sin(tt * 2.2 + sp.phase) * 0.12;
      const s = 0.4 + Math.sin(tt * 3.1 + sp.phase) * 0.1;
      sp.spr.scale.set(s, s, 1);
    }
  }
  if (game.sceneApi?.update) game.sceneApi.update(dt);
  if (game.scene) {
    if (composer.passes.length) composer.render();
    else renderer.render(game.scene, camera);
  }
}

const titleFx = initTitle();
async function startGame(sceneName) {
  (await titleFx).stop();
  document.getElementById('title-screen').style.display = 'none';
  game.faces = await loadFaces();
  const factories = {
    airport: airportScene,
    drive: (await import('./scenes/drive.js')).driveScene,
    house: (await import('./scenes/house.js')).houseScene,
    swap: (await import('./scenes/swap.js')).swapScene,
    dc: (await import('./scenes/dc.js')).dcScene,
    dentist: (await import('./scenes/dentist.js')).dentistScene,
    miami: (await import('./scenes/miami.js')).miamiScene,
    runclub: (await import('./scenes/runclub.js')).runclubScene,
    echostage: (await import('./scenes/echostage.js')).echostageScene,
    shopping: (await import('./scenes/shopping.js')).shoppingScene,
    museum: (await import('./scenes/museum.js')).museumScene,
    hopkins: (await import('./scenes/hopkins.js')).hopkinsScene,
  };
  music.play(sceneName || 'airport');
  loop();
  await game.switchScene(factories[sceneName] || airportScene);
}
// save/continue: if a checkpoint exists the start button resumes there, and a fresh-start link appears
const cp = localStorage.getItem('cp-checkpoint');
const sb = document.getElementById('start-button');
if (cp && cp !== 'airport') {
  sb.textContent = `continue — ${cp}`;
  const fresh = document.createElement('div');
  fresh.textContent = 'start over from the airport';
  fresh.style.cssText = 'cursor:pointer;opacity:.7;font-size:14px;margin-top:10px;text-decoration:underline';
  fresh.addEventListener('click', () => { localStorage.removeItem('cp-checkpoint'); startGame(); }, { once: true });
  sb.parentElement.appendChild(fresh);
}
window.__startGame = startGame;
initMapScreen();
sb.addEventListener('click', () => startGame(cp && cp !== 'airport' ? cp : undefined), { once: true });
for (const btn of document.querySelectorAll('.mg-btn')) {
  btn.addEventListener('click', () => startGame(btn.dataset.scene));
}
// dev/test shortcut: ?scene=drive jumps straight in, skipping the title
const jump = new URLSearchParams(location.search).get('scene');
if (jump) startGame(jump);
