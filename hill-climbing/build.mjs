// Hill Climbing, explained as a bench instrument.
// A row of 21 gauge pins is the landscape: pin j stands f(j) units tall.
// A small climber sits on one pin, feels the two neighbouring pins with its feelers,
// and hops onto the taller one only if it is taller than where it stands.
// When neither neighbour is taller it stops and raises its flag: a peak, maybe only a local one.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import { chromeCss, chromeHtml, footerHtml } from "../scripts/chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- the model (truth first) ----------
// Objective f(x) over 21 discrete states. Two hills: a local peak at x = 5 (46)
// and the global peak at x = 16 (70). The valley floor at x = 10 splits the basins.
const F = [12, 18, 26, 34, 41, 46, 43, 35, 28, 24, 22, 27, 36, 47, 58, 66, 70, 64, 52, 38, 26];
const N = F.length;
const GLOBAL = F.indexOf(Math.max(...F));

// Steepest-ascent hill climbing: look at both neighbours, move to the better one
// only when it is strictly better than the current state.
function climb(start) {
  const path = [start];
  let i = start;
  for (;;) {
    const left = i > 0 ? F[i - 1] : -Infinity;
    const right = i < N - 1 ? F[i + 1] : -Infinity;
    const best = left > right ? i - 1 : i + 1;
    if (Math.max(left, right) <= F[i]) return path;
    i = best;
    path.push(i);
  }
}

// ---------- the world ----------
const WIDTH = 1000;
const HEIGHT = 400;
const STEP = 10;
const XS = F.map((_, j) => (j - (N - 1) / 2) * STEP);
const BED_TOP = 6;
const TOP = F.map((f) => BED_TOP + f);

const PLATE = { x: -132, y: -24, w: 264, d: 70, r: 8 };
const PLATE_H = 10;
const FOOT_H = 5;
const BED = { x: XS[0] - 8, y: -11, w: XS[N - 1] - XS[0] + 16, d: 22, r: 2 };
const STRIP = { x: XS[0] - 6, y: 30, w: XS[N - 1] - XS[0] + 12, d: 7, r: 1 };
const STOP_W = 8;
const STOP_H = 12;

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    ...F.map((f, j) => [XS[j], 0, TOP[j] + 18]),
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: 62 },
);

const at = (point) => k.iso(point, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 20))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  const screws = k.corners(PLATE, 10);
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  return out.join("");
}

function ruler() {
  // Ruler strip along the front: one tick per state, a major tick every fifth.
  const out = [];
  out.push(S(k.slabOf(STRIP, 0, 0.6, P, 3), { tone: "lo" }));
  const ticks = k.topTicks(XS[0], XS[N - 1], STEP, 5, STRIP.y, 0.6, [2.6, 7], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([STRIP.x + 2, STRIP.y + 5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 5, 0.6])], { size: 0.45 }));
  return out.join("");
}

function bed() {
  // The comb block the pins stand in.
  const out = [];
  out.push(`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BED, 2), 0, 0.1, P)}" style="filter:blur(3px)"/>`);
  out.push(S(k.slabOf(BED, 0, BED_TOP, P, 4, 0.6), { tone: "mid" }));
  return out.join("");
}

function endStop(x0) {
  const plan = { x: x0, y: -12, w: STOP_W, d: 24, r: 1.4 };
  const out = [S(k.slabOf(plan, 0, STOP_H, P, 3, 0.5), { tone: "mid" })];
  out.push(D([at([x0 + STOP_W / 2, -8, STOP_H]), at([x0 + STOP_W / 2, 8, STOP_H])], { size: 0.45 }));
  return out.join("");
}

function pin(j) {
  const x = XS[j];
  const out = [];
  const shaft = { x: x - 3.4, y: -6.6, w: 6.8, d: 13.2, r: 0.8 };
  const top = TOP[j];
  out.push(S(k.slabOf(shaft, BED_TOP, top - BED_TOP, P, 3, 0.5), { tone: "hi", crease: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(shaft, 1.6), top, P, 3), { tone: j === GLOBAL ? "mid" : "faint" }));
  return out.join("");
}

// The climber is built at the origin, standing on z = 0, and moved with translateAlong.
const BODY = { x: -3.4, y: -5.6, w: 6.8, d: 11.2, r: 1.4 };
const BODY_H = 3;
const MAST = [0, -3.4];
const MAST_TOP = 17;
const FLAG_LOW = 5;
const FLAG_HIGH = 12.6;
const FEELER_Y = 2.6;

function climber() {
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(BODY, 1.4), 0, 0.1, P)}" style="filter:blur(2px)"/>`];
  out.push(S(k.slabOf(BODY, 0, BODY_H, P, 4, 0.5), { tone: "hi", lit: true }));
  out.push(D([at([-2.2, BODY.y + BODY.d - 1.4, BODY_H]), at([2.2, BODY.y + BODY.d - 1.4, BODY_H])], { size: 0.4, tone: "lo" }));
  out.push(S(k.cylinder(0, FEELER_Y, 1.5, BODY_H, 1.4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(MAST[0], MAST[1], 1.3, BODY_H, 1.2, P, 18), { tone: "mid" }));
  out.push(S(k.cylinder(MAST[0], MAST[1], 0.5, BODY_H + 1.2, MAST_TOP - BODY_H - 1.2, P, 10), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(MAST[0], MAST[1], 0.9, MAST_TOP, 0.9, P, 14), { tone: "mid" }));
  return out.join("");
}

function flag() {
  // A thin plate on the mast, built at the lowered height and lifted at a peak.
  const plan = { x: MAST[0] + 0.5, y: MAST[1] - 0.3, w: 6, d: 0.6, r: 0.2 };
  return S(k.slabOf(plan, FLAG_LOW, 3.8, P, 2), { tone: "hi", crease: "lo" });
}

const START = 2;
const PATH0 = climb(START);
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "An instrument that runs hill climbing. Twenty-one gauge pins stand in a row on a bed; each pin's height is the value of one state. A small climber stands on one pin, feels the two neighbouring pins with two feelers and hops to the taller one while it is taller than its own. When no neighbour is taller it stops and raises a flag. Started left of the valley it stops on the lower hill, a local maximum; started right of it, it reaches the tallest pin.",
  body: [
    plate(),
    ruler(),
    bed(),
    `<g data-part="row">`,
    endStop(XS[0] - 8 - STOP_W),
    ...F.map((_, j) => `<g data-pin="${j}">${pin(j)}</g>`),
    `<g data-part="climber" transform="${k.translateAlong(P, [XS[START], 0, TOP[START]])}">${climber()}<g data-part="flag">${flag()}</g></g>`,
    `</g>`,
    endStop(XS[N - 1] + 8),
    `<g data-part="marker" transform="${k.translateAlong(P, [XS[START], 0, 0])}">${S(k.slabOf({ x: -2.4, y: STRIP.y - 3.2, w: 4.8, d: 3.2, r: 0.6 }, 0, 2.4, P, 2, 0.3), { tone: "mid" })}${D([at([0, STRIP.y - 1.6, 2.4])], { size: 0.45, tone: "hi" })}</g>`,
    `<g data-part="trail"></g>`,
    `<g data-part="feelers"></g>`,
  ],
});

// ---------- live behaviour ----------
const live = `
const P = ${JSON.stringify(P)};
const F = ${JSON.stringify(F)}, XS = ${JSON.stringify(XS)}, TOP = ${JSON.stringify(TOP)};
const N = F.length, GLOBAL = ${GLOBAL};
const BODY_H = ${BODY_H}, FY = ${FEELER_Y}, FLAG_LIFT = ${FLAG_HIGH - FLAG_LOW};
const TOUR = [2, 13, 8, 10, 19, 6];
const climb = ${climb.toString()};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const row = svg.querySelector('[data-part="row"]');
const climberEl = svg.querySelector('[data-part="climber"]');
const flagEl = svg.querySelector('[data-part="flag"]');
const markerEl = svg.querySelector('[data-part="marker"]');
const trailEl = svg.querySelector('[data-part="trail"]');
const feelersEl = svg.querySelector('[data-part="feelers"]');
const pins = [...row.querySelectorAll("[data-pin]")];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const NS = "http://www.w3.org/2000/svg";
const at = (p) => iso(p, P);
const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const PROBE = 0.55, HOP = 0.7, REST = 2.8;

let start = ${START}, path = climb(start), stepAt = 0, phase = "probe", clock = 0;
let flag = 0, mark = XS[start], touring = true, tourIndex = 0, idleTimer = 0, frame = 0, last = 0, visible = false;
let pos = { x: XS[start], z: TOP[start] };

function reset(next) {
  start = next; path = climb(start); stepAt = 0; phase = "probe"; clock = 0;
  pos = { x: XS[start], z: TOP[start] };
}
function finishNow() {
  stepAt = path.length - 1; phase = "peak"; clock = 0;
  const end = path[stepAt]; pos = { x: XS[end], z: TOP[end] }; flag = 1;
}

function place() {
  // Painter's order: the climber goes just before the first pin that is nearer than it and stands taller than its feet.
  const d = depthOf([pos.x, 0, 0], P);
  let before = null;
  for (const el of pins) {
    const j = +el.dataset.pin;
    if (depthOf([XS[j], 0, 0], P) > d + 0.01 && TOP[j] > pos.z + 0.5) { before = el; break; }
  }
  if (before) { if (climberEl.nextSibling !== before) row.insertBefore(climberEl, before); }
  else if (row.lastElementChild !== climberEl) row.appendChild(climberEl);
}

function feelerPath(side, reach) {
  const here = path[stepAt];
  const n = here + side;
  if (n < 0 || n >= N) return "";
  const z0 = pos.z + BODY_H + 1.4;
  const lift = Math.max(pos.z, TOP[n]) + BODY_H + 3.2;
  const tipZ = lift - reach * (lift - TOP[n]);
  const a = at([pos.x, FY, z0]), b = at([pos.x, FY, lift]), c = at([XS[n], FY, lift]), e = at([XS[n], FY, tipZ]);
  const better = F[n] > F[here];
  return '<path class="iso-line" data-tone="' + (reach > 0.98 && better ? "hi" : "lo") + '" d="M' + a.join(" ") + "L" + b.join(" ") + "L" + c.join(" ") + "L" + e.join(" ") + '"/>' +
    '<circle class="iso-wire-end" cx="' + e[0].toFixed(1) + '" cy="' + e[1].toFixed(1) + '" r="' + (reach > 0.98 ? 1 : 0.7) + '"/>';
}

function draw(reach) {
  place();
  climberEl.setAttribute("transform", translateAlong(P, [pos.x, 0, pos.z]));
  flagEl.setAttribute("transform", translateAlong(P, [0, 0, flag * FLAG_LIFT]));
  markerEl.setAttribute("transform", translateAlong(P, [mark, 0, 0]));
  feelersEl.innerHTML = reach > 0.02 ? feelerPath(-1, reach) + feelerPath(1, reach) : "";
  const seen = path.slice(0, phase === "hop" ? stepAt + 1 : stepAt);
  trailEl.innerHTML = '<g class="iso-dots" data-tone="mid">' + seen.filter((j) => j !== path[stepAt]).map((j) => { const p = at([XS[j], 0, TOP[j]]); return '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="0.9"/>'; }).join("") + "</g>";
  const here = path[stepAt];
  let text = "awal " + start + " · langkah " + stepAt + " · f(" + here + ")=" + F[here];
  if (phase === "peak") text += here === GLOBAL ? " · puncak global" : " · puncak lokal";
  else text += " · " + (phase === "probe" ? "cek tetangga" : "naik ke " + path[stepAt + 1]);
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(start));
  stage.setAttribute("aria-valuetext", text);
}

function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now; clock += dt;
  let reach = 0;
  mark += (XS[start] - mark) * (1 - Math.exp(-dt / 0.18));
  if (phase === "probe") {
    reach = ease(Math.min(clock / PROBE, 1));
    if (clock >= PROBE + 0.15) { clock = 0; phase = stepAt < path.length - 1 ? "hop" : "peak"; }
  } else if (phase === "hop") {
    const u = ease(Math.min(clock / HOP, 1));
    const a = path[stepAt], b = path[stepAt + 1];
    pos.x = XS[a] + (XS[b] - XS[a]) * u;
    pos.z = TOP[a] + (TOP[b] - TOP[a]) * u + Math.sin(Math.PI * u) * 5;
    reach = 1 - Math.min(clock / 0.2, 1);
    if (clock >= HOP) { stepAt += 1; pos = { x: XS[b], z: TOP[b] }; clock = 0; phase = "probe"; }
  } else {
    reach = 1 - Math.min(clock / 0.4, 1);
    flag += (1 - flag) * (1 - Math.exp(-dt / 0.22));
    if (touring && clock > REST) { tourIndex = (tourIndex + 1) % TOUR.length; reset(TOUR[tourIndex]); }
  }
  if (phase !== "peak") flag += (0 - flag) * (1 - Math.exp(-dt / 0.15));
  draw(reach);
  const settled = !touring && phase === "peak" && flag > 0.999 && Math.abs(mark - XS[start]) < 0.01;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const choose = (next) => {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; clock = 0; run(); } }, 5200);
  if (next === start && phase !== "peak") return;
  reset(next);
  if (still.matches) { mark = XS[start]; finishNow(); draw(0); return; }
  run();
};
new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) { touring = false; finishNow(); }
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = Math.min(1, Math.max(0, ((event.clientX - box.left) / box.width - 0.12) / 0.76));
  const next = Math.round(share * (N - 1));
  if (next !== start) choose(next);
});
stage.addEventListener("click", () => choose(start));
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowUp") to = Math.min(N - 1, start + 1);
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") to = Math.max(0, start - 1);
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = N - 1;
  if (event.key === "Enter" || event.key === " ") to = start;
  if (to === null) return;
  event.preventDefault();
  choose(to);
});
draw(0);
`;

const CSS = `
.hc-stage{margin:8px 0 0;outline:none;cursor:crosshair}
.hc-stage .iso-svg{width:100%;max-height:74vh;margin:0 auto}
.hc-bar{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:14px 20px;border-radius:var(--radius);background:var(--surface);font-size:14px}
.hc-hint{color:var(--anatomy-muted)}
.hc-readout{font:400 14px var(--mono);color:var(--anatomy-strong);font-variant-numeric:tabular-nums;text-align:right}
.hc-notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:40px;padding:32px 20px 0}
.hc-notes h2{margin:0 0 6px;font:500 15px var(--heading);color:var(--anatomy-strong)}
.hc-notes p{margin:0;font-size:14px}
@media(max-width:760px){.hc-stage{overflow:hidden}.hc-stage .iso-svg{width:150%;max-width:none;max-height:none;margin-left:-25%}.hc-bar{flex-direction:column;gap:4px}.hc-readout{text-align:left}.hc-notes{grid-template-columns:1fr;gap:22px}}
`;
const body = `<style>${chromeCss()}${CSS}</style>${chromeHtml({ active: "hill", theme })}
<section aria-label="Ilustrasi hill climbing">
<div class="iso-stage hc-stage" tabindex="0" role="slider" aria-label="Hill climbing: panah kiri/kanan memilih titik awal, Enter mengulang" aria-valuemin="0" aria-valuemax="${N - 1}" aria-valuenow="${START}">${svg}</div>
<div class="hc-bar"><span class="hc-hint">Arahkan kursor ke gambar untuk memilih titik awal. Klik untuk mengulang.</span><span class="hc-readout" data-readout>awal ${START} · langkah 0 · f(${START})=${F[START]} · cek tetangga</span></div>
<div class="hc-notes">
<div><h2>Lanskap</h2><p>21 pin, satu per state. Tinggi pin adalah nilai f(x) yang ingin dimaksimalkan.</p></div>
<div><h2>Langkah</h2><p>Pendaki mengukur dua tetangganya dan pindah ke yang lebih tinggi. Tidak ada yang lebih tinggi? Berhenti.</p></div>
<div><h2>Jebakan</h2><p>Mulai di x 0–9, ia berhenti di puncak lokal x=5 (f=46). Mulai di x 10–20, ia sampai ke puncak global x=16 (f=70).</p></div>
</div>
</section>${footerHtml()}`;

const out = theme === "light" ? "hill-climbing-light.html" : "hill-climbing.html";
writeFileSync(join(HERE, out), k.pageHtml({ title: "Hill Climbing Algorithm", theme, width: 1200, body, script: 'import { iso, depthOf, translateAlong, pathOf } from "/kit/iso-kit.mjs";\n' + live }));
console.log("wrote", out, "· path from", START, "=", PATH0.join("→"));
