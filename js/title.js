// Animated title screen: falling snow, twinkling light strand, cast chips
// cropped from the group photos, and a gentle procedural chime loop.
import { cropPhotoSquare } from './engine/character.js';

export async function initTitle() {
  // snow canvas
  const canvas = document.getElementById('title-snow');
  const ctx = canvas.getContext('2d');
  let w, h;
  const resize = () => { w = canvas.width = canvas.clientWidth; h = canvas.height = canvas.clientHeight; };
  resize();
  window.addEventListener('resize', resize);
  const flakes = Array.from({ length: 160 }, () => ({
    x: Math.random(), y: Math.random(), r: 1 + Math.random() * 2.6, s: 0.02 + Math.random() * 0.06, drift: Math.random() * 2,
  }));
  let alive = true;
  const draw = (t) => {
    if (!alive) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const f of flakes) {
      f.y += f.s / 100;
      if (f.y > 1.02) f.y = -0.02;
      const x = (f.x + Math.sin(t / 1600 + f.drift) * 0.02) * w;
      ctx.beginPath();
      ctx.arc(x, f.y * h, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // distant skyline silhouette at the bottom (monument + capitol hints)
    ctx.fillStyle = 'rgba(10,16,34,.9)';
    ctx.fillRect(0, h - 46, w, 46);
    ctx.fillRect(w * 0.18, h - 130, 14, 130);           // monument
    ctx.beginPath(); ctx.moveTo(w * 0.18, h - 130); ctx.lineTo(w * 0.18 + 7, h - 150); ctx.lineTo(w * 0.18 + 14, h - 130); ctx.fill();
    ctx.beginPath(); ctx.arc(w * 0.72, h - 46, 42, Math.PI, 0); ctx.fill();  // dome
    // ground tree silhouettes
    for (let i = 0; i < 7; i++) {
      const tx = w * (0.05 + i * 0.14), th = 26 + (i % 3) * 10;
      ctx.fillStyle = 'rgba(16,34,24,.95)';
      ctx.beginPath();
      ctx.moveTo(tx, h - 46);
      ctx.lineTo(tx + 10, h - 46 - th);
      ctx.lineTo(tx + 20, h - 46);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  // light strand colors
  const strand = document.getElementById('title-lights');
  const colors = ['#ff5555', '#ffd663', '#50ff70', '#66aaff', '#ff88dd'];
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('span');
    b.style.background = colors[i % 5];
    b.style.color = colors[i % 5];
    b.style.animationDelay = (i * 0.18) + 's';
    strand.appendChild(b);
  }

  // cast faces are pre-cropped assets
  const castMap = { 'cast-stacy': 'stacy', 'cast-olivia': 'olivia', 'cast-kylie': 'kylieSolo', 'cast-mark': 'mark' };
  for (const [id, name] of Object.entries(castMap)) {
    const el = document.getElementById(id);
    if (el) el.src = 'assets/faces/' + name + '.png';
  }

  // procedural chime loop — silent until user interacts (browser policy)
  let audioStarted = false;
  const startAudio = () => {
    if (audioStarted) return;
    audioStarted = true;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const master = ac.createGain();
      master.gain.value = 0.12;
      master.connect(ac.destination);
      // jingle-bells-ish bell tones in a gentle loop
      const notes = [659, 659, 659, 0, 659, 659, 659, 0, 659, 784, 523, 587, 659, 0, 0, 0];
      const beatLen = 0.34;
      let step = 0;
      const bell = (freq, when) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        const o2 = ac.createOscillator();
        o2.type = 'triangle';
        o2.frequency.value = freq * 2.01;
        const g2 = ac.createGain();
        g2.gain.value = 0.25;
        g.gain.setValueAtTime(0.5, when);
        g.gain.exponentialRampToValueAtTime(0.001, when + beatLen * 2.4);
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
        o.start(when); o2.start(when);
        o.stop(when + beatLen * 2.5); o2.stop(when + beatLen * 2.5);
      };
      const schedule = () => {
        const now = ac.currentTime;
        for (let bar = 0; bar < 2; bar++) {
          notes.forEach((n, i) => {
            if (n) bell(n, now + (step % 16) * beatLen);
            step++;
          });
        }
      };
      schedule();
      setInterval(schedule, beatLen * 16 * 1000);
    } catch (e) { /* audio is optional */ }
  };
  document.getElementById('title-screen').addEventListener('pointerdown', startAudio, { once: true });

  return {
    stop() { alive = false; },
  };
}
