// One simulated HTTP request per connection. Time is deliberately slowed for learning.
export const algorithms = {
  round: { label: 'Round robin', description: 'Request dibagikan bergiliran ke server sehat: A → B → C → A. Jumlah request bisa merata, tetapi beban aktifnya belum tentu sama.' },
  least: { label: 'Least connections', description: 'Request berikutnya masuk ke server dengan koneksi aktif paling sedikit. Cocok saat durasi pekerjaan berbeda. Jika sama, giliran dipakai sebagai penentu.' },
  weighted: { label: 'Weighted round robin', description: 'Server A, B, C diberi bobot 3 : 2 : 1. Dalam setiap enam request baru, A mendapat tiga, B dua, dan C satu, selama semuanya sehat.' }
};
export class Simulation {
  constructor(){ this.reset(); }
  reset(){
    this.servers = [1.8, 3.6, 2.4].map((duration,i)=>({id:i,name:'ABC'[i],duration,weight:3-i,score:0,up:true,active:0,assigned:0,done:0}));
    this.requests=[]; this.events=[]; this.sent=0; this.completed=0; this.failed=0; this.elapsed=0; this.latency=0; this.cursor=-1; this.algorithm='round';
  }
  log(message,kind='info'){this.events.unshift({time:this.elapsed,message,kind});this.events.length=Math.min(this.events.length,7);}
  setAlgorithm(key){ if(!algorithms[key]) return; this.algorithm=key; this.servers.forEach(s=>s.score=0); this.cursor=-1; this.log('Strategi → '+algorithms[key].label); }
  choose(){
    const eligible=this.servers.filter(s=>s.up); if(!eligible.length)return null;
    if(this.algorithm==='weighted'){
      let best=eligible[0],total=0;
      for(const s of eligible){s.score+=s.weight;total+=s.weight;if(s.score>best.score)best=s;}
      best.score-=total;return best;
    }
    let candidates=eligible;
    if(this.algorithm==='least'){const min=Math.min(...eligible.map(s=>s.active));candidates=eligible.filter(s=>s.active===min);}
    for(let i=1;i<=3;i++){const s=this.servers[(this.cursor+i)%3];if(candidates.includes(s)){this.cursor=s.id;return s;}}
  }
  send(){const r={id:++this.sent,phase:'incoming',age:0,started:this.elapsed,server:null};this.requests.push(r);return r;}
  fail(r,message){if(r.phase==='failed'||r.phase==='done')return; if(['outgoing','processing'].includes(r.phase))this.servers[r.server].active--;r.phase='failed';r.age=0;this.failed++;this.log('#'+String(r.id).padStart(3,'0')+' · '+message,'error');}
  toggle(id){
    const s=this.servers[id];s.up=!s.up;this.servers.forEach(x=>x.score=0);
    if(!s.up)for(const r of this.requests)if(r.server===id&&['outgoing','processing'].includes(r.phase))this.fail(r,'server '+s.name+' terputus');
    this.log('Server '+s.name+(s.up?' kembali sehat':' ditandai tidak sehat'),s.up?'success':'error');
  }
  tick(dt){
    this.elapsed+=dt;
    for(const r of this.requests){
      r.age+=dt;
      if(r.phase==='incoming'&&r.age>=.8){
        const s=this.choose(); if(!s){this.fail(r,'503 · tidak ada server sehat');continue;}
        r.server=s.id;r.phase='outgoing';r.age=0;s.active++;s.assigned++;
        this.log('#'+String(r.id).padStart(3,'0')+' → Server '+s.name);
      } else if(r.phase==='outgoing'&&r.age>=.8){r.phase='processing';r.age=0;}
      else if(r.phase==='processing'&&r.age>=this.servers[r.server].duration){this.servers[r.server].active--;r.phase='returning';r.age=0;}
      else if(r.phase==='returning'&&r.age>=.8){r.phase='response';r.age=0;}
      else if(r.phase==='response'&&r.age>=.8){r.phase='done';this.completed++;this.servers[r.server].done++;this.latency+=this.elapsed-r.started;}
    }
    this.requests=this.requests.filter(r=>r.phase!=='done'&&!(r.phase==='failed'&&r.age>.7));
  }
  get inflight(){return this.requests.filter(r=>r.phase!=='failed').length;}
}
