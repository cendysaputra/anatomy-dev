// Closed, tangent-continuous road loops. Cars keep to the right-hand lane.
// BLOCKS × BLOCKS city blocks, 96 units apart, centred on the origin.
export const BLOCKS=7;
export const GRID=Array.from({length:BLOCKS+1},(_,i)=>(i-BLOCKS/2)*96);
export function roundedLoop(left,top,right,bottom,radius=8){
  const width=right-left,height=bottom-top;
  if(width<=2*radius||height<=2*radius||radius<=0)throw new Error('Invalid road loop');
  const parts=[];
  const line=(x1,y1,x2,y2)=>parts.push({kind:'line',x1,y1,x2,y2,length:Math.hypot(x2-x1,y2-y1)});
  const arc=(cx,cy,start)=>parts.push({kind:'arc',cx,cy,start,radius,length:Math.PI*radius/2});
  line(left+radius,top,right-radius,top);arc(right-radius,top+radius,-Math.PI/2);
  line(right,top+radius,right,bottom-radius);arc(right-radius,bottom-radius,0);
  line(right-radius,bottom,left+radius,bottom);arc(left+radius,bottom-radius,Math.PI/2);
  line(left,bottom-radius,left,top+radius);arc(left+radius,top+radius,Math.PI);
  const length=parts.reduce((n,p)=>n+p.length,0);
  return {parts,length};
}
export function sample(loop,distance){
  let d=((distance%loop.length)+loop.length)%loop.length;
  for(const p of loop.parts){
    if(d>p.length){d-=p.length;continue;}
    const t=d/p.length;
    if(p.kind==='line')return {x:p.x1+(p.x2-p.x1)*t,y:p.y1+(p.y2-p.y1)*t,angle:Math.atan2(p.y2-p.y1,p.x2-p.x1)};
    const a=p.start+t*Math.PI/2;return {x:p.cx+Math.cos(a)*p.radius,y:p.cy+Math.sin(a)*p.radius,angle:a+Math.PI/2};
  }
  const p=loop.parts[0];return {x:p.x1,y:p.y1,angle:0};
}
export function cityTraffic(){
  const loops=[],cars=[];
  for(let row=0;row<BLOCKS;row++)for(let col=0;col<BLOCKS;col++){
    const loop=roundedLoop(GRID[col]+4.5,GRID[row]+4.5,GRID[col+1]-4.5,GRID[row+1]-4.5);
    const index=loops.push(loop)-1,speed=11+(index*7%6);
    // Light traffic: one car on every other block loop.
    if(index%2===0)cars.push({loop:index,speed,offset:loop.length*((index*.137)%1),color:index%5});
  }
  return {loops,cars};
}
