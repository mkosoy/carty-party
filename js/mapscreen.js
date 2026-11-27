// world map overlay — a painted winter map of the region, geographically
// accurate relative positions, pins jump into scenes, character picker.
const PLACES = [
  // id matches scene key; lng/lat real; emoji pin label
  { id: 'swap',     name: 'The Swap — Baltimore',        lng: -76.61, lat: 39.29, emoji: '🧥', sub: 'swap season, more taste less waste' },
  { id: 'house',    name: "Olivia's — Columbia",         lng: -76.86, lat: 39.20, emoji: '🏠', sub: 'two olivias. somehow.' },
  { id: 'runclub',  name: "Kylie's Run Club — Rockville",lng: -77.15, lat: 39.08, emoji: '🏃', sub: 'wootton track, marathon prep' },
  { id: 'airport',  name: 'Dulles Airport',              lng: -77.45, lat: 38.95, emoji: '✈️', sub: 'chapter 1 — where it all starts' },
  { id: 'shopping', name: 'Montgomery Mall — Bethesda',  lng: -77.10, lat: 38.98, emoji: '🛍️', sub: "kylie's last-minute run" },
  { id: 'dc',       name: 'National Mall — DC',          lng: -77.02, lat: 38.89, emoji: '⛸️', sub: 'the finale — tree, rink, monuments' },
  { id: 'echostage',name: 'Echostage — NE DC',           lng: -76.96, lat: 38.92, emoji: '🎧', sub: 'work a shift behind the stick' },
  { id: 'drive',    name: 'Yo Yogi — Gaithersburg',      lng: -77.20, lat: 39.14, emoji: '🍣', sub: 'rio — the timed drive home' },
  { id: 'dentist',  name: "Dr. Fritz's Office",          lng: -77.12, lat: 39.11, emoji: '🦷', sub: 'every tooth, sparkling' },
  { id: 'hopkins',  name: 'Johns Hopkins — Baltimore',   lng: -76.62, lat: 39.33, emoji: '🧪', sub: "stacy's environmental science lab" },
  { id: 'museum',   name: 'Air & Space — the Mall',      lng: -77.02, lat: 38.888, emoji: '🚀', sub: "mark's cathedral of flight" },
  { id: 'miami',    name: 'E11EVEN Miami ✈',             lng: -76.55, lat: 38.86, emoji: '🌴', sub: 'the reward — very much not local' },
];
const CAST = [
  { id: 'christian', name: 'Christian' },
  { id: 'olivia',    name: 'Olivia' },
  { id: 'stacy',     name: 'Stacy' },
  { id: 'kylie',     name: 'Kylie' },
  { id: 'mark',      name: 'Mark' },
];
const LNG0 = -77.52, LNG1 = -76.50, LAT0 = 38.84, LAT1 = 39.33;

export function initMapScreen() {
  const el = document.createElement('div');
  el.id = 'map-overlay';
  el.style.cssText = 'position:fixed;inset:0;z-index:90;display:none;background:rgba(4,6,12,.92);backdrop-filter:blur(6px);font-family:Arial,sans-serif';
  el.innerHTML = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:2vh 3vw">
      <div style="display:flex;align-items:baseline;gap:16px;margin-bottom:6px">
        <div style="color:#d4af69;font:bold 22px Georgia;letter-spacing:2px">THE MOCo HOLIDAY MAP</div>
        <div id="map-close" style="color:#fff;opacity:.75;cursor:pointer;font-size:14px;text-decoration:underline">close ✕</div>
      </div>
      <div id="map-cast" style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;justify-content:center"></div>
      <div style="position:relative;flex:1;width:100%;max-width:980px;min-height:0">
        <canvas id="map-canvas" style="width:100%;height:100%;border-radius:14px;box-shadow:0 10px 60px rgba(0,0,0,.6)"></canvas>
        <div id="map-pins" style="position:absolute;inset:0"></div>
      </div>
      <div style="color:#889;font-size:12px;margin-top:6px">tap a pin to travel — roads are real: I-270 · I-95 · I-495</div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#map-close').addEventListener('click', hide);

  // character picker
  const castRow = el.querySelector('#map-cast');
  let chosen = localStorage.getItem('cp-character') || 'christian';
  for (const c of CAST) {
    const chip = document.createElement('div');
    chip.style.cssText = 'cursor:pointer;padding:4px 12px;border-radius:20px;font-size:13px;color:#dde;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.06)';
    chip.innerHTML = `<img src="assets/portraits/${c.id}.png" style="width:20px;height:20px;border-radius:50%;vertical-align:-5px;margin-right:5px" onerror="this.style.display='none'">${c.name}`;
    chip.addEventListener('click', () => {
      chosen = c.id;
      localStorage.setItem('cp-character', c.id);
      paintChips();
    });
    chip.dataset.cid = c.id;
    castRow.appendChild(chip);
  }
  function paintChips() {
    castRow.querySelectorAll('[data-cid]').forEach((ch) => {
      ch.style.background = ch.dataset.cid === chosen ? 'rgba(212,175,105,.35)' : 'rgba(255,255,255,.06)';
      ch.style.borderColor = ch.dataset.cid === chosen ? '#d4af69' : 'rgba(255,255,255,.2)';
    });
  }
  paintChips();

  const cv = el.querySelector('#map-canvas');
  const pinsEl = el.querySelector('#map-pins');
  function xy(lng, lat, w, h) {
    return [((lng - LNG0) / (LNG1 - LNG0)) * w, ((LAT1 - lat) / (LAT1 - LAT0)) * h];
  }
  function draw() {
    const r = cv.getBoundingClientRect();
    cv.width = r.width * 2; cv.height = r.height * 2;
    const x = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    // winter night ground
    const grd = x.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#16203a');
    grd.addColorStop(0.55, '#101a2e');
    grd.addColorStop(1, '#0a1220');
    x.fillStyle = grd;
    x.fillRect(0, 0, W, H);
    // snow speckle
    x.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 500; i++) x.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    // potomac river — the western/southern border curve
    x.strokeStyle = 'rgba(90,140,200,0.55)';
    x.lineWidth = W * 0.012;
    x.lineCap = 'round';
    x.beginPath();
    let [px, py] = xy(-77.52, 39.18, W, H);
    x.moveTo(px, py);
    const riverPts = [[-77.45, 39.10], [-77.35, 39.02], [-77.30, 38.95], [-77.20, 38.90], [-77.10, 38.87], [-77.02, 38.855], [-76.95, 38.84]];
    for (const [lg, lt] of riverPts) { const [qx, qy] = xy(lg, lt, W, H); x.lineTo(qx, qy); }
    x.stroke();
    // highways as glowing ribbons
    function road(pts, color, width) {
      x.strokeStyle = color;
      x.lineWidth = width;
      x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath();
      const [sx, sy] = xy(pts[0][0], pts[0][1], W, H);
      x.moveTo(sx, sy);
      for (let i = 1; i < pts.length; i++) { const [qx, qy] = xy(pts[i][0], pts[i][1], W, H); x.lineTo(qx, qy); }
      x.stroke();
    }
    // I-270: bethesda → rockville → gaithersburg NW
    road([[-77.10, 38.98], [-77.13, 39.03], [-77.15, 39.08], [-77.18, 39.12], [-77.20, 39.14]], 'rgba(255,180,80,0.65)', W * 0.007);
    // I-95: dc → columbia → baltimore NE
    road([[-77.00, 38.90], [-76.90, 39.05], [-76.86, 39.20], [-76.72, 39.25], [-76.61, 39.29]], 'rgba(255,180,80,0.65)', W * 0.007);
    // I-495 beltway arc around dc
    road([[-77.20, 38.90], [-77.10, 38.98], [-76.98, 38.99], [-76.90, 38.94], [-76.89, 38.87]], 'rgba(255,140,60,0.45)', W * 0.005);
    // dulles access road east
    road([[-77.45, 38.95], [-77.30, 38.95], [-77.20, 38.97]], 'rgba(255,180,80,0.4)', W * 0.004);
    // county label
    x.fillStyle = 'rgba(255,255,255,0.28)';
    x.font = `italic ${Math.round(W * 0.022)}px Georgia`;
    x.textAlign = 'center';
    x.fillText('M O N T G O M E R Y   C O U N T Y', W * 0.5, H * 0.30);
    x.fillStyle = 'rgba(255,255,255,0.2)';
    x.fillText('baltimore ↗', W * 0.82, H * 0.06);
    x.fillText('washington dc ↘', W * 0.72, H * 0.96);
    // place dots under pins
    for (const p of PLACES) {
      const [dx, dy] = xy(p.lng, p.lat, W, H);
      x.fillStyle = 'rgba(212,175,105,0.9)';
      x.beginPath(); x.arc(dx, dy, W * 0.006, 0, 6.29); x.fill();
    }
    // pin elements
    pinsEl.innerHTML = '';
    for (const p of PLACES) {
      const [dx, dy] = xy(p.lng, p.lat, 100, 100);
      const pin = document.createElement('div');
      pin.style.cssText = `position:absolute;left:${dx}%;top:${dy}%;transform:translate(-50%,-100%);cursor:pointer;text-align:center;z-index:5;transition:transform .15s`;
      pin.innerHTML = `<div style="font-size:24px;filter:drop-shadow(0 2px 4px #000)">${p.emoji}</div><div style="font-size:10px;color:#ffe;background:rgba(0,0,0,.55);padding:1px 6px;border-radius:8px;white-space:nowrap;margin-top:1px">${p.name.split('—')[0]}</div>`;
      pin.addEventListener('mouseenter', () => pin.style.transform = 'translate(-50%,-100%) scale(1.2)');
      pin.addEventListener('mouseleave', () => pin.style.transform = 'translate(-50%,-100%)');
      pin.title = p.sub;
      pin.addEventListener('click', () => {
        hide();
        // travel card — feels like a journey, not a teleport
        const card = document.createElement('div');
        card.style.cssText = 'position:fixed;inset:0;z-index:95;background:#060810;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Georgia,serif;opacity:0;transition:opacity .45s';
        card.innerHTML = `<div style="font-size:44px;margin-bottom:12px">${p.emoji}</div><div style="color:#d4af69;font-size:22px;letter-spacing:1.5px">${p.name}</div><div style="color:#778;font-style:italic;font-size:14px;margin-top:6px">${p.sub}</div><div style="color:#556;font-size:12px;margin-top:18px;letter-spacing:2px">traveling…</div>`;
        document.body.appendChild(card);
        requestAnimationFrame(() => card.style.opacity = '1');
        setTimeout(() => {
          if (window.__startGame) window.__startGame(p.id);
          setTimeout(() => { card.style.opacity = '0'; setTimeout(() => card.remove(), 500); }, 700);
        }, 1100);
      });
      pinsEl.appendChild(pin);
    }
  }
  function show() {
    el.style.display = 'block';
    draw();
  }
  function hide() { el.style.display = 'none'; }
  window.addEventListener('resize', () => { if (el.style.display !== 'none') draw(); });
  // floating map button — always available
  const btn = document.createElement('div');
  btn.textContent = '🗺 map';
  btn.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:80;background:rgba(10,12,24,.8);color:#ffd;border:1px solid rgba(212,175,105,.5);border-radius:10px;padding:9px 14px;font:bold 14px Arial;cursor:pointer;backdrop-filter:blur(4px)';
  btn.addEventListener('click', show);
  document.body.appendChild(btn);
  return { show, hide };
}
