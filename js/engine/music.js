// Procedural ambient music: soft pad chords + sparse bell melody per scene.
// All WebAudio, no assets. Each scene gets a mood: airport=calm piano bells,
// drive=upbeat arp, house=warm/quiet, swap=party groove, dc=slow waltz bells.
export class Music {
  constructor() {
    this.ctx = null;
    this.nodes = [];
    this.timer = null;
    this.scene = null;
  }
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.11;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    for (const n of this.nodes) { try { n.disconnect(); } catch {} }
    this.nodes = [];
    this.scene = null;
  }
  bell(freq, t, vol = 0.5, dur = 1.6) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = c.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = freq * 2.01;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol * 0.5, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const g2 = c.createGain();
    g2.gain.value = 0.3;
    o.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(this.master);
    o.start(t); o2.start(t);
    o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }
  pad(freqs, t, dur, vol = 0.12) {
    const c = this.ctx;
    for (const f of freqs) {
      const o = c.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.1);
    }
  }
  wobble(freq, t, dur, vol = 0.3, rate = 6) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 9;
    f.frequency.value = 650;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = rate;
    const lfoG = c.createGain();
    lfoG.gain.value = 480;
    lfo.connect(lfoG); lfoG.connect(f.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.setValueAtTime(vol, t + dur * 0.75);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); lfo.start(t);
    o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  }
  hat(t, vol = 0.06, open = false) {
    const dur = open ? 0.09 : 0.03;
    const buf = this.noiseBuf || (this.noiseBuf = (() => { const b = this.ctx.createBuffer(1, 4410, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < 4410; i++) d[i] = Math.random() * 2 - 1; return b; })());
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  kick(t, vol = 0.5) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(135, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.11);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.3);
  }
  bass(freq, t, dur, vol = 0.3) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.1);
  }
  // scene moods — step sequencer at ~92bpm-ish feel, bars of 8 steps
  ambient(sceneName) {
    if (this.ambNodes) {
      for (const n of this.ambNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch {} }
    }
    this.ambNodes = [];
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const noiseBuf = (() => { const b = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const loop = (freq, q, vol, type = 'bandpass') => {
      const s = this.ctx.createBufferSource();
      s.buffer = noiseBuf;
      s.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 2);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t);
      this.ambNodes.push(s, g);
    };
    if (sceneName === 'airport') { loop(400, 0.6, 0.02); loop(120, 0.8, 0.025, 'lowpass'); }
    else if (sceneName === 'miami') loop(700, 0.5, 0.015);
    else if (sceneName === 'dc') loop(500, 0.4, 0.02, 'highpass');
    else if (sceneName === 'house') loop(240, 1.2, 0.018, 'lowpass');
    else if (sceneName === 'swap') loop(500, 0.6, 0.015);
    else if (sceneName === 'echostage') { loop(600, 0.5, 0.02); loop(150, 0.4, 0.03, 'lowpass'); }
    else if (sceneName === 'shopping') loop(380, 0.8, 0.015);
    else if (sceneName === 'museum') loop(300, 1.0, 0.014, 'highpass');
    else if (sceneName === 'hopkins') loop(420, 0.7, 0.012, 'lowpass');
  }

  play(sceneName) {
    this.ensure();
    if (this.scene === sceneName) return;
    this.stop();
    this.scene = sceneName;
    this.ambient(sceneName);
    let stepDur = 0.34;
    let step = 0;
    const N = (n) => 440 * Math.pow(2, (n - 9) / 12); // semitone number -> freq
    const patterns = {
      airport: {
        chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-4, 0, 5]],
        melody: [12, -1, 7, -1, 10, -1, 7, -1, 12, -1, 15, -1, 10, -1, 7, -1],
        melody2: [-1, -1, 10, -1, 12, -1, 15, -1, 12, -1, 10, -1, 7, -1, -1, -1],
        melody3: [7, -1, 10, -1, 12, -1, -1, -1, 15, -1, 12, -1, 10, -1, 7, -1],
        bellVol: 0.24, padVol: 0.07, bassN: -12,
      },
      drive: {
        chords: [[0, 4, 7], [0, 4, 7], [-3, 0, 5], [-2, 2, 7]],
        melody: [7, 12, 7, 12, 10, 12, 10, 12, 5, 10, 5, 10, 7, 12, 14, 12],
        melody2: [12, 7, 12, 7, 14, 12, 14, 12, 10, 5, 10, 5, 12, 14, 16, 14],
        bellVol: 0.16, padVol: 0.05, bassN: -5,
      },
      house: {
        chords: [[0, 4, 7], [5, 8, 12], [3, 7, 10], [0, 4, 7]],
        melody: [-1, 7, -1, -1, 12, -1, 10, -1, -1, 7, -1, -1, 5, -1, -1, -1],
        melody2: [-1, -1, 12, -1, -1, 14, -1, -1, 10, -1, -1, 7, -1, -1, 5, -1],
        bellVol: 0.2, padVol: 0.08, bassN: -12,
      },
      swap: { hats: true,
        chords: [[0, 4, 7], [-3, 0, 4], [5, 8, 12], [-2, 2, 5]],
        melody: [12, 12, -1, 12, 14, -1, 12, 10, -1, 10, 12, -1, 7, -1, 10, -1],
        melody2: [14, -1, 14, -1, 17, -1, 14, -1, 12, -1, 14, -1, 10, -1, 12, -1],
        melody3: [12, -1, 10, 12, -1, 12, -1, -1, 14, 12, 10, -1, 7, -1, -1, -1],
        bellVol: 0.2, padVol: 0.05, bassN: -17,
      },
      miami: { hats: true,
        chords: [[0, 3, 7], [0, 3, 7], [-4, 0, 3], [-2, 2, 5]],
        melody: [12, -1, -1, -1, 15, -1, -1, -1, 12, -1, -1, 14, -1, -1, 10, -1],
        melody2: [-1, -1, 15, -1, -1, 17, -1, -1, 15, -1, -1, -1, 12, -1, 14, -1],
        bellVol: 0.16, padVol: 0.05, bassN: -5,
        dubstep: true, stepDur: 0.155,
      },
      dentist: {
        chords: [[0, 4, 7], [2, 5, 9], [0, 4, 7], [-2, 2, 5]],
        melody: [7, -1, 12, -1, 9, -1, 7, -1, 5, -1, 7, -1, 4, -1, -1, -1],
        melody2: [-1, 9, -1, -1, 12, -1, -1, 9, -1, -1, 7, -1, 5, -1, 4, -1],
        bellVol: 0.18, padVol: 0.05, bassN: -12,
      },
      runclub: { hats: true,
        chords: [[0, 4, 7], [0, 4, 7], [5, 9, 12], [3, 7, 10]],
        melody: [12, 7, 12, 7, 14, 7, 14, 7, 15, 7, 15, 12, 14, 12, 10, 7],
        melody2: [15, 12, 15, 12, 17, 15, 17, 15, 19, 15, 19, 17, 15, 14, 12, 10],
        bellVol: 0.18, padVol: 0.05, bassN: -7,
      },
      dc: {
        chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]],
        melody: [12, -1, -1, 15, -1, -1, 14, -1, 12, -1, 10, -1, 7, -1, -1, -1],
        melody2: [-1, 15, -1, -1, 14, -1, 12, -1, -1, 14, -1, -1, 15, -1, -1, -1],
        melody3: [7, -1, 10, -1, 12, -1, -1, -1, 15, -1, 14, -1, 12, -1, 10, -1],
        bellVol: 0.28, padVol: 0.09, bassN: -12,
      },
    };
    const pat = patterns[sceneName] || patterns.airport;
    stepDur = pat.stepDur || stepDur;
    let bar = 0;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.06;
      // rotate up to three melody variants bar by bar so loops stay fresh
      const variant = Math.floor(step / 16) % 3;
      const melSeq = variant === 1 && pat.melody2 ? pat.melody2 : variant === 2 && pat.melody3 ? pat.melody3 : pat.melody;
      const mel = melSeq[step % 16];
      const breakBar = (bar % 8 === 7);
      if (mel >= 0 && !breakBar) {
        // octave lift on the back half of each 8-bar phrase — keeps long loops fresh
        const lift = (bar % 8 >= 4) ? 12 : 0;
        this.bell(N(mel + lift), t, pat.bellVol);
        // harmonic richness: a third above, softer, on alternate bars — and octave sparkle every 4th bar
        if (bar % 2 === 0) this.bell(N(mel + 4), t + 0.01, pat.bellVol * 0.4);
        if (bar % 4 === 3) this.bell(N(mel + 12), t + 0.005, pat.bellVol * 0.3);
      }
      // melodic fills: soft passing notes on the off-steps every other bar
      if (variant === 2 && step % 2 === 1 && melSeq[(step - 1) % 16] >= 0) {
        this.bell(N(melSeq[(step - 1) % 16] + 2), t, pat.bellVol * 0.25);
      }
      if (step % 16 === 0) {
        const chord = pat.chords[bar % pat.chords.length];
        this.pad(chord.map((n) => N(n - 12)), t, stepDur * 16, pat.padVol);
        this.bass(N(pat.bassN + chord[0] * 0 ), t, stepDur * 4, 0.14);
        bar++;
      }
      if (step % 4 === 0) this.bass(N((pat.chords[(bar - 1 + pat.chords.length) % pat.chords.length]?.[0] ?? 0) - 24), t, stepDur * 3, 0.1);
      if (!pat.dubstep && pat.hats && step % 2 === 1) this.hat(t, step % 8 === 7 ? 0.075 : 0.045, step % 8 === 7);
      if (pat.dubstep) {
        const root = (pat.chords[(bar - 1 + pat.chords.length) % pat.chords.length]?.[0] ?? 0);
        if (step % 2 === 0) this.kick(t, 0.5); // driving four-on-floor at 2x step rate
        // wobble bass hits: syncopated riddim pattern with octave jumps
        const wobSteps = [0, 3, 6, 8, 11, 14];
        const si = step % 16;
        if (wobSteps.includes(si)) {
          const oct = (si === 8 || si === 11) ? -12 : -24;
          this.wobble(N(root + oct), t, stepDur * (si === 8 ? 4.5 : 2.6), 0.34, si % 4 === 0 ? 5 : 8);
        }
        // snare-ish noise click on the backbeat
        if (step % 8 === 4) {
          const nb = this.ctx.createBufferSource();
          const buf = this.ctx.createBuffer(1, 2205, 22050);
          const d = buf.getChannelData(0);
          for (let i = 0; i < 2205; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / 2205);
          nb.buffer = buf;
          const nf = this.ctx.createBiquadFilter();
          nf.type = 'highpass'; nf.frequency.value = 1800;
          const ng = this.ctx.createGain();
          ng.gain.value = 0.22;
          nb.connect(nf); nf.connect(ng); ng.connect(this.master);
          nb.start(t);
        }
      }
      step++;
    };
    tick();
    this.timer = setInterval(tick, stepDur * 1000);
  }
}
