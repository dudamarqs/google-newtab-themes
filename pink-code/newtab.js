/* ===== Pink Code — Nova Guia (synthwave) ===== */

/* ---- chuva de código rosa ---- */
(function rain() {
  const c = document.getElementById("rain");
  const x = c.getContext("2d");
  const glyphs = "01{}[]()<>/=;:.$#*+-_&|!?abcdefABCDEF10".split("");
  let W, H, fs, cols, drops;

  function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
    fs = Math.max(14, Math.round(W / 95));
    cols = Math.ceil(W / fs);
    drops = Array(cols).fill(0).map(() => Math.random() * -H / fs);
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    x.fillStyle = "rgba(10,5,16,0.13)";      // rastro que some
    x.fillRect(0, 0, W, H);
    x.font = fs + "px 'Consolas', monospace";
    for (let i = 0; i < cols; i++) {
      const py = drops[i] * fs, px = i * fs;
      x.fillStyle = "rgba(255,190,220,0.95)";           // cabeça brilhante
      x.fillText(glyphs[(Math.random() * glyphs.length) | 0], px, py);
      x.fillStyle = "rgba(255,79,154,0.45)";            // corpo rosa
      x.fillText(glyphs[(Math.random() * glyphs.length) | 0], px, py - fs);
      if (py > H && Math.random() > 0.975) drops[i] = Math.random() * -18;
      drops[i] += 0.5 + Math.random() * 0.4;
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ---- busca ---- */
const form = document.getElementById("searchForm");
const input = document.getElementById("searchInput");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  const looksLikeUrl = /^(https?:\/\/)/i.test(q) ||
    (/^[^\s]+\.[a-z]{2,}([/?#].*)?$/i.test(q) && !q.includes(" "));
  window.location.href = looksLikeUrl
    ? (q.startsWith("http") ? q : "https://" + q)
    : "https://www.google.com/search?q=" + encodeURIComponent(q);
});

/* ---- atalhos (editáveis, salvos no localStorage) ---- */
const DEFAULTS = [
  { name: "GitHub",  url: "https://github.com" },
  { name: "Gmail",   url: "https://mail.google.com" },
  { name: "Drive",   url: "https://drive.google.com" },
  { name: "Notion",  url: "https://notion.so" },
  { name: "YouTube", url: "https://youtube.com" },
];
const KEY = "pinkcode.shortcuts";

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
