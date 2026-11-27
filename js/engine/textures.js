import * as THREE from 'three';

// Canvas-generated procedural textures — wood, brick, concrete, carpet,
// asphalt. Cheap, no assets, huge realism win over flat colors.
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function noise(ctx, w, h, alpha, tones = [0, 40]) {
  for (let i = 0; i < w * h * 0.02; i++) {
    const v = tones[0] + Math.random() * (tones[1] - tones[0]);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}

export function woodFloor(base = '#8a6a42', rx = 4, ry = 4) {
  const [c, x] = canvas(256, 256);
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  // planks
  for (let row = 0; row < 8; row++) {
    const y0 = row * 32;
    const offset = (row % 2) * 64;
    for (let px = -1; px < 3; px++) {
      const x0 = px * 128 + offset;
      const shade = 0.9 + Math.random() * 0.2;
      x.fillStyle = `rgba(${140 * shade | 0},${100 * shade | 0},${60 * shade | 0},0.5)`;
      x.fillRect(x0, y0, 126, 30);
      // grain lines
      x.strokeStyle = 'rgba(60,40,20,0.25)';
      x.lineWidth = 1;
      for (let gLine = 0; gLine < 4; gLine++) {
        x.beginPath();
        const gy = y0 + 4 + gLine * 7 + Math.random() * 3;
        x.moveTo(x0, gy);
        x.bezierCurveTo(x0 + 40, gy + 2, x0 + 80, gy - 2, x0 + 126, gy);
        x.stroke();
      }
    }
    x.fillStyle = 'rgba(40,26,14,0.8)';
    x.fillRect(0, y0 + 30, 256, 2);
  }
  noise(x, 256, 256, 0.05);
  return tex(c, rx, ry);
}

export function brickWall(base = '#7a4436', rx = 3, ry = 2) {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#5e4a40';
  x.fillRect(0, 0, 256, 256);
  const bh = 21, bw = 64;
  for (let row = 0; row < 12; row++) {
    const y0 = row * bh;
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col < 5; col++) {
      const x0 = col * bw + offset;
      const v = 0.85 + Math.random() * 0.3;
      const r = 122 * v | 0, g = 68 * v | 0, b = 54 * v | 0;
      x.fillStyle = `rgb(${r},${g},${b})`;
      x.fillRect(x0 + 2, y0 + 2, bw - 4, bh - 4);
      if (Math.random() < 0.12) {
        x.fillStyle = 'rgba(0,0,0,0.15)';
        x.fillRect(x0 + 2, y0 + 2, bw - 4, bh - 4);
      }
    }
  }
  noise(x, 256, 256, 0.06);
  return tex(c, rx, ry);
}

export function concrete(base = '#9a9a98', rx = 4, ry = 4) {
  const [c, x] = canvas(256, 256);
  x.fillStyle = base;
  x.fillRect(0, 0, 256, 256);
  noise(x, 256, 256, 0.09, [20, 90]);
  noise(x, 256, 256, 0.05, [140, 200]);
  return tex(c, rx, ry);
}

export function carpet(base = '#6a5a48', rx = 4, ry = 4) {
  const [c, x] = canvas(128, 128);
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  noise(x, 128, 128, 0.18, [10, 60]);
  return tex(c, rx, ry);
}

export function asphalt(rx = 2, ry = 20) {
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#2e2e32';
  x.fillRect(0, 0, 128, 128);
  noise(x, 128, 128, 0.14, [10, 80]);
  return tex(c, rx, ry);
}


export function paintedWall(base = '#3e7a7a', rx = 2, ry = 1) {
  const [c, x] = canvas(128, 128);
  x.fillStyle = base;
  x.fillRect(0, 0, 128, 128);
  noise(x, 128, 128, 0.1, [8, 40]);
  // faint vertical roller streaks like real painted drywall
  for (let i = 0; i < 10; i++) {
    x.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.025})`;
    const sx = Math.random() * 128;
    x.fillRect(sx, 0, 3 + Math.random() * 6, 128);
  }
  for (let i = 0; i < 6; i++) {
    x.fillStyle = `rgba(0,0,0,${0.02 + Math.random() * 0.02})`;
    const sx = Math.random() * 128;
    x.fillRect(sx, 0, 2 + Math.random() * 5, 128);
  }
  return tex(c, rx, ry);
}

// procedural human face for NPCs: skin base with soft shaded eyes, brows,
// nose shadow, mouth. gender/age variation via params.
export function npcFace({ skin = '#e8c098', eyeColor = '#3a2a1a', mouthCurve = 0.4, female = false } = {}) {
  const [c, x] = canvas(256, 256);
  x.fillStyle = skin;
  x.fillRect(0, 0, 256, 256);
  // soft shading
  const grad = x.createRadialGradient(128, 110, 40, 128, 128, 150);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(0,0,0,0.14)');
  x.fillStyle = grad;
  x.fillRect(0, 0, 256, 256);
  // eyes
  for (const ex of [88, 168]) {
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.beginPath(); x.ellipse(ex, 108, 19, 13, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = eyeColor;
    x.beginPath(); x.arc(ex, 109, 8.5, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#111';
    x.beginPath(); x.arc(ex, 109, 4.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)';
    x.beginPath(); x.arc(ex - 2.5, 106, 2.2, 0, Math.PI * 2); x.fill();
    // upper eyelid line + lashes — the detail that makes eyes read as eyes
    x.strokeStyle = 'rgba(30,20,12,0.55)';
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(ex - 17, 104);
    x.quadraticCurveTo(ex, 98, ex + 17, 104);
    x.stroke();
    if (female) {
      x.lineWidth = 1.6;
      for (let li = 0; li < 4; li++) {
        x.beginPath();
        x.moveTo(ex + 8 + li * 3.5, 100 - li * 0.5);
        x.lineTo(ex + 10 + li * 3.8, 96 - li * 0.8);
        x.stroke();
      }
    }
    // brows
    x.strokeStyle = 'rgba(40,25,15,0.75)';
    x.lineWidth = female ? 3 : 5;
    x.beginPath();
    x.moveTo(ex - 14, 90);
    x.quadraticCurveTo(ex, female ? 82 : 86, ex + 14, 90);
    x.stroke();
  }
  // nose: bridge highlight, side shading, nostrils — reads as a nose at any distance
  x.fillStyle = 'rgba(0,0,0,0.07)';
  x.beginPath(); x.ellipse(120, 132, 4, 14, -0.15, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(136, 132, 4, 14, 0.15, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.22)';
  x.beginPath(); x.ellipse(128, 128, 3.5, 11, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(0,0,0,0.16)';
  x.beginPath(); x.ellipse(123, 143, 2.6, 1.8, 0.3, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.ellipse(133, 143, 2.6, 1.8, -0.3, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(0,0,0,0.08)';
  x.beginPath(); x.ellipse(128, 147, 8, 3, 0, 0, Math.PI * 2); x.fill();
  // mouth: filled lips with a center shadow line and corner creases
  const lip = female ? 'rgba(170,70,85,0.85)' : 'rgba(150,85,70,0.55)';
  x.fillStyle = lip;
  x.beginPath();
  x.moveTo(107, 168);
  x.quadraticCurveTo(128, 164 + 10 * mouthCurve, 149, 168);
  x.quadraticCurveTo(128, 178 + 10 * mouthCurve, 107, 168);
  x.fill();
  x.strokeStyle = 'rgba(60,20,20,0.55)';
  x.lineWidth = 2.2;
  x.beginPath();
  x.moveTo(107, 168);
  x.quadraticCurveTo(128, 171 + 9 * mouthCurve, 149, 168);
  x.stroke();
  // smile corner creases
  x.strokeStyle = 'rgba(0,0,0,0.10)';
  x.lineWidth = 2;
  x.beginPath(); x.moveTo(103, 164); x.quadraticCurveTo(106, 166, 107, 168); x.stroke();
  x.beginPath(); x.moveTo(153, 164); x.quadraticCurveTo(150, 166, 149, 168); x.stroke();
  // chin + jaw soft shading
  x.fillStyle = 'rgba(0,0,0,0.06)';
  x.beginPath(); x.ellipse(128, 190, 16, 8, 0, 0, Math.PI * 2); x.fill();
  // cheek blush for female
  if (female) {
    x.fillStyle = 'rgba(220,110,110,0.12)';
    x.beginPath(); x.ellipse(84, 140, 14, 9, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(172, 140, 14, 9, 0, 0, Math.PI * 2); x.fill();
  }
  // elliptical alpha fade so the face blends into the head sphere
  const alpha = x.createRadialGradient(128, 128, 70, 128, 128, 128);
  alpha.addColorStop(0, 'rgba(0,0,0,0)');
  alpha.addColorStop(0.75, 'rgba(0,0,0,0)');
  alpha.addColorStop(1, 'rgba(0,0,0,1)');
  x.globalCompositeOperation = 'destination-out';
  x.fillStyle = alpha;
  x.fillRect(0, 0, 256, 256);
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Neutral grayscale weave — multiplies over any material color for cloth feel.
export function fabricWeave(rx = 2, ry = 2) {
  const [c, x] = canvas(128, 128);
  x.fillStyle = '#c8c8c8';
  x.fillRect(0, 0, 128, 128);
  // weave threads
  for (let i = 0; i < 128; i += 2) {
    x.fillStyle = i % 4 === 0 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    x.fillRect(i, 0, 1, 128);
    x.fillRect(0, i, 128, 1);
  }
  noise(x, 128, 128, 0.06, [0, 255]);
  return tex(c, rx, ry);
}

// Subtle skin-ish noise for skin materials (very light).
export function skinNoise(rx = 1, ry = 1) {
  const [c, x] = canvas(64, 64);
  x.fillStyle = '#d8d8d8';
  x.fillRect(0, 0, 64, 64);
  noise(x, 64, 64, 0.05, [150, 255]);
  return tex(c, rx, ry);
}
