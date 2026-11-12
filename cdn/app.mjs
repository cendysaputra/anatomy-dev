import {CDN,REGIONS} from './model.mjs';
const cdn=new CDN(),$=s=>document.querySelector(s);
const packet=$('#cdn-packet'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let location='jakarta',busy=false;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function say(text){$('#cdn-status').textContent=text;}
function paint(){
  for(const [key,region] of Object.entries(REGIONS)){
    const node=$('[data-region="'+key+'"]');
    node.toggleAttribute('data-selected',key===location);
    const filled=cdn.caches.get(key).has('hero.webp');node.toggleAttribute('data-filled',filled);
    $('[data-edge="'+key+'"]').textContent=filled?'hero.webp tersimpan':'kosong';
    $('[data-location="'+key+'"]').setAttribute('aria-pressed',String(key===location));
  }
  $('#cdn-origin-count').textContent=cdn.originReads;
}
function lock(value){busy=value;for(const b of document.querySelectorAll('.cdn-bar button'))b.disabled=value;}
async function travel(id,reverse=false,data=false,duration=420){
  const path=$('#'+id),length=path.getTotalLength();path.setAttribute('data-active','');packet.toggleAttribute('data-data',data);packet.removeAttribute('hidden');
  const point=u=>{const p=path.getPointAtLength((reverse?1-u:u)*length);packet.setAttribute('cx',p.x);packet.setAttribute('cy',p.y);};
  if(reduced.matches){point(1);await wait(150);}
  else await new Promise(resolve=>{let start;function frame(now){start??=now;const t=Math.min(1,(now-start)/duration);point(t);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  packet.setAttribute('hidden','');path.removeAttribute('data-active');
}
for(const button of document.querySelectorAll('[data-location]'))button.addEventListener('click',()=>{
  if(busy)return;location=button.dataset.location;paint();
  const region=REGIONS[location];say(region.user+' memakai '+region.edge+'. Minta aset untuk memeriksa cache edge ini.');
  $('#cdn-result').textContent='Lokasi: '+region.user;$('#cdn-result').removeAttribute('data-hit');
});
$('#cdn-send').addEventListener('click',async()=>{
  if(busy)return;lock(true);
  const key=location,region=REGIONS[key],request=cdn.lookup(key);
  $('#cdn-result').textContent='GET /hero.webp';$('#cdn-result').removeAttribute('data-hit');
  try{
    say(region.user+' diarahkan ke '+region.edge+'.');await travel(key+'-local');
    if(request.hit){
      say('HIT — '+region.edge+' punya salinan. Origin tidak diakses.');
      cdn.deliver(request);
    }else{
      say('MISS — '+region.edge+' mengambil hero.webp dari origin.');await travel(key+'-origin',false,false,850);
      say('Origin mengirim aset ke '+region.edge+'.');await travel(key+'-origin',true,true,850);
      cdn.deliver(request);paint();say('Salinan disimpan di '+region.edge+', lalu dikirim ke pengguna.');
    }
    await travel(key+'-local',true,true);paint();
    $('#cdn-result').dataset.hit=String(request.hit);
    $('#cdn-result').textContent=(request.hit?'HIT':'MISS')+' · '+region.edge+' → '+region.user;
    say(request.hit?'Aset diterima dari edge, tanpa perjalanan ke origin.':'Aset diterima. Minta lagi dari lokasi ini untuk melihat cache hit.');
  }finally{lock(false);}
});
$('#cdn-purge').addEventListener('click',()=>{if(busy)return;cdn.purge();paint();$('#cdn-result').textContent='Kedua edge kosong';$('#cdn-result').removeAttribute('data-hit');say('Purge selesai. Request berikutnya dari kedua lokasi akan mengambil aset dari origin.');});
paint();
