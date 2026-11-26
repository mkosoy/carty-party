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

const container = document.getElementById('game-container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// cinematic post pipeline: bloom for emissive/neon, vignette for focus
const composer = new EffectComposer(renderer);
let renderPass = null;
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.55, 0.88);
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms.offset.value = 0.92;
vignettePass.uniforms.darkness.value = 1.25;
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
    window.__camYaw = 0;
    const mb = document.getElementById('menu-button');
    if (mb) mb.classList.remove('hidden');
    window.__game = this;
    setTimeout(() => { try { const n = factory.name.replace('Scene',''); if (music.scene !== n) music.play(n); } catch {} }, 50);
    if (this.sceneApi?.dispose) this.sceneApi.dispose();
    this.scene = new THREE.Scene();
    window.__sceneName = factory.name;
    this.sceneApi = await factory(this);
    rebuildComposer();
  },
};

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
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
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
  };
  music.play(sceneName || 'airport');
  loop();
  await game.switchScene(factories[sceneName] || airportScene);
}
document.getElementById('start-button').addEventListener('click', () => startGame(), { once: true });
for (const btn of document.querySelectorAll('.mg-btn')) {
  btn.addEventListener('click', () => startGame(btn.dataset.scene));
}
// dev/test shortcut: ?scene=drive jumps straight in, skipping the title
const jump = new URLSearchParams(location.search).get('scene');
if (jump) startGame(jump);
