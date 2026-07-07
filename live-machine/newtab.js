/* ===== Live Machine — Nova Guia (rede de dados) ===== */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---- HUD: spinner + logs ---- */
const HUD = (function () {
  const spin = document.getElementById("spin");
  const msg = document.getElementById("hudmsg");
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  const logs = [
    ["indexing shards", ""], ["cache warm 98.4%", "ok"], ["gc pause 0.4ms", ""],
    ["replicas in sync", "ok"], ["prefetch queue 12", ""], ["rebalancing region", ""],
    ["p99 latency 24ms", ""], ["heartbeat ok", "ok"], ["compacting segments", ""],
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

/* ---- telemetria (painéis com sparklines) ---- */
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
      g.fillStyle = this.color.replace("1)", "0.12)"); g.fill();
    }
  }

  const CYAN = "rgba(79,208,224,1)", GREEN = "rgba(87,224,138,1)", AMBER = "rgba(255,180,84,1)";
  const panels = [
    { el: "panelSys", title: "SYSTEM", metrics: [
      { key: "cpu", label: "CPU", min: 6, max: 96, val: 38, range: 22, color: CYAN, fmt: v => Math.round(v) + "%" },
      { key: "mem", label: "MEM", min: 34, max: 86, val: 61, range: 10, color: GREEN, fmt: v => Math.round(v) + "%" },
      { key: "net", label: "NET", min: 20, max: 940, val: 180, range: 260, color: CYAN, fmt: v => Math.round(v) + " Mb" },
    ]},
    { el: "panelCluster", title: "CLUSTER", metrics: [
      { key: "qps", label: "QPS", min: 300, max: 5200, val: 1400, range: 700, color: CYAN, fmt: v => Math.round(v).toLocaleString() },
      { key: "lat", label: "LAT", min: 8, max: 140, val: 24, range: 16, color: AMBER, fmt: v => Math.round(v) + " ms" },
      { key: "nod", label: "NODES", min: 118, max: 162, val: 144, range: 6, color: GREEN, fmt: v => Math.round(v) },
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
      if (q) { q.val = q.max; } if (l) { l.val = clamp(l.val + 40, l.min, l.max); } if (c) { c.val = clamp(c.val + 30, c.min, c.max); }
    },
  };
})();

/* ================= REDE DE DADOS ================= */
const Net = (function () {
  const canvas = document.getElementById("net");
  const g = canvas.getContext("2d");
  let W, H, dpr, cx, cy, nodes = [], packets = [], D = 150, coreGlow = 0, rushUntil = 0, last = 0, spawnAcc = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H * 0.5;
    D = Math.max(120, Math.min(170, W / 11));
    const count = Math.min(84, Math.floor(W * H / 17000));
    nodes = [{ x: cx, y: cy, vx: 0, vy: 0, core: true, pulse: 0 }];
    for (let i = 1; i < count; i++) {
      nodes.push({ x: Math.random()*W, y: Math.random()*H,
        vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, pulse: Math.random()*6 });
    }
    packets = [];
  }

  function neighbors(node, not) {
    const out = [];
    for (const n of nodes) {
      if (n === node || n === not) continue;
      const d = Math.hypot(n.x - node.x, n.y - node.y);
      if (d < D) out.push(n);
    }
    return out;
  }
  function spawnPacket() {
    const a = nodes[1 + ((Math.random() * (nodes.length - 1)) | 0)];
    const nb = neighbors(a, null);
    if (!nb.length) return;
    packets.push({ a, b: nb[(Math.random()*nb.length)|0], t: 0, sp: 0.5 + Math.random()*0.5 });
  }
  function spawnRushPacket() {
    const a = nodes[1 + ((Math.random() * (nodes.length - 1)) | 0)];
    packets.push({ a, b: nodes[0], t: 0, sp: 1.4 + Math.random()*0.6, rush: true });
  }

  function update(dt) {
    const rushing = performance.now() < rushUntil;
    // nós à deriva
    for (const n of nodes) {
      if (n.core) { n.pulse += dt * 2; continue; }
      n.x += n.vx * dt; n.y += n.vy * dt; n.pulse += dt * 2;
      if (n.x < 20 || n.x > W - 20) n.vx *= -1;
      if (n.y < 20 || n.y > H - 20) n.vy *= -1;
      n.x = clamp(n.x, 20, W - 20); n.y = clamp(n.y, 20, H - 20);
    }
    // spawn de pacotes
    spawnAcc += dt;
    const interval = 0.12;
    while (spawnAcc > interval) {
      spawnAcc -= interval;
      if (rushing) spawnRushPacket();
      else if (packets.length < 30) spawnPacket();
    }
    // move pacotes
    for (const p of packets) {
      p.t += p.sp * dt;
      if (p.t >= 1) {
        if (p.b.core) { coreGlow = Math.min(1.6, coreGlow + 0.28); p.dead = true; }
        else if (!p.rush && Math.random() < 0.65) {
          const nb = neighbors(p.b, p.a);
          if (nb.length) { p.a = p.b; p.b = nb[(Math.random()*nb.length)|0]; p.t = 0; }
          else p.dead = true;
        } else p.dead = true;
      }
    }
    packets = packets.filter(p => !p.dead);
    if (coreGlow > 0) coreGlow = Math.max(0, coreGlow - dt * 1.2);
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    // arestas
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < D) {
          g.strokeStyle = `rgba(79,208,224,${((1 - d/D) * 0.22).toFixed(3)})`;
          g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
        }
      }
    }
    // arestas ao núcleo
    for (let i = 1; i < nodes.length; i++) {
      const a = nodes[i], d = Math.hypot(a.x - cx, a.y - cy);
      if (d < D * 1.5) {
        g.strokeStyle = `rgba(79,208,224,${((1 - d/(D*1.5)) * 0.12).toFixed(3)})`;
        g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(cx, cy); g.stroke();
      }
    }
    // pacotes
    g.save(); g.shadowBlur = 8;
    for (const p of packets) {
      const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      const col = p.rush ? "rgba(255,180,84,.95)" : "rgba(140,235,245,.9)";
      g.shadowColor = p.rush ? "#ffb454" : "#4fd0e0"; g.fillStyle = col;
      g.beginPath(); g.arc(x, y, p.rush ? 2.6 : 2, 0, 7); g.fill();
    }
    g.restore();
    // nós
    for (let i = 1; i < nodes.length; i++) {
      const n = nodes[i], a = 0.4 + Math.sin(n.pulse) * 0.15;
      g.fillStyle = `rgba(120,200,215,${a.toFixed(2)})`;
      g.beginPath(); g.arc(n.x, n.y, 1.8, 0, 7); g.fill();
    }
    // núcleo
    const r = 6 + Math.sin(nodes[0].pulse) * 1.4 + coreGlow * 6;
    g.save(); g.shadowColor = "#4fd0e0"; g.shadowBlur = 20 + coreGlow * 26;
    g.fillStyle = `rgba(120,235,245,${(0.8 + coreGlow*0.2).toFixed(2)})`;
    g.beginPath(); g.arc(cx, cy, r * 0.5, 0, 7); g.fill();
    g.strokeStyle = `rgba(79,208,224,${(0.35 + coreGlow*0.4).toFixed(2)})`; g.lineWidth = 1.4;
    g.beginPath(); g.arc(cx, cy, r + 5, 0, 7); g.stroke();
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
    rush() { rushUntil = performance.now() + 900; coreGlow = Math.min(1.6, coreGlow + 0.5); },
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
const KEY = "livemachine.shortcuts";

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
