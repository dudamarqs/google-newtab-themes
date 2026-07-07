/* ===== Purple Wave — Nova Guia ===== */

/* ---- estrelas ---- */
(function stars() {
  const box = document.getElementById("stars");
  let html = "";
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 100, y = Math.random() * 100;
    const d = (2 + Math.random() * 3).toFixed(1);
    html += `<i style="left:${x}%;top:${y}%;--tw:${d}s"></i>`;
  }
  box.innerHTML = html;
})();

/* ---- ondas em movimento lento ---- */
(function waves() {
  const host = document.getElementById("waves");
  const H = 320, baseY = 170;

  // gera o "d" de uma senoide suave
  function sinePath(width, wavelength, amp) {
    let d = `M 0 ${baseY}`;
    for (let x = 0; x <= width; x += 8) {
      const y = baseY + Math.sin((x / wavelength) * Math.PI * 2) * amp;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  // camadas: [wavelength, amplitude, offsetBottom(px), stroke, largura, duração(s)]
  const layers = [
    [560, 34, 90,  "rgba(196,181,253,.65)", 3.4, 46],
    [440, 26, 40,  "rgba(139,92,246,.45)",  2.6, 62],
    [680, 44, 150, "rgba(167,139,250,.28)", 2.0, 82],
  ];

  layers.forEach(([wl, amp, bottom, stroke, sw, dur]) => {
    const totalW = window.innerWidth + wl + 40;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "wave");
    svg.setAttribute("width", totalW);
    svg.setAttribute("height", H);
    svg.setAttribute("viewBox", `0 0 ${totalW} ${H}`);
    svg.style.bottom = bottom + "px";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", sinePath(totalW, wl, amp));
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", sw);
    svg.appendChild(path);
    host.appendChild(svg);

    // deslizamento contínuo e lento (uma onda por vez → loop perfeito)
    svg.animate(
      [{ transform: "translateX(0)" }, { transform: `translateX(${-wl}px)` }],
      { duration: dur * 1000, iterations: Infinity, easing: "linear" }
    );
  });
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
  if (looksLikeUrl) {
    window.location.href = q.startsWith("http") ? q : "https://" + q;
  } else {
    window.location.href = "https://www.google.com/search?q=" + encodeURIComponent(q);
  }
});

/* ---- atalhos (editáveis, salvos no localStorage) ---- */
const DEFAULTS = [
  { name: "GitHub",  url: "https://github.com" },
  { name: "Gmail",   url: "https://mail.google.com" },
  { name: "Drive",   url: "https://drive.google.com" },
  { name: "Notion",  url: "https://notion.so" },
  { name: "YouTube", url: "https://youtube.com" },
];
const KEY = "purplewave.shortcuts";

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
      e.preventDefault();
      const l = load(); l.splice(idx, 1); save(l); render();
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
