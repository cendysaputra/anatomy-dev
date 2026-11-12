import {writeFileSync} from 'node:fs';
import * as k from '../kit/iso-kit.mjs';
import {chromeCss,chromeHtml,footerHtml} from '../scripts/chrome.mjs';
const base={x:-175,y:-102,w:365,d:205,r:10};
const P=k.fitProjection([...k.boxCorners(base,-6,0),[-132,0,48],[-30,0,54],[90,-60,38],[132,60,54]],920,360,{pad:30,azimuth:68,elevation:30});
const at=p=>k.iso(p,P),S=p=>k.solidSvg(p,{tone:'mid',crease:'lo'});
const slab=(x,y,w,d,z,h)=>S(k.slabOf({x,y,w,d,r:2},z,h,P,5,.5));
const line=(ps,tone='lo')=>k.lineSvg(k.pathOf(ps.map(at)),{tone});
const label=(p,title,sub)=>{const [x,y]=at(p);return `<text x="${x}" y="${y}" class="label" text-anchor="middle">${title}</text><text x="${x}" y="${y+17}" class="sub" text-anchor="middle">${sub}</text>`;};
const routes=[ [[-112,0,2],[-54,0,2]], [[-5,0,2],[25,0,2],[25,-60,2],[65,-60,2]], [[-5,0,2],[25,0,2],[25,60,2],[110,60,2]] ];
let client=slab(-153,-16,42,32,0,3)+slab(-150,-14,36,3,3,27)+line([[-144,-11,24],[-138,-11,20],[-144,-11,16]],'mid')+line([[-133,-11,16],[-125,-11,16]],'mid');
let app=slab(-57,-21,54,42,0,4)+slab(-51,-16,42,32,4,23)+k.faceTextSvg(k.topMatrix([-43,-6],27,P),'APP',{size:7,tone:'hi'});
for(let i=0;i<4;i++)app+=line([[-44+i*8,16,10],[-44+i*8,16,17]]);
let cache=slab(65,-79,48,38,0,4)+slab(70,-75,38,30,4,12);
for(let i=0;i<6;i++)cache+=slab(69+i*6,-80,2,5,5,2)+slab(69+i*6,-45,2,5,5,2);
for(let i=0;i<2;i++)cache+=`<g data-slot="${i}" class="cache-slot">${slab(76+i*14,-70,10,20,16,2)}</g>`;
let db='';for(let i=0;i<3;i++)db+=S(k.cylinder(132,60,21,i*12,11,P,48,.5));
const svg=k.figureSvg({width:920,height:360,label:'Client mengirim request ke aplikasi. Aplikasi memeriksa cache; saat miss, data diambil dari database lalu salinannya disimpan di cache.',body:[
 `<path class="iso-halo" d="${k.haloOf(base,-6,6,P)}"/>`,S(k.slabOf(base,-6,6,P,6,.6)),
 ...routes.map((p,i)=>`<path id="path-${i}" d="${k.pathOf(p.map(at))}" class="route"/>`),
 client,label([-132,0,48],'Client','request'),app,label([-30,0,54],'Aplikasi','cek & ambil data'),cache,label([90,-60,38],'Cache','salinan sementara'),db,label([132,60,54],'Database','sumber data'),
 '<circle id="packet" r="5" hidden/><circle id="signal" r="9" hidden/>'
]});
const body=`<style>${chromeCss()}</style><link rel="stylesheet" href="/cache/style.css">${chromeHtml({active:'cache'})}<section class="cache-demo" aria-label="Simulasi cache"><div class="cache-figure">${svg}</div><div class="cache-controls"><label for="key">Data <select id="key"><option value="A">Produk A</option><option value="B">Produk B</option></select></label><button id="request" class="cache-button">Kirim request</button><button id="clear" class="cache-button quiet">Kosongkan cache</button></div><p class="cache-status" id="status" role="status">Kirim request dua kali untuk melihat bedanya.</p><div class="cache-state"><span>Isi cache: <output id="contents">kosong</output></span><span id="result">Belum ada request</span></div></section><div class="cache-explanation"><p><strong>Miss:</strong> data belum ada, aplikasi mengambilnya dari database lalu menyimpan salinan di cache. <strong>Hit:</strong> request berikutnya memakai salinan itu tanpa membaca database lagi.</p><p class="cache-note">Contoh pola cache-aside. Cache di sini bertahan sampai dikosongkan; sistem nyata juga memakai masa berlaku (TTL) atau invalidasi agar data tetap relevan.</p></div>${footerHtml()}`;
let html=k.pageHtml({title:'Cache — Anatomy Dev',theme:'light',width:1120,body});
html=html.replace('<html lang="en">','<html lang="id">').replace('</head>','<meta name="description" content="Ilustrasi interaktif cache hit dan cache miss menggunakan Anatomy."></head>').replace('</body>','<script type="module" src="/cache/app.mjs"></script></body>');
writeFileSync(new URL('index.html',import.meta.url),html);
console.log('Built cache');
