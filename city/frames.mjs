// One requestAnimationFrame loop for everything that animates, so cars and snow land on the same
// display frames instead of waking the compositor on alternating ones. It stops while the tab is
// hidden, the stage is off-screen, or the device asks for reduced motion.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
// Each subscriber has its own pace: frames closer together than its gap are skipped. The default
// allows at most 60 drawn frames a second (60 Hz screens draw every refresh, faster ones every
// second or third). Gaps sit clear of any refresh interval, so timestamp jitter can never drop a
// frame and make the motion stutter.
const MIN_GAP=14;
const steps=[];
let frame=0,onscreen=true;
const paused=()=>document.hidden||!onscreen||reduced.matches;
const rest=()=>{for(const entry of steps)entry.last=0;};
let timer=0;
function tick(now){
  frame=0;
  if(paused()){rest();return;}
  let wait=Infinity;
  for(const entry of steps){
    if(!entry.last||now-entry.last>=entry.gap){
      const dt=entry.last?(now-entry.last)/1000:0;entry.last=now;
      entry.step(dt);
    }
    wait=Math.min(wait,entry.last+entry.gap-now);
  }
  // When nothing is due for a while, sleep through the refreshes in between instead of waking
  // the page on every one, then pick up the animation frame just before the next step is due.
  if(wait>16)timer=setTimeout(()=>{timer=0;if(!frame&&!paused())frame=requestAnimationFrame(tick);},wait-12);
  else frame=requestAnimationFrame(tick);
}
function run(){if(!frame&&!timer&&!paused()){rest();frame=requestAnimationFrame(tick);}}
// step(dt) receives the seconds since its previous drawn frame (0 on the first one after a pause).
// gap is the shortest time between two of its frames, in milliseconds.
export function onFrame(step,gap=MIN_GAP){steps.push({step,gap,last:0});run();}
export function pauseOffscreen(element){
  new IntersectionObserver(entries=>{onscreen=entries.at(-1).isIntersecting;run();},{rootMargin:'150px'}).observe(element);
}
document.addEventListener('visibilitychange',run);
reduced.addEventListener('change',()=>{if(reduced.matches){cancelAnimationFrame(frame);clearTimeout(timer);frame=0;timer=0;rest();}else run();});
