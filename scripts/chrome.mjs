// Shared editorial frame. The Anatomy drawing kit stays unchanged.
export function chromeCss() {
  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;450;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
:root{--heading:'IBM Plex Sans',sans-serif;--body:'Manrope',sans-serif;--accent:#d64b2a}
body.iso{font:400 16px/1.65 var(--body)}
.iso[data-theme="light"]{--anatomy-page:#f7f7f2;--anatomy-strong:#20251f;--anatomy-text:#5c635c;--anatomy-muted:#747a71;--anatomy-card:#fff;--anatomy-paper:#f9faf5;--anatomy-top:#fff;--anatomy-mid:#7d8a78;--anatomy-hi:#354732;--anatomy-lo:#a6b19f;--anatomy-faint:#d9dfd3}
.iso-page{width:min(1280px,100% - 96px);margin:0 auto 64px}
.site-header{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:25px 0;border-bottom:1px solid var(--anatomy-faint)}
.brand{display:flex;gap:10px;align-items:center;color:var(--anatomy-strong);text-decoration:none;font:600 22px var(--heading);letter-spacing:-.04em}
.brand-mark{width:27px;height:27px}.brand span:last-child{font-weight:400;color:var(--anatomy-muted)}
.header-note,.eyebrow,.section-index,.diagram-label{font:500 11px/1.5 var(--body);letter-spacing:.12em;text-transform:uppercase}
.header-note{color:var(--anatomy-muted)}
.iso-nav{display:flex;gap:30px;margin:0;border-bottom:1px solid var(--anatomy-faint);overflow:auto}
.iso-nav a{display:flex;align-items:center;gap:12px;flex-shrink:0;color:var(--anatomy-muted);font-size:13px;font-weight:600;text-decoration:none;padding:20px 0 17px;border-bottom:2px solid transparent;transition:color .2s}
.iso-nav a span{font-size:10px;color:var(--anatomy-muted)}
.iso-nav a:hover,.iso-nav a[aria-current="page"]{color:var(--anatomy-strong)}
.iso-nav a[aria-current="page"]{border-color:var(--accent)}
.page-intro{display:grid;grid-template-columns:1.3fr 1fr;gap:64px;padding:50px 0 36px;align-items:end}
.eyebrow{display:flex;gap:9px;align-items:center;color:var(--accent);margin:0 0 16px}
.eyebrow:before{content:'';width:6px;height:6px;background:currentColor;border-radius:50%}
.iso-page h1{margin:0;color:var(--anatomy-strong);font:450 clamp(38px,4.7vw,64px)/1.02 var(--heading);letter-spacing:-.055em;max-width:700px}
.intro-copy{margin:0 0 3px;max-width:440px;font-size:16px;line-height:1.8}
.iso-plate{background:transparent;box-shadow:none}
.iso{--anatomy-weight:1px}.iso-halo{filter:blur(12px)}
.iso-legend{font:400 16px/1.8 var(--body)}
.iso-plate-corner{font-size:11px}.iso-figure{margin-top:14px}
.site-footer{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;margin-top:48px;padding-top:22px;border-top:1px solid var(--anatomy-faint);font-size:12px;color:var(--anatomy-muted)}
a{color:inherit}button,select,input{font:inherit}button,a,select,input{touch-action:manipulation}button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:5px}
@media(max-width:800px){.iso-page{width:calc(100% - 48px)}.page-intro{grid-template-columns:1fr;gap:22px;padding:36px 0 28px}.intro-copy{max-width:600px}.header-note{font-size:9px}.iso-nav{gap:24px}}
@media(max-width:480px){.iso-page{width:calc(100% - 32px)}.site-header{padding:20px 0}.header-note{max-width:100px;text-align:right}.iso-nav a{font-size:11px;gap:7px}.iso-page h1{font-size:42px}.page-intro{padding-top:32px}}
`;
}

export function chromeHtml({ active, theme = "light" }) {
  const hrefs = theme === "dark"
    ? { hill: "/dark", lb: "/load-balancer/dark" }
    : { hill: "/", lb: "/load-balancer" };
  const link = (id, num, label) => `<a href="${hrefs[id]}"${active === id ? ' aria-current="page"' : ''}><span>${num}</span>${label}</a>`;
  const isLb = active === 'lb';
  return `<header class="site-header"><a class="brand" href="/" aria-label="Anatomy Dev beranda"><svg class="brand-mark" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m14 2 11 6v12l-11 6-11-6V8Z M3 8l11 6 11-6 M14 14v12" stroke="currentColor" stroke-width="1.5"/><path d="m8 5 11 6v12" stroke="currentColor"/></svg>anatomy<span>/ dev</span></a><span class="header-note">A little less abstract.</span></header>
  <nav class="iso-nav" aria-label="Pilih ilustrasi">${link('hill','01','Hill climbing')}${link('lb','02','Load balancing')}</nav>
  <section class="page-intro"><div><p class="eyebrow">Interactive field notes / ${isLb ? '02 — Systems' : '01 — Algorithms'}</p><h1>${isLb ? 'One entrance.<br>Many ways through.' : 'A better step.<br>Until there isn’t one.'}</h1></div><p class="intro-copy">${isLb ? 'Bagaimana satu pintu masuk membagi ribuan request? Lihat load balancer bekerja, ubah strateginya, lalu coba matikan satu server.' : 'Kenali cara kerja hill climbing lewat sebuah mesin kecil. Bandingkan tetangga, naik selangkah, dan temukan mengapa puncak terdekat belum tentu yang tertinggi.'}</p></section>`;
}
export function footerHtml(){return `<footer class="site-footer"><span>Anatomy Dev · Learn by looking.</span><span>Isometric instruments, built with <a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Anatomy ↗</a></span></footer>`;}
