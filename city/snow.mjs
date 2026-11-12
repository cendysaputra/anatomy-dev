import {onFrame} from './frames.mjs';
// Snowfall drawn on its own canvas above the map, so it never repaints the city SVG.
export function snow(stage){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const canvas=document.createElement('canvas');canvas.className='city-snow';canvas.setAttribute('aria-hidden','true');
  stage.append(canvas);
  const ctx=canvas.getContext('2d');if(!ctx)return;
  let w=0,h=0,dpr=1,flakes=[],sprites=[],time=0;
  // Every so often a gust sweeps through: the snow is carried sideways and a few faint
  // streaks of wind race across the screen.
  let gustAt=3+Math.random()*4,gustStart=0,gustFor=0,gustWay=1,streaks=[];
  function startGust(way){
    gustStart=time;gustFor=2.4+Math.random()*1.4;gustWay=way;gustAt=time+gustFor+5+Math.random()*7;
    streaks=Array.from({length:9},()=>({x:way>0?-200:w+200,y:Math.random()*h,delay:Math.random()*gustFor*.55,speed:520+Math.random()*380,
      length:90+Math.random()*130,bend:5+Math.random()*9,phase:Math.random()*6}));
  }
  // Three depths of flake: small, faint and slow far away; large, bright and fast up close.
  // Each is drawn once as a soft dot (white core fading to a pale blue haze against the night)
  // and then stamped as an image, which is far cheaper than filling circles.
  const DEPTHS=[{radius:1.7,alpha:.6},{radius:2.7,alpha:.82},{radius:4.2,alpha:1}];
  function sprite({radius,alpha}){
    const half=radius+1,image=document.createElement('canvas');image.width=image.height=Math.ceil(half*2*dpr);
    const g=image.getContext('2d');g.scale(dpr,dpr);
    const glow=g.createRadialGradient(half,half,0,half,half,radius);
    glow.addColorStop(0,'rgba(255,255,255,1)');glow.addColorStop(.42,'rgba(255,255,255,.96)');
    glow.addColorStop(.72,'rgba(214,228,246,.5)');glow.addColorStop(1,'rgba(214,228,246,0)');
    g.globalAlpha=alpha;g.fillStyle=glow;g.beginPath();g.arc(half,half,radius,0,Math.PI*2);g.fill();
    return {image,radius,half};
  }
  // near: 0 (far) to 1 (close). Far flakes outnumber near ones, as they do in real snowfall.
  function make(y){
    const near=Math.pow(Math.random(),1.7);
    return {x:Math.random()*(w+80)-40,y:y??Math.random()*h,near,r:1+near*3.2,fall:16+near*38+Math.random()*8,
      phase:Math.random()*Math.PI*2,rate:.7+Math.random()*1.1,sway:3+near*9+Math.random()*4,level:near<.3?0:near<.68?1:2};
  }
  function size(){
    const next=Math.min(1.5,devicePixelRatio||1);
    if(next!==dpr||!sprites.length){dpr=next;sprites=DEPTHS.map(sprite);}
    w=stage.clientWidth;h=stage.clientHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.round(Math.min(260,w*h/7000));
    while(flakes.length<count)flakes.push(make());flakes.length=count;
  }
  function draw(dt){
    dt=Math.min(dt,.1);time+=dt;
    // A breeze that slowly swells, fades and turns, carrying near flakes further than far ones.
    const breeze=7+Math.sin(time*.11)*13+Math.sin(time*.37+2)*7;
    if(time>=gustAt)startGust(breeze>=0?1:-1);
    // The gust swells and dies away smoothly.
    const gust=time<gustStart+gustFor?Math.sin((time-gustStart)/gustFor*Math.PI):0;
    const wind=breeze+gustWay*gust*110;
    ctx.clearRect(0,0,w,h);
    for(const f of flakes){
      f.phase+=dt*f.rate;
      // Flakes flutter: they sink a little slower at the ends of each sideways swing.
      f.y+=f.fall*(1-.22*Math.abs(Math.sin(f.phase)))*dt;
      f.x+=wind*(.35+f.near)*dt;
      if(f.y>h+6)Object.assign(f,make(-6));
      if(f.x>w+40)f.x-=w+80;else if(f.x<-40)f.x+=w+80;
      const s=sprites[f.level],half=s.half*f.r/s.radius;
      ctx.drawImage(s.image,f.x+Math.sin(f.phase)*f.sway-half,f.y-half,half*2,half*2);
    }
    if(gust>0){
      // All streaks share one path and one stroke.
      ctx.beginPath();
      for(const streak of streaks){
        if(time-gustStart<streak.delay)continue;
        streak.x+=gustWay*streak.speed*dt;
        const tail=streak.x-gustWay*streak.length,lift=Math.sin(streak.phase+time*2.5)*streak.bend;
        ctx.moveTo(streak.x,streak.y);ctx.quadraticCurveTo((streak.x+tail)/2,streak.y+lift,tail,streak.y+lift*.3);
      }
      ctx.lineWidth=1.4;ctx.lineCap='round';ctx.strokeStyle='rgba(226,236,252,'+(gust*.45).toFixed(3)+')';ctx.stroke();
    }
  }
  new ResizeObserver(size).observe(stage);size();
  reduced.addEventListener('change',()=>{if(reduced.matches)ctx.clearRect(0,0,w,h);});
  // 30 frames a second, in step with the cars, keeps the whole page light.
  onFrame(draw,30);
}
