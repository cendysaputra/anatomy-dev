// One requestAnimationFrame loop for everything that animates, so cars and snow land on the same
// display frame instead of waking the compositor on alternating ones. It stops while the tab is
// hidden, the stage is off-screen, or the device asks for reduced motion.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// At most 60 drawn frames a second: frames closer together than this are skipped, so 60 Hz screens
// draw every refresh and faster ones every second or third. The gap sits clear of any refresh
// interval, so timestamp jitter can never drop a frame and make the motion stutter.
const MIN_GAP=14;
const steps=[];
let frame=0,last=0,onscreen=true;
const paused=()=>document.hidden||!onscreen||reduced.matches;
function tick(now){
  frame=0;
  if(paused()){last=0;return;}
  frame=requestAnimationFrame(tick);
  if(last&&now-last<MIN_GAP)return;
  const dt=last?(now-last)/1000:0;last=now;
  for(const step of steps)step(dt);
}
function run(){if(!frame&&!paused()){last=0;frame=requestAnimationFrame(tick);}}
// step(dt) receives the seconds since the previous drawn frame (0 on the first one after a pause).
export function onFrame(step){steps.push(step);run();}
export function pauseOffscreen(element){
  new IntersectionObserver(entries=>{onscreen=entries.at(-1).isIntersecting;run();},{rootMargin:'150px'}).observe(element);
}
document.addEventListener('visibilitychange',run);
reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);frame=0;last=0;}else run();});
