// The DJ booth minigame — a 16-step sequencer with drum/synth pads,
// unlockable sound banks (vinyl records collected in the world open more
// sounds), and the all-important "publish to SoundCloud" button. All
// synthesized with WebAudio — no assets.
export function runDJMinigame(records = 0) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:60;background:linear-gradient(160deg,#12081e 0%,#1e0a2e 55%,#0a1226 100%);display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:Georgia,serif;';
    overlay.innerHTML = `
      <div style="color:#ffe9b8;font-size:26px;text-shadow:0 0 18px #c050ff;margin-bottom:2px">the swap DJ booth</div>
      <div style="color:#b090d0;font-size:14px;font-style:italic;margin-bottom:4px">a crowd-pleaser is already loaded — just hit <b style="color:#ffe9b8">▶ play loop</b></div><div style="color:#b090d0;font-size:13px;font-style:italic;margin-bottom:14px">or make it yours: tap grid cells to add/remove sounds, tap pads to preview</div>
      <div id="dj-pads" style="display:grid;grid-template-columns:repeat(8,1fr);gap:7px;margin-bottom:14px"></div>
      <div id="dj-grid" style="display:grid;grid-template-columns:repeat(16,1fr);gap:4px;margin-bottom:14px"></div>
      <div style="display:flex;gap:12px;align-items:center">
        <button id="dj-play" style="background:#c050ff;border:none;color:#fff;font-size:18px;padding:10px 26px;border-radius:24px;cursor:pointer;font-family:Georgia,serif">▶ play loop</button>
        <button id="dj-clear" style="background:#3a2a50;border:none;color:#c0a0e0;font-size:14px;padding:8px 18px;border-radius:20px;cursor:pointer;font-family:Georgia,serif">clear</button>
        <button id="dj-perform" style="background:#e0308a;border:none;color:#fff;font-size:15px;padding:10px 20px;border-radius:24px;cursor:pointer;font-family:Georgia,serif">perform for the crowd</button>
        <button id="dj-publish" style="background:#ff7720;border:none;color:#fff;font-size:15px;padding:10px 20px;border-radius:24px;cursor:pointer;font-family:Georgia,serif">publish to soundcloud</button>
      </div>
      <div id="dj-status" style="color:#90e0c0;font-size:14px;margin-top:12px;height:22px;font-style:italic"></div>
      <div id="dj-banks" style="color:#b090d0;font-size:13px;margin-top:4px"></div>
      <button id="dj-exit" style="position:absolute;top:14px;left:14px;background:rgba(224,48,138,.85);border:none;color:#fff;font-size:17px;font-weight:bold;padding:10px 20px;border-radius:22px;cursor:pointer;font-family:Georgia,serif;z-index:5">✕ close the booth</button>
    `;
    document.body.appendChild(overlay);

    // ---- audio engine ----
    const AC = new (window.AudioContext || window.webkitAudioContext)();
    const master = AC.createGain();
    master.gain.value = 0.5;
    master.connect(AC.destination);
    function kick(t) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + 0.26);
    }
    function noiseBurst(t, dur, hp, vol) {
      const len = AC.sampleRate * dur;
      const buf = AC.createBuffer(1, len, AC.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = AC.createBufferSource();
      src.buffer = buf;
      const f = AC.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      const g = AC.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      src.connect(f).connect(g).connect(master);
      src.start(t);
    }
    function tone(t, freq, dur, type = 'square', vol = 0.3, slide = 0) {
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    // sound bank: base 8 + unlockable extras
    const baseSounds = [
      { name: 'kick', emoji: '🥁', color: '#e04040', fn: (t) => kick(t) },
      { name: 'snare', emoji: '💥', color: '#e0a040', fn: (t) => { noiseBurst(t, 0.14, 1800, 0.5); tone(t, 190, 0.09, 'triangle', 0.25); } },
      { name: 'hihat', emoji: '✨', color: '#e0e040', fn: (t) => noiseBurst(t, 0.05, 7000, 0.3) },
      { name: 'clap', emoji: '👏', color: '#40e040', fn: (t) => { noiseBurst(t, 0.08, 1200, 0.4); noiseBurst(t + 0.02, 0.08, 1200, 0.3); } },
      { name: 'bass', emoji: '🎸', color: '#40c0e0', fn: (t) => tone(t, 65, 0.3, 'sawtooth', 0.4) },
      { name: 'synth', emoji: '🎹', color: '#4080ff', fn: (t) => tone(t, 330, 0.22, 'square', 0.22) },
      { name: 'lead', emoji: '🎵', color: '#a060ff', fn: (t) => tone(t, 520, 0.28, 'sawtooth', 0.2, 80) },
      { name: 'fx', emoji: '🌀', color: '#ff60c0', fn: (t) => tone(t, 220, 0.5, 'sine', 0.3, 400) },
    ];
    const unlockSounds = [
      { name: 'vinyl scratch', emoji: '💿', color: '#9090a0', need: 1, fn: (t) => { for (let i = 0; i < 5; i++) noiseBurst(t + i * 0.03, 0.025, 2500, 0.35); } },
      { name: 'deep 808', emoji: '🛢', color: '#802020', need: 2, fn: (t) => tone(t, 48, 0.5, 'sine', 0.55, -12) },
      { name: 'moCo horn', emoji: '📯', color: '#c08020', need: 3, fn: (t) => { tone(t, 233, 0.3, 'sawtooth', 0.3); tone(t, 293, 0.3, 'sawtooth', 0.2); } },
      { name: 'jingle', emoji: '🔔', color: '#c0c040', need: 4, fn: (t) => { tone(t, 1200, 0.4, 'sine', 0.25); tone(t, 1800, 0.3, 'sine', 0.15); } },
    ];
    const unlocked = baseSounds.concat(unlockSounds.filter((u) => records >= u.need));

    // ---- pads row ----
    const padsEl = overlay.querySelector('#dj-pads');
    const padButtons = [];
    unlocked.forEach((s, i) => {
      const b = document.createElement('button');
      b.style.cssText = `background:${s.color};border:none;border-radius:10px;width:64px;height:56px;font-size:22px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,.4)`;
      b.innerHTML = `${s.emoji}<span style="font-size:9px;color:rgba(255,255,255,.85)">${s.name}</span>`;
      b.addEventListener('click', () => {
        if (AC.state === 'suspended') AC.resume();
        s.fn(AC.currentTime);
        flashRow(i);
      });
      padsEl.appendChild(b);
      padButtons.push(b);
    });
    overlay.querySelector('#dj-banks').textContent =
      records > 0 ? `💿 ${records} vinyl record${s2n(records)} collected — ${unlocked.length - baseSounds.length} bonus sound${s2n(unlocked.length - baseSounds.length)} unlocked` : 'find vinyl records in the world to unlock bonus sounds';
    function s2n(n) { return n === 1 ? '' : 's'; }

    // ---- sequencer grid: rows = sounds, cols = 16 steps ----
    const gridEl = overlay.querySelector('#dj-grid');
    gridEl.style.gridTemplateColumns = 'repeat(16, 1fr)';
    const ROWS = unlocked.length;
    const cells = [];
    const state = [];
    for (let r = 0; r < ROWS; r++) {
      state.push(new Array(16).fill(false));
    }
    // default pattern so the first play sounds decent
    if (ROWS >= 5) {
      state[0][0] = state[0][4] = state[0][8] = state[0][12] = true;        // kick four-on-floor
      state[1][4] = state[1][12] = true;                                     // snare
      for (let i = 0; i < 16; i += 2) state[2][i] = true;                    // hats
      state[4][0] = state[4][3] = state[4][6] = state[4][10] = state[4][14] = true; // bass
    }
    const cellEls = [];
    // reorder DOM: column-major layout looks like a timeline left-to-right per row — simpler: render row blocks
    gridEl.style.display = 'flex';
    gridEl.style.flexDirection = 'column';
    gridEl.style.gap = '4px';
    for (let r = 0; r < ROWS; r++) {
      const rowEl = document.createElement('div');
      rowEl.style.cssText = 'display:grid;grid-template-columns:repeat(16,1fr);gap:4px;width:min(92vw,640px)';
      const rowCells = [];
      for (let cix = 0; cix < 16; cix++) {
        const cell = document.createElement('div');
        cell.style.cssText = `height:26px;border-radius:5px;background:${state[r][cix] ? unlocked[r].color : 'rgba(255,255,255,0.08)'};cursor:pointer;transition:background .1s;border:1px solid rgba(255,255,255,0.06)`;
        cell.dataset.r = r; cell.dataset.c = cix;
        cell.addEventListener('click', () => {
          state[r][cix] = !state[r][cix];
          cell.style.background = state[r][cix] ? unlocked[r].color : 'rgba(255,255,255,0.08)';
        });
        rowEl.appendChild(cell);
        rowCells.push(cell);
      }
      gridEl.appendChild(rowEl);
      cellEls.push(rowCells);
    }

    // ---- playback ----
    let playing = false;
    let step = 0;
    let timer = null;
    const BPM = 118;
    const stepDur = 60 / BPM / 4;
    const playBtn = overlay.querySelector('#dj-play');
    const status = overlay.querySelector('#dj-status');
    function flashRow(r) {
      const b = padButtons[r];
      if (!b) return;
      b.style.transform = 'scale(0.9)';
      setTimeout(() => { b.style.transform = ''; }, 90);
    }
    function tick() {
      const t0 = AC.currentTime;
      for (let r = 0; r < ROWS; r++) {
        if (state[r][step]) {
          unlocked[r].fn(t0);
          flashRow(r);
        }
      }
      // highlight column
      for (let r = 0; r < ROWS; r++) {
        for (let cix = 0; cix < 16; cix++) {
          cellEls[r][cix].style.outline = cix === step ? '2px solid rgba(255,255,255,.85)' : 'none';
        }
      }
      step = (step + 1) % 16;
    }
    playBtn.addEventListener('click', () => {
      if (AC.state === 'suspended') AC.resume();
      if (playing) {
        clearInterval(timer);
        playing = false;
        playBtn.textContent = '▶ play loop';
        for (const row of cellEls) for (const c of row) c.style.outline = 'none';
      } else {
        playing = true;
        playBtn.textContent = '⏸ stop';
        step = 0;
        tick();
        timer = setInterval(tick, stepDur * 1000);
        if (window.__djLoop) window.__djLoop.timer = timer;
      }
    });
    overlay.querySelector('#dj-clear').addEventListener('click', () => {
      for (let r = 0; r < ROWS; r++) for (let cix = 0; cix < 16; cix++) {
        state[r][cix] = false;
        cellEls[r][cix].style.background = 'rgba(255,255,255,0.08)';
      }
    });

    // ---- publish to soundcloud gag ----
    overlay.querySelector('#dj-publish').addEventListener('click', async () => {
      const notes = state.flat().filter(Boolean).length;
      if (notes < 4) {
        status.textContent = 'soundcloud rejected it — write at least a few notes first, bronco.';
        return;
      }
      status.textContent = 'uploading to soundcloud…';
      await new Promise((r) => setTimeout(r, 1600));
      status.textContent = '☁ published! "christian-from-the-swap — untitled loop #1" · 0 plays · 1 like (stacy)';
      if (!window.__inventory) window.__inventory = { cameras: 0, records: 0, items: [] };
      window.__inventory.published = true;
    });

    let performing = false;
    overlay.querySelector('#dj-perform').addEventListener('click', () => {
      const notes = state.flat().filter(Boolean).length;
      if (notes < 4) {
        status.textContent = 'the crowd deserves better than silence — write a few notes or use the loaded set.';
        return;
      }
      if (!playing) playBtn.click();
      performing = true;
      window.__djLoop = { timer, AC };
      master.gain.value = 0.16;
      status.textContent = '🎤 performing! the floor is yours — close the booth and walk away whenever, the music keeps spinning.';
      setTimeout(() => {
        overlay.remove();
        resolve({ published: !!window.__inventory?.published, perform: true });
      }, 1400);
    });
    overlay.querySelector('#dj-exit').addEventListener('click', () => {
      if (!performing) {
        if (timer) clearInterval(timer);
        AC.close().catch(() => {});
        window.__djLoop = null;
      } else if (window.__djLoop) {
        window.__djLoop.timer = timer;
        window.__djLoop.AC = AC;
      }
      // when performing the loop keeps playing after you leave the decks —
      // the audio context and timer stay alive on purpose
      overlay.remove();
      resolve({ published: !!window.__inventory?.published, perform: performing });
    });
  });
}
