// Shared page frame for the Anatomy plates: a 1200px stage, no card around
// the figure, and a menu that moves between the two instruments.

const HILL = "Hill Climbing Algorithm";
const LB = "Load Balancer Process";

export function chromeCss() {
  return `
.iso-page{font-size:16px}
.iso-plate{background:transparent;box-shadow:none}
.iso{--anatomy-weight:1.15px}
.iso-halo{filter:blur(16px)}
.iso-nav{display:flex;flex-wrap:wrap;gap:4px 22px;margin:0 0 18px}
.iso-nav a{color:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;padding-bottom:6px;border-bottom:1px solid transparent}
.iso-nav a:hover{color:var(--anatomy-text)}
.iso-nav a[aria-current="page"]{color:var(--anatomy-strong);border-bottom-color:var(--anatomy-strong)}
.iso-page h1{margin:0 0 2px;font:600 34px/1.15 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:-.03em;color:var(--anatomy-strong)}
.iso-legend{font-size:15.5px}
.iso-plate-corner{font-size:12px}
@media (max-width:560px){
  .iso-page h1{font-size:26px}
}
`;
}

export function chromeHtml({ active, theme = "light" }) {
  const hrefs = theme === "dark"
    ? { hill: "/dark", lb: "/load-balancer/dark" }
    : { hill: "/", lb: "/load-balancer" };
  const link = (id, href, label) =>
    `<a href="${href}"${active === id ? ' aria-current="page"' : ""}>${label}</a>`;
  const heading = active === "lb" ? LB : HILL;
  return `<nav class="iso-nav" aria-label="Pilih ilustrasi">${link("hill", hrefs.hill, HILL)}${link("lb", hrefs.lb, LB)}</nav><h1>${heading}</h1>`;
}
