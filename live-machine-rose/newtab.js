/* ===== Live Machine Rosa — Nova Guia (rede de dados) ===== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- HUD ---- */
const HUD = (function () {
  const spin = document.getElementById("spin");
  const msg = document.getElementById("hudmsg");
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  const logs = [
    ["indexing shards", ""], ["cache warm 98.4%", "ok"], ["gc pause 0.4ms", ""],
    ["replicas in sync", "ok"], ["prefetch queue 12", ""], ["rebalancing region", ""],
    ["p99 latency 22ms", ""], ["heartbeat ok", "ok"], ["compacting segments", ""],
    ["throughput nominal", "ok"],
  ];
  let fi = 0, li = 0, busyUntil = 0;
  setInterval(() => { spin.textContent = frames[fi = (fi + 1) % frames.length]; }, 90);
  setInterval(() => {
    if (performance.now() < busyUntil) return;
    const [t, cls] = logs[li = (li + 1) % logs.length];
    msg.textContent = t; msg.className = cls;
  }, 2100);
  return { busy(text) { busyUntil = performance.now() + 1400; msg.textContent = text; msg.className = "busy"; } };
})();

/* ---- telemetria ---- */
const Telemetry = (function () {
  class Spark {
    constructor(canvas, color) { this.c = canvas; this.g = canvas.getContext("2d"); this.color = color; this.vals = Array(44).fill(0.5); }
    resize() {
      const r = this.c.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.c.width = Math.max(1, r.width * dpr); this.c.height = Math.max(1, r.height * dpr);
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0); this.w = r.width; this.h = r.height; this.draw();
    }
    push(v) { this.vals.push(v); if (this.vals.length > 44) this.vals.shift(); this.draw(); }
    draw() {
      const g = this.g, w = this.w || 0, h = this.h || 0; if (!w) return;
      g.clearRect(0, 0, w, h);
      const n = this.vals.length;
      g.beginPath();
      for (let i = 0; i < n; i++) { const x = i/(n-1)*w, y = h - clamp(this.vals[i],0,1)*(h-2) - 1; i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = this.color; g.lineWidth = 1.4; g.stroke();
      g.lineTo(w, h); g.lineTo(0, h); g.closePath();
      g.fillStyle = this.color.replace("1)", "0.13)"); g.fill();
    }
  }

  const ROSE = "rgba(255,154,196,1)", LAV = "rgba(199,155,255,1)", GOLD = "rgba(255,210,138,1)";
  const panels = [
    { el: "panelSys", title: "SYSTEM", metrics: [
      { key: "cpu", label: "CPU", min: 6, max: 96, val: 38, range: 22, color: ROSE, fmt: v => Math.round(v) + "%" },
      { key: "mem", label: "MEM", min: 34, max: 86, val: 61, range: 10, color: LAV, fmt: v => Math.round(v) + "%" },
      { key: "net", label: "NET", min: 20, max: 940, val: 180, range: 260, color: ROSE, fmt: v => Math.round(v) + " Mb" },
    ]},
    { el: "panelCluster", title: "CLUSTER", metrics: [
      { key: "qps", label: "QPS", min: 300, max: 5200, val: 1400, range: 700, color: ROSE, fmt: v => Math.round(v).toLocaleString() },
      { key: "lat", label: "LAT", min: 8, max: 140, val: 22, range: 16, color: GOLD, fmt: v => Math.round(v) + " ms" },
      { key: "nod", label: "NODES", min: 118, max: 162, val: 144, range: 6, color: LAV, fmt: v => Math.round(v) },
    ]},
  ];

  function build() {
    panels.forEach(p => {
      const el = document.getElementById(p.el);
      el.innerHTML = `<div class="phead">${p.title}<span class="dot"></span></div>` +
        p.metrics.map(m => `<div class="metric"><span class="mlabel">${m.label}</span>
          <canvas class="spark" data-k="${m.key}"></canvas><span class="mval" data-k="${m.key}">--</span></div>`).join("");
      p.metrics.forEach(m => {
        m.spark = new Spark(el.querySelector(`canvas[data-k="${m.key}"]`), m.color);
        m.out = el.querySelector(`span.mval[data-k="${m.key}"]`);
        m.spark.resize();
      });
    });
  }
  function tick() {
    panels.forEach(p => p.metrics.forEach(m => {
      m.val = clamp(m.val + (Math.random() - 0.5) * m.range, m.min, m.max);
      m.spark.push((m.val - m.min) / (m.max - m.min));
      m.out.textContent = m.fmt(m.val);
    }));
  }
  function resize() { panels.forEach(p => p.metrics.forEach(m => m.spark.resize())); }
  function metric(key) { for (const p of panels) for (const m of p.metrics) if (m.key === key) return m; }

  return {
    init() { build(); tick(); setInterval(tick, 850); window.addEventListener("resize", resize); },
    spike() {
      const q = metric("qps"), l = metric("lat"), c = metric("cpu");
      if (q) q.val = q.max; if (l) l.val = clamp(l.val + 40, l.min, l.max); if (c) c.val = clamp(c.val + 30, c.min, c.max);
    },
  };
})();

/* ================= AURORA (fitas de luz) ================= */
const Net = (function () {
  const canvas = document.getElementById("net");
  const g = canvas.getContext("2d");
  let W, H, dpr, cx, cy, t = 0, last = 0, rushA = 0, ribbons = [], motes = [];

  const PALETTE = [
    [255, 154, 196], // rosa
    [255, 111, 176], // magenta
    [199, 155, 255], // lavanda
    [255, 210, 138], // dourado
    [255, 200, 225], // rosa claro
  ];

  function build() {
    const bases = [0.34, 0.44, 0.5, 0.42, 0.58];
    ribbons = PALETTE.map((col, i) => ({
      col,
      base: H * bases[i],
      amp: H * (0.05 + Math.random() * 0.045),
      amp2: H * (0.02 + Math.random() * 0.02),
      thick: H * (0.14 + Math.random() * 0.08),
      k: (Math.PI * 2) / (W * (0.75 + Math.random() * 0.5)),
      k2: (Math.PI * 2) / (W * (0.28 + Math.random() * 0.2)),
      sp: 0.10 + Math.random() * 0.16,
      sp2: 0.08 + Math.random() * 0.12,
      ph: Math.random() * 10,
      alpha: 0.07 + Math.random() * 0.05,
    }));
    motes = [];
    const n = Math.round(W / 60);
    for (let i = 0; i < n; i++)
      motes.push({ x: Math.random()*W, y: Math.random()*H, vy: 5 + Math.random()*14,
        r: 0.7 + Math.random()*1.6, ph: Math.random()*6, tw: 1 + Math.random()*2 });
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * 0.5;
    build();
  }

  function yOf(rib, x, extra) {
    return rib.base + extra + Math.sin(x*rib.k + t*rib.sp + rib.ph) * rib.amp
                            + Math.sin(x*rib.k2 - t*rib.sp2) * rib.amp2;
  }
  function drawRibbon(rib) {
    const seg = Math.max(26, W / 56);
    g.beginPath();
    for (let x = -60; x <= W + 60; x += seg) { const y = yOf(rib, x, 0); x <= -60 ? g.moveTo(x, y) : g.lineTo(x, y); }
    for (let x = W + 60; x >= -60; x -= seg) g.lineTo(x, yOf(rib, x, rib.thick));
    g.closePath();
    const [r, gg, b] = rib.col;
    const A = rib.alpha * (1 + rushA * 1.3);
    const top = rib.base - rib.amp - rib.amp2 - 6, bot = rib.base + rib.thick + rib.amp + rib.amp2 + 6;
    const grd = g.createLinearGradient(0, top, 0, bot);
    grd.addColorStop(0, `rgba(${r},${gg},${b},0)`);
    grd.addColorStop(0.5, `rgba(${r},${gg},${b},${A.toFixed(3)})`);
    grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
    g.fillStyle = grd; g.fill();
  }

  function update(dt) {
    t += dt;
    if (rushA > 0) rushA = Math.max(0, rushA - dt * 0.8);
    for (const m of motes) {
      m.y -= m.vy * dt; m.ph += dt * m.tw;
      if (m.y < -10) { m.y = H + 10; m.x = Math.random() * W; }
    }
  }

  function draw() {
    g.clearRect(0, 0, W, H);

    // brilho central suave (coração da máquina, atrás do terminal)
    const hg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.5);
    hg.addColorStop(0, `rgba(255,150,200,${(0.05 + rushA*0.18).toFixed(3)})`);
    hg.addColorStop(1, "rgba(120,60,120,0)");
    g.fillStyle = hg; g.fillRect(0, 0, W, H);

    // fitas de aurora (aditivo)
    g.save(); g.globalCompositeOperation = "lighter";
    for (const rib of ribbons) drawRibbon(rib);
    g.restore();

    // motes delicados subindo
    g.save(); g.shadowColor = "#ffc2dd"; g.shadowBlur = 6;
    for (const m of motes) {
      const a = 0.25 + (Math.sin(m.ph) * 0.5 + 0.5) * 0.5;
      g.fillStyle = `rgba(255,205,228,${a.toFixed(2)})`;
      g.beginPath(); g.arc(m.x, m.y, m.r, 0, 7); g.fill();
    }
    g.restore();
  }

  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000; last = ts;
    if (dt > 0.05) dt = 0.05;
    update(dt); draw(); requestAnimationFrame(loop);
  }

  return {
    init() { resize(); window.addEventListener("resize", resize); requestAnimationFrame(loop); },
    rush() { rushA = 1; },
  };
})();

window.addEventListener("load", () => { Telemetry.init(); Net.init(); });

/* ---- busca ---- */
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
const tstat = document.getElementById("tstat");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  Net.rush(); Telemetry.spike(); HUD.busy("executing query");
  tstat.textContent = "running"; tstat.className = "tstat run";
  const looksLikeUrl = /^(https?:\/\/)/i.test(q) ||
    (/^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(q) && !q.includes(" "));
  const go = looksLikeUrl
    ? (q.startsWith("http") ? q : "https://" + q)
    : "https://www.google.com/search?q=" + encodeURIComponent(q);
  setTimeout(() => { window.location.href = go; }, 560);
});

/* ---- atalhos ---- */
const DEFAULTS = [
  { name: "GitHub",  url: "https://github.com" },
  { name: "Gmail",   url: "https://mail.google.com" },
  { name: "Drive",   url: "https://drive.google.com" },
  { name: "Notion",  url: "https://notion.so" },
  { name: "YouTube", url: "https://youtube.com" },
];
const KEY = "livemachinerose.shortcuts";

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
