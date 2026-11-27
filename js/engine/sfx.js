// Tiny WebAudio sound effects — camera shutter, vinyl scratch, pickup chime.
function ac() {
  if (!window.__ac) window.__ac = new (window.AudioContext || window.webkitAudioContext)();
  if (window.__ac.state === 'suspended') window.__ac.resume().catch(() => {});
  return window.__ac;
}

export function sfxCamera() {
  const AC = ac();
  const t = AC.currentTime;
  // shutter: two quick noise clicks
  for (const dt of [0, 0.07]) {
    const len = 0.03;
    const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = AC.createBufferSource();
    src.buffer = buf;
    const f = AC.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.2;
    const g = AC.createGain();
    g.gain.value = 0.5;
    src.connect(f); f.connect(g); g.connect(AC.destination);
    src.start(t + dt);
  }
}

export function sfxVinyl() {
  const AC = ac();
  const t = AC.currentTime;
  // scratch: noise sweep down-up through bandpass
  const len = 0.35;
  const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const f = AC.createBiquadFilter();
  f.type = 'bandpass'; f.Q.value = 2.5;
  f.frequency.setValueAtTime(2600, t);
  f.frequency.exponentialRampToValueAtTime(700, t + 0.15);
  f.frequency.exponentialRampToValueAtTime(2400, t + 0.33);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  src.connect(f); f.connect(g); g.connect(AC.destination);
  src.start(t); src.stop(t + len);
}

export function sfxChime() {
  const AC = ac();
  const t = AC.currentTime;
  for (const [fq, dt] of [[880, 0], [1320, 0.09]]) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine';
    o.frequency.value = fq;
    g.gain.setValueAtTime(0.0001, t + dt);
    g.gain.exponentialRampToValueAtTime(0.22, t + dt + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.5);
    o.connect(g); g.connect(AC.destination);
    o.start(t + dt); o.stop(t + dt + 0.55);
  }
}

export function sfxStep(running = false) {
  const AC = ac();
  const t = AC.currentTime;
  const len = 0.05;
  const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = running ? 480 : 380;
  const g = AC.createGain();
  g.gain.value = 0.12;
  src.connect(f); f.connect(g); g.connect(AC.destination);
  src.start(t);
}

export function sfxCrash() {
  const AC = ac();
  const t = AC.currentTime;
  // thud: low noise burst + frequency drop
  const len = 0.25;
  const buf = AC.createBuffer(1, AC.sampleRate * len, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.6);
  const src = AC.createBufferSource();
  src.buffer = buf;
  const f = AC.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(400, t);
  f.frequency.exponentialRampToValueAtTime(90, t + len);
  const g = AC.createGain();
  g.gain.value = 0.5;
  src.connect(f); f.connect(g); g.connect(AC.destination);
  src.start(t);
  // metal clank harmonic
  const o = AC.createOscillator();
  o.type = 'square';
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(60, t + 0.2);
  const og = AC.createGain();
  og.gain.setValueAtTime(0.12, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(og); og.connect(AC.destination);
  o.start(t); o.stop(t + 0.24);
}

export function sfxGobble() {
  const AC = ac();
  const t = AC.currentTime;
  // turkey gobble: rapid warbling bursts — pitch wobbles fast
  const o = AC.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(320, t);
  const g = AC.createGain();
  g.gain.value = 0;
  const f = AC.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1400;
  o.connect(f); f.connect(g); g.connect(AC.destination);
  // warble via LFO on frequency
  const lfo = AC.createOscillator();
  lfo.frequency.value = 28;
  const lfoG = AC.createGain();
  lfoG.gain.value = 90;
  lfo.connect(lfoG); lfoG.connect(o.frequency);
  o.start(t); lfo.start(t);
  g.gain.setValueAtTime(0.16, t);
  g.gain.setValueAtTime(0.16, t + 0.28);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o.stop(t + 0.42); lfo.stop(t + 0.42);
}

export function sfxBoost() {
  const AC = ac();
  const t = AC.currentTime;
  // speed boost: rising whoosh
  const o = AC.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(300, t);
  o.frequency.exponentialRampToValueAtTime(900, t + 0.28);
  const g = AC.createGain();
  g.gain.setValueAtTime(0.14, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.connect(g); g.connect(AC.destination);
  o.start(t); o.stop(t + 0.34);
}
