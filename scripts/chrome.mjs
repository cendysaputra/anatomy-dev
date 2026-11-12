// Minimal shared frame; diagrams and controls carry the page.
export function chromeCss() {
  return `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap');
:root{--heading:'IBM Plex Sans',sans-serif;--body:'Manrope',sans-serif;--accent:#b85b39}
body.iso{font:400 16px/1.7 var(--body)}
.iso[data-theme="light"]{--anatomy-page:#fff;--anatomy-strong:#252825;--anatomy-text:#646864;--anatomy-muted:#858a84;--anatomy-card:#fff;--anatomy-paper:#fafbf9;--anatomy-top:#fff;--anatomy-mid:#879181;--anatomy-hi:#485443;--anatomy-lo:#b5bdb0;--anatomy-faint:#e9ece6}
.iso-page{width:min(1120px,100% - 80px);margin:0 auto 40px}
.site-header{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:28px 0;border-bottom:1px solid var(--anatomy-faint)}
.brand{color:var(--anatomy-strong);text-decoration:none;font:500 19px var(--heading);letter-spacing:-.04em;white-space:nowrap}
.brand span{font-weight:400;color:var(--anatomy-muted)}
.iso-nav{display:flex;gap:26px;align-items:center}
.iso-nav a{color:var(--anatomy-muted);font-size:13px;text-decoration:none;transition:color .2s}
.iso-nav a:hover,.iso-nav a[aria-current="page"]{color:var(--anatomy-strong)}
.iso-nav a[aria-current="page"]{text-decoration:underline;text-underline-offset:6px;text-decoration-thickness:1px}
.page-intro{padding:44px 0 22px}
.iso-page h1{margin:0 0 10px;color:var(--anatomy-strong);font:400 36px/1.2 var(--heading);letter-spacing:-.04em}
.intro-copy{margin:0;max-width:650px;font-size:16px;line-height:1.8}
.iso-plate{background:transparent;box-shadow:none}.iso{--anatomy-weight:.85px}.iso-halo{filter:blur(10px);opacity:.16}
.iso-legend{font:400 16px/1.8 var(--body)}.iso-plate-corner{font-size:11px}.iso-figure{margin-top:14px}
.site-footer{display:flex;justify-content:flex-end;margin-top:38px;padding-top:18px;font-size:11px;color:var(--anatomy-muted)}
a{color:inherit}button,select,input{font:inherit}button,a,select,input{touch-action:manipulation}button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:5px}
@media(max-width:800px){.iso-page{width:calc(100% - 48px)}.page-intro{padding:34px 0 18px}}
@media(max-width:480px){.iso-page{width:calc(100% - 32px)}.site-header{padding:21px 0;gap:20px}.iso-nav{gap:17px}.iso-nav a{font-size:11px}.brand{font-size:17px}.iso-page h1{font-size:30px}.page-intro{padding-top:30px}}
`;
}
export function chromeHtml({ active, theme = 'light' }) {
  const hrefs = theme === 'dark' ? { hill:'/dark', lb:'/load-balancer/dark' } : { hill:'/', lb:'/load-balancer' };
  const link=(id,label)=>`<a href="${hrefs[id]}"${active===id?' aria-current="page"':''}>${label}</a>`;
  const lb=active==='lb';
  return `<header class="site-header"><a class="brand" href="/" aria-label="Anatomy Dev beranda">anatomy<span> / dev</span></a><nav class="iso-nav" aria-label="Pilih ilustrasi">${link('hill','Hill climbing')}${link('lb','Load balancing')}</nav></header><section class="page-intro"><h1>${lb?'Load balancing':'Hill climbing'}</h1><p class="intro-copy">${lb?'Lihat bagaimana request dibagi ke beberapa server. Ubah algoritmanya dan coba matikan satu server.':'Bandingkan tetangga, pilih langkah yang lebih tinggi, dan temukan batas dari puncak terdekat.'}</p></section>`;
}
export function footerHtml(){return `<footer class="site-footer"><a href="https://github.com/wheresryan22/anatomy" target="_blank" rel="noreferrer">Built with Anatomy ↗</a></footer>`;}
