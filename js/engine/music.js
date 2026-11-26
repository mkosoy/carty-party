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
      this.master.gain.value = 0.16;
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
  play(sceneName) {
    this.ensure();
    if (this.scene === sceneName) return;
    this.stop();
    this.scene = sceneName;
    const stepDur = 0.34;
    let step = 0;
    const N = (n) => 440 * Math.pow(2, (n - 9) / 12); // semitone number -> freq
    const patterns = {
      airport: {
        chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-4, 0, 5]],
        melody: [12, -1, 7, -1, 10, -1, 7, -1, 12, -1, 15, -1, 10, -1, 7, -1],
        bellVol: 0.24, padVol: 0.07, bassN: -12,
      },
      drive: {
        chords: [[0, 4, 7], [0, 4, 7], [-3, 0, 5], [-2, 2, 7]],
        melody: [7, 12, 7, 12, 10, 12, 10, 12, 5, 10, 5, 10, 7, 12, 14, 12],
        bellVol: 0.16, padVol: 0.05, bassN: -5,
      },
      house: {
        chords: [[0, 4, 7], [5, 8, 12], [3, 7, 10], [0, 4, 7]],
        melody: [-1, 7, -1, -1, 12, -1, 10, -1, -1, 7, -1, -1, 5, -1, -1, -1],
        bellVol: 0.2, padVol: 0.08, bassN: -12,
      },
      swap: {
        chords: [[0, 4, 7], [-3, 0, 4], [5, 8, 12], [-2, 2, 5]],
        melody: [12, 12, -1, 12, 14, -1, 12, 10, -1, 10, 12, -1, 7, -1, 10, -1],
        bellVol: 0.2, padVol: 0.05, bassN: -17,
      },
      miami: {
        chords: [[0, 3, 7], [-2, 2, 5], [0, 3, 7], [3, 7, 10]],
        melody: [12, -1, 12, 15, -1, 12, -1, 19, 17, -1, 15, -1, 12, -1, 10, 12],
        bellVol: 0.22, padVol: 0.06, bassN: -5,
      },
      dentist: {
        chords: [[0, 4, 7], [2, 5, 9], [0, 4, 7], [-2, 2, 5]],
        melody: [7, -1, 12, -1, 9, -1, 7, -1, 5, -1, 7, -1, 4, -1, -1, -1],
        bellVol: 0.18, padVol: 0.05, bassN: -12,
      },
      runclub: {
        chords: [[0, 4, 7], [0, 4, 7], [5, 9, 12], [3, 7, 10]],
        melody: [12, 7, 12, 7, 14, 7, 14, 7, 15, 7, 15, 12, 14, 12, 10, 7],
        bellVol: 0.18, padVol: 0.05, bassN: -7,
      },
      dc: {
        chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [0, 3, 7]],
        melody: [12, -1, -1, 15, -1, -1, 14, -1, 12, -1, 10, -1, 7, -1, -1, -1],
        bellVol: 0.28, padVol: 0.09, bassN: -12,
      },
    };
    const pat = patterns[sceneName] || patterns.airport;
    let bar = 0;
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.06;
      const mel = pat.melody[step % 16];
      if (mel >= 0) this.bell(N(mel), t, pat.bellVol);
      if (step % 16 === 0) {
        const chord = pat.chords[bar % pat.chords.length];
        this.pad(chord.map((n) => N(n - 12)), t, stepDur * 16, pat.padVol);
        this.bass(N(pat.bassN + chord[0] * 0 ), t, stepDur * 4, 0.14);
        bar++;
      }
      if (step % 4 === 0) this.bass(N((pat.chords[(bar - 1 + pat.chords.length) % pat.chords.length]?.[0] ?? 0) - 24), t, stepDur * 3, 0.1);
      step++;
    };
    tick();
    this.timer = setInterval(tick, stepDur * 1000);
  }
}
