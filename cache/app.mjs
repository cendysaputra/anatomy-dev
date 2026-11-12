// Cache-aside: the application owns lookup, database reads, and cache fills.
const $=s=>document.querySelector(s);
const entries=new Map();
const source={A:{name:'Produk A',value:'Data produk A'},B:{name:'Produk B',value:'Data produk B'}};
const paths=[0,1,2].map(i=>$('#path-'+i));
const packet=$('#packet'),signal=$('#signal');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let busy=false,reads=0;
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function contents(){
  $('#contents').textContent=entries.size?[...entries.keys()].map(k=>source[k].name).join(' · '):'kosong';
  for(const [i,key] of ['A','B'].entries())$('[data-slot="'+i+'"]').toggleAttribute('data-filled',entries.has(key));
}
function lock(value){busy=value;$('#request').disabled=value;$('#clear').disabled=value;$('#key').disabled=value;$('.cache-demo').setAttribute('aria-busy',String(value));}
function say(text){$('#status').textContent=text;}
async function travel(index,reverse=false,kind='lookup',duration=430){
  const path=paths[index],length=path.getTotalLength();
  path.setAttribute('data-active','');packet.dataset.kind=kind;packet.removeAttribute('hidden');
  const point=u=>{const p=path.getPointAtLength((reverse?1-u:u)*length);packet.setAttribute('cx',p.x);packet.setAttribute('cy',p.y);};
  if(reduced.matches){point(1);await wait(180);}
  else await new Promise(resolve=>{let start;function frame(now){start??=now;const t=Math.min(1,(now-start)/duration);point(t);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
  path.removeAttribute('data-active');packet.setAttribute('hidden','');
}
$('#request').addEventListener('click',async()=>{
  if(busy)return;lock(true);
  const key=$('#key').value,name=source[key].name;
  $('#result').textContent='Memproses '+name+'…';$('#result').removeAttribute('data-hit');
  try{
    say(name+': client mengirim request.');await travel(0);
    say('Aplikasi memeriksa cache.');await travel(1);
    const hit=entries.has(key);let data;
    if(hit){
      data=entries.get(key);say('Cache hit — salinan ditemukan. Database tidak dibaca.');
      await travel(1,true,'data');
    }else{
      say('Cache miss — salinan belum ada.');await travel(1,true);
      say('Aplikasi mengambil data dari database.');await travel(2,false,'lookup',650);reads++;
      const p=paths[2].getPointAtLength(paths[2].getTotalLength());signal.setAttribute('cx',p.x);signal.setAttribute('cy',p.y);signal.removeAttribute('hidden');await wait(reduced.matches?120:450);signal.setAttribute('hidden','');
      data={...source[key]};await travel(2,true,'data',650);
      say('Aplikasi menyimpan salinan ke cache.');await travel(1,false,'data');entries.set(key,data);contents();await travel(1,true,'data',250);
    }
    say('Data dikembalikan ke client.');await travel(0,true,'data');
    $('#result').dataset.hit=String(hit);$('#result').textContent=(hit?'Cache hit':'Cache miss')+' · database dibaca '+reads+'× total';
    say(hit?name+' diterima dari cache. Tidak perlu membaca database lagi.':name+' diterima dan tersimpan. Kirim lagi untuk melihat cache hit.');
  }finally{lock(false);}
});
$('#clear').addEventListener('click',()=>{if(busy)return;entries.clear();contents();say('Cache dikosongkan. Request berikutnya akan membaca database.');$('#result').textContent='Cache kosong · database dibaca '+reads+'× total';$('#result').removeAttribute('data-hit');});
contents();
