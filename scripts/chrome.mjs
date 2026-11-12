// Shared full-width frame: a rounded sidebar for navigation, then the title row and the figure.
export function chromeCss() {
  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400&family=Manrope:wght@400;500;600&display=swap');
:root{--heading:'IBM Plex Sans',sans-serif;--body:'Manrope',sans-serif;--mono:'IBM Plex Mono',ui-monospace,monospace;--accent:#b85b39;--gutter:clamp(16px,4vw,56px);--radius:14px}
body.iso{font:400 14px/1.65 var(--body)}
.iso[data-theme="light"]{--anatomy-page:#fff;--anatomy-strong:#1d1f1c;--anatomy-text:#555a54;--anatomy-muted:#868b84;--anatomy-card:#fff;--anatomy-paper:#fff;--anatomy-top:#fff;--anatomy-mid:#879181;--anatomy-hi:#3f4a3b;--anatomy-lo:#b5bdb0;--anatomy-faint:#e7e9e4;--surface:#f4f5f2}
.iso[data-theme="dark"]{--anatomy-page:#0e0f0e;--anatomy-card:#0e0f0e;--anatomy-paper:#0e0f0e;--anatomy-faint:#242624;--surface:#181a18}
.iso-page{width:100%;margin:0;padding:16px var(--gutter) var(--gutter) 16px;display:grid;grid-template-columns:232px minmax(0,1fr);column-gap:var(--gutter);align-content:start}
.iso-page>*{grid-column:2;min-width:0}
.site-header{grid-column:1;grid-row:1/span 20;align-self:start;position:sticky;top:16px;height:calc(100vh - 32px);display:flex;flex-direction:column;gap:28px;padding:22px 14px;border-radius:var(--radius);background:var(--surface)}
.brand{padding:0 10px;color:var(--anatomy-strong);text-decoration:none;font:500 17px var(--heading);letter-spacing:-.03em;white-space:nowrap}
.brand span{font-weight:400;color:var(--anatomy-muted)}
.iso-nav{display:flex;flex-direction:column;gap:2px}
.nav-title{margin:0 0 6px;padding:0 10px;font-size:12px;color:var(--anatomy-muted)}
.iso-nav a{display:block;padding:8px 10px;border-radius:9px;color:var(--anatomy-text);font-size:14px;text-decoration:none}
.iso-nav a:hover{color:var(--anatomy-strong)}
.iso-nav a[aria-current="page"]{background:var(--anatomy-page);color:var(--anatomy-strong)}
.side-foot{margin-top:auto;padding:0 10px;font-size:12px;color:var(--anatomy-muted)}.side-foot a{text-decoration:none}.side-foot a:hover{color:var(--anatomy-strong)}
.page-intro{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:end;padding:28px 0 8px}
.iso-page h1{margin:0;color:var(--anatomy-strong);font:400 clamp(34px,4.4vw,56px)/1.05 var(--heading);letter-spacing:-.045em}
.intro-copy{margin:0;max-width:46ch;justify-self:end;color:var(--anatomy-text)}
.iso{--anatomy-weight:.85px}.iso-halo{filter:blur(10px);opacity:.16}
.site-footer{height:24px}
a{color:inherit}button,select,input{font:inherit}button,a,select,input{touch-action:manipulation}
:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
@media(max-width:900px){.iso-page{display:block;padding:12px var(--gutter) var(--gutter)}.site-header{position:static;height:auto;flex-direction:row;align-items:center;justify-content:space-between;gap:12px;padding:8px 8px 8px 4px}.iso-nav{flex-direction:row}.nav-title,.side-foot{display:none}.iso-nav a{padding:7px 10px;font-size:13px}}
@media(max-width:480px){.site-header{flex-wrap:wrap;row-gap:8px}.iso-nav{flex-wrap:wrap}.iso-nav a{font-size:12px;padding:7px 8px}}
@media(max-width:760px){.page-intro{grid-template-columns:1fr;gap:14px;padding-top:28px}.intro-copy{justify-self:start}}
`;
}
export function chromeHtml({ active, theme = 'light' }) {
  const pages={
    lb:{title:'Load balancing',href:theme==='dark'?'/load-balancer/dark':'/load-balancer',copy:'Satu alamat di depan, beberapa server di belakang. Pilih cara membagi request, lalu matikan satu server dan lihat apa yang terjadi.'},
    hill:{title:'Hill climbing',href:theme==='dark'?'/dark':'/',copy:'Dari posisi sekarang, lihat kiri dan kanan, lalu naik ke yang lebih tinggi. Ulangi sampai tidak ada lagi yang lebih tinggi, entah itu puncak tertinggi atau bukan.'},
    cache:{title:'Cache',href:'/cache',copy:'Simpan sekali, ambil lebih cepat. Ikuti perjalanan data saat cache masih kosong dan saat sudah terisi.'},
    cdn:{title:'CDN',href:'/cdn',copy:'Aset yang sama, lebih dekat ke pengguna. Lihat edge CDN mengambil salinan dari origin, lalu melayani request berikutnya.'},
    city:{title:'Kota',href:'/city',copy:'Miniatur kota dari atas. Jalan, taman, dan puluhan gedung, dengan mobil yang terus bergerak mengelilingi blok.'}
  };
  const current=pages[active]??pages.hill;
  const links=Object.entries(pages).map(([id,page])=>`<a href="${page.href}"${active===id?' aria-current="page"':''}>${page.title}</a>`).join('');
  return `<header class="site-header"><a class="brand" href="/" aria-label="Anatomy Dev beranda">anatomy<span> / dev</span></a><nav class="iso-nav" aria-label="Pilih ilustrasi">${links}</nav><p class="side-foot"><a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Dibuat dengan Anatomy</a></p></header><section class="page-intro"><h1>${current.title}</h1><p class="intro-copy">${current.copy}</p></section>`;
}
export function footerHtml(){return `<footer class="site-footer" aria-hidden="true"></footer>`;}
