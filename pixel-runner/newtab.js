/* ===== Pixel Runner — Nova Guia ===== */

/* ---- estrelas ---- */
(function stars() {
  const box = document.getElementById("stars");
  let html = "";
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 100, y = Math.random() * 100;
    const d = (2 + Math.random() * 3).toFixed(1);
    html += `<i style="left:${x}%;top:${y}%;--tw:${d}s"></i>`;
  }
  box.innerHTML = html;
})();

/* ================= ENGINE DO ROBÔ ================= */
const Robot = (function () {
  const canvas = document.getElementById("scene");
  const g = canvas.getContext("2d");

  const C = {
    steel: "#8fb8dc", steelD: "#4d7ba3", dark: "#16283c",
    cyan: "#66e6ff", white: "#eaf6ff",
  };

  let dpr = 1, cssW = 0, cssH = 0, S = 4, groundY = 0, runX = 0, portalX = 0;

  function resize() {
    const r = canvas.getBoundingClientRect();
    cssW = r.width || 640; cssH = r.height || 130;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    S = Math.max(3, Math.round(cssH / 30));
    groundY = cssH - 2;
    runX = cssW * 0.24;
    portalX = cssW * 0.08;
  }

  /* ---- helpers de desenho pixel ---- */
  function blk(x, fy, px, py, pw, ph, c) {
    g.fillStyle = c;
    g.fillRect(Math.round(x + px * S), Math.round(fy - (py + ph) * S),
               Math.ceil(pw * S), Math.ceil(ph * S));
  }
  function glow(x, fy, px, py, pw, ph, c) {
    g.save(); g.shadowColor = c; g.shadowBlur = S * 2.4;
    blk(x, fy, px, py, pw, ph, c); g.restore();
  }

  /* ---- robô correndo ---- */
  function robotRun(x, yUp, t) {
    const fy = groundY - yUp;
    const sw = Math.sin(t * 14);
    blk(x, fy, -2.4, 0, 1.7, 4.2 + sw * 0.6, C.steelD);   // perna esq
    blk(x, fy, 0.7, 0, 1.7, 4.2 - sw * 0.6, C.steelD);    // perna dir
    blk(x, fy, -2.7, 0, 2.1, 1, C.dark);
    blk(x, fy, 0.6, 0, 2.1, 1, C.dark);
    body(x, fy, sw, t);
  }
  /* ---- robô pulando ---- */
  function robotJump(x, yUp, t) {
    const fy = groundY - yUp;
    blk(x, fy, -2.3, 1.6, 1.8, 3, C.steelD);              // pernas dobradas
    blk(x, fy, 0.6, 1.6, 1.8, 3, C.steelD);
    body(x, fy, 0.8, t, true);
  }
  /* ---- tronco/cabeça (comum) ---- */
  function body(x, fy, sw, t, jumping) {
    blk(x, fy, -3, 4, 6, 5, C.steel);                     // tronco
    blk(x, fy, -3, 4, 6, 1, C.steelD);
    glow(x, fy, -0.9, 5.6, 1.8, 1.8, C.cyan);             // peito
    if (jumping) {
      blk(x, fy, -4.1, 6, 1.5, 3.2, C.steelD);            // braços erguidos
      blk(x, fy, 2.9, 6, 1.5, 3.2, C.steel);
    } else {
      blk(x, fy, -4, 5, 1.4, 3.2 + sw * 0.4, C.steelD);
      blk(x, fy, 2.8, 5, 1.5, 3.2 - sw * 0.4, C.steel);
    }
    blk(x, fy, -3.4, 9, 6.8, 4.8, C.steel);               // cabeça
    blk(x, fy, -3.4, 12.6, 6.8, 1.2, C.steelD);
    blk(x, fy, -2.6, 10.2, 5.2, 2, C.dark);               // visor
    glow(x, fy, 0.4, 10.4, 1.6, 1.6, C.cyan);             // olho
    blk(x, fy, -0.3, 13.8, 0.7, 1.8, C.steelD);           // antena
    glow(x, fy, -0.9, 15.4, 1.7, 1.7, C.cyan);            // luz da antena
  }
  /* ---- portal ---- */
  function drawPortal(cx, t, alpha) {
    g.save(); g.globalAlpha = alpha;
    const h = 15 * S, w = 6 * S, cy = groundY - h / 2;
    g.fillStyle = "rgba(60,169,214,.16)";
    g.beginPath(); g.ellipse(cx, cy, w / 2, h / 2, 0, 0, 7); g.fill();
    g.lineWidth = Math.max(1, S * 0.5);
    for (let i = 0; i < 3; i++) {
      const rr = 1 - i * 0.16 + Math.sin(t * 6 + i) * 0.05;
      g.strokeStyle = i % 2 ? "rgba(102,230,255,.95)" : "rgba(130,180,255,.7)";
      g.beginPath(); g.ellipse(cx, cy, (w / 2) * rr, (h / 2) * rr, 0, 0, 7); g.stroke();
    }
    g.restore();
  }

  /* ---- cubos e obstáculos ---- */
  function drawCube(cx, cy, phase) {
    g.save(); g.translate(cx, cy); g.rotate(phase);
    const s = 1.9 * S;
    g.shadowColor = C.cyan; g.shadowBlur = S * 3;
    g.fillStyle = "rgba(102,230,255,.92)"; g.fillRect(-s / 2, -s / 2, s, s);
    g.fillStyle = "rgba(190,246,255,.95)"; g.fillRect(-s / 2, -s / 2, s, s / 3);
    g.restore();
  }
  function drawObstacle(cx, h) {
    g.fillStyle = "#294056"; g.fillRect(Math.round(cx - 1.6 * S), Math.round(groundY - h), Math.round(3.2 * S), Math.round(h));
    g.fillStyle = C.cyan; g.fillRect(Math.round(cx - 1.6 * S), Math.round(groundY - h), Math.round(3.2 * S), Math.max(1, Math.round(S * 0.6)));
  }

  /* ================= ESTADO ================= */
  let state = "portal", t = 0, introT = 0;
  const bot = { y: 0, vy: 0, ground: true, x: 0 };
  let obstacles = [], cubes = [], parts = [], digital = [];
  let obTimer = 1.4, cbTimer = 1.0, score = 0, last = 0;

  const G = 2000, VJUMP = 640, WSPEED = 155, JUMP_TRIG = 54;

  function spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 90;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        life: 0, max: 0.5 + Math.random() * 0.4, color });
    }
  }
  const GLYPHS = "01{}</>*".split("");
  function spawnDigital(x, y, n) {
    for (let i = 0; i < n; i++)
      digital.push({ x: x + (Math.random() - 0.5) * 40, y,
        vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 50,
        life: 0, max: 0.9 + Math.random() * 0.6,
        ch: GLYPHS[(Math.random() * GLYPHS.length) | 0] });
  }

  function update(dt) {
    t += dt;

    if (state === "portal") {
      introT += dt;
      const k = Math.max(0, Math.min(1, (introT - 0.3) / 0.7));
      bot.x = portalX + 12 + (runX - portalX - 12) * k;
      if (introT > 1.35) { state = "run"; bot.x = runX; }
    } else { // run / jump
      bot.x = runX;

      // mundo rola
      const dx = WSPEED * dt;
      obstacles.forEach(o => o.x -= dx);
      cubes.forEach(c => { c.x -= dx; c.ph += dt * 3; });
      obstacles = obstacles.filter(o => o.x > -30);
      cubes = cubes.filter(c => c.x > -30 && !c.got);

      // spawn
      obTimer -= dt; cbTimer -= dt;
      if (obTimer <= 0) { obstacles.push({ x: cssW + 20, h: (11 + Math.random() * 8) }); obTimer = 2.4 + Math.random() * 2.2; }
      if (cbTimer <= 0) { cubes.push({ x: cssW + 20, y: 26 + Math.random() * 74, ph: 0 }); cbTimer = 1.8 + Math.random() * 1.8; }

      // pulo automático
      if (bot.ground) {
        for (const o of obstacles) {
          const gap = o.x - bot.x;
          if (gap > -6 && gap < JUMP_TRIG) { bot.vy = VJUMP; bot.ground = false; state = "jump"; break; }
        }
      }
      // física
      bot.vy -= G * dt; bot.y += bot.vy * dt;
      if (bot.y <= 0) { bot.y = 0; bot.vy = 0; bot.ground = true; if (state === "jump") state = "run"; }

      // coleta de cubos (alcance do corpo)
      for (const c of cubes) {
        if (c.got) continue;
        const cy = c.y;
        if (Math.abs(c.x - bot.x) < 16 && cy >= bot.y + 6 && cy <= bot.y + 60) {
          c.got = true; score++;
          spawnBurst(c.x, groundY - cy, "rgba(102,230,255,1)", 12);
        }
      }
    }

    // partículas
    for (const p of parts) { p.life += dt; p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter(p => p.life < p.max);
    for (const d of digital) { d.life += dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 24 * dt; }
    digital = digital.filter(d => d.life < d.max);
  }

  function draw() {
    g.clearRect(0, 0, cssW, cssH);

    // brilho da plataforma (linha do chão)
    g.save(); g.shadowColor = C.cyan; g.shadowBlur = 10;
    g.fillStyle = "rgba(102,230,255,.5)";
    g.fillRect(0, groundY - 1, cssW, 2); g.restore();

    // contador de cubos
    if (score > 0) {
      g.fillStyle = "rgba(102,230,255,.85)";
      g.font = `${Math.round(S * 3)}px "Consolas", monospace`;
      g.fillText("◈ " + score, 8, S * 4);
    }

    // obstáculos e cubos
    obstacles.forEach(o => drawObstacle(o.x, o.h));
    cubes.forEach(c => { if (!c.got) drawCube(c.x, groundY - c.y, c.ph); });

    // portal + robô
    if (state === "portal") {
      const a = introT < 0.3 ? introT / 0.3 : (introT > 1.0 ? Math.max(0, 1 - (introT - 1.0) / 0.35) : 1);
      drawPortal(portalX, t, a);
      g.save(); g.globalAlpha = Math.min(1, Math.max(0, (introT - 0.3) / 0.5));
      robotRun(bot.x, 0, t); g.restore();
    } else if (state === "jump") {
      robotJump(bot.x, bot.y, t);
    } else {
      robotRun(bot.x, bot.y, t);
    }

    // partículas
    for (const p of parts) {
      const al = 1 - p.life / p.max;
      g.fillStyle = p.color.replace(/[\d.]+\)$/, al.toFixed(2) + ")");
      const s = Math.max(1, S * 0.7);
      g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
    for (const d of digital) {
      const al = 1 - d.life / d.max;
      g.fillStyle = `rgba(102,230,255,${al.toFixed(2)})`;
      g.font = `${Math.round(S * 2.4)}px "Consolas", monospace`;
      g.fillText(d.ch, d.x, d.y);
    }
  }

  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000; last = ts;
    if (dt > 0.05) dt = 0.05;           // clamp (aba volta do background)
    update(dt); draw();
    requestAnimationFrame(loop);
  }

  return {
    init() {
      resize();
      window.addEventListener("resize", resize);
      requestAnimationFrame(loop);
    },
    // partículas digitais ao pesquisar
    searchPulse(big) {
      const y = groundY - 2;
      spawnDigital(cssW * (0.3 + Math.random() * 0.4), y, big ? 10 : 3);
    },
  };
})();
window.addEventListener("load", () => Robot.init());

/* ---- busca ---- */
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
input.addEventListener("input", () => Robot.searchPulse(false));
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  Robot.searchPulse(true);
  const looksLikeUrl = /^(https?:\/\/)/i.test(q) ||
    (/^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(q) && !q.includes(" "));
  const go = looksLikeUrl
    ? (q.startsWith("http") ? q : "https://" + q)
    : "https://www.google.com/search?q=" + encodeURIComponent(q);
  setTimeout(() => { window.location.href = go; }, 90);
});

/* ---- atalhos (editáveis, salvos no localStorage) ---- */
const DEFAULTS = [
  { name: "GitHub",  url: "https://github.com" },
  { name: "Gmail",   url: "https://mail.google.com" },
  { name: "Drive",   url: "https://drive.google.com" },
  { name: "Notion",  url: "https://notion.so" },
  { name: "YouTube", url: "https://youtube.com" },
];
const KEY = "pixelrunner.shortcuts";

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (Array.isArray(s)) return s; } catch (_) {}
  return DEFAULTS.slice();
}
function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
function host(url) { try { return new URL(url).hostname; } catch (_) { return url; } }
function iconFor(url) { return `https://icons.duckduckgo.com/ip3/${host(url)}.ico`; }
function fallbackIcon(url) { return `https://www.google.com/s2/favicons?domain=${host(url)}&sz=64`; }

function render() {
  const wrap = document.getElementById("shortcuts");
  const list = load();
  wrap.innerHTML = "";
  list.forEach((s, idx) => {
    const a = document.createElement("a");
    a.className = "shortcut";
    a.href = s.url;
    a.innerHTML = `
      <div class="tile"><img alt="" src="${iconFor(s.url)}"
        onerror="this.onerror=null;this.src='${fallbackIcon(s.url)}'"></div>
      <span class="label">${s.name}</span>
      <button class="remove" title="Remover" data-i="${idx}">&times;</button>`;
    a.querySelector(".remove").addEventListener("click", (e) => {
      e.preventDefault(); const l = load(); l.splice(idx, 1); save(l); render();
    });
    wrap.appendChild(a);
  });
  const add = document.createElement("div");
  add.className = "shortcut";
  add.innerHTML = `<div class="tile add">+</div><span class="label">Adicionar atalho</span>`;
  add.addEventListener("click", () => {
    const name = prompt("Nome do atalho:");
    if (!name) return;
    let url = prompt("URL (ex: https://exemplo.com):");
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    const l = load(); l.push({ name: name.trim(), url: url.trim() }); save(l); render();
  });
  wrap.appendChild(add);
}
render();

/* ---- links topo ---- */
document.getElementById("appsBtn").addEventListener("click",
  () => window.location.href = "https://about.google/products/");
document.querySelector(".avatar").addEventListener("click",
  () => window.location.href = "https://myaccount.google.com");
