// ANSI full-size layout in key units. Keycaps intentionally have no legends.
export const keys=[];
const add=(x,y,w=1,h=1)=>keys.push({x:-147+x*12,y:-39+y*12,w:w*12-2,d:h*12-2});
add(0,0);for(const start of [2,6.5,11])for(let i=0;i<4;i++)add(start+i,0);
for(let i=0;i<3;i++)add(16+i,0);
for(let i=0;i<13;i++)add(i,1.5);add(13,1.5,2);
add(0,2.5,1.5);for(let i=0;i<12;i++)add(1.5+i,2.5);add(13.5,2.5,1.5);
add(0,3.5,1.75);for(let i=0;i<11;i++)add(1.75+i,3.5);add(12.75,3.5,2.25);
add(0,4.5,2.25);for(let i=0;i<10;i++)add(2.25+i,4.5);add(12.25,4.5,2.75);
for(const x of [0,1.25,2.5,10,11.25,12.5,13.75])add(x,5.5,1.25);add(3.75,5.5,6.25);
for(const y of [1.5,2.5])for(let i=0;i<3;i++)add(16+i,y);
add(17,4.5);for(let i=0;i<3;i++)add(16+i,5.5);
for(let i=0;i<4;i++)add(20.5+i,1.5);
for(const y of [2.5,3.5,4.5])for(let i=0;i<3;i++)add(20.5+i,y);
add(23.5,2.5,1,2);add(23.5,4.5,1,2);add(20.5,5.5,2);add(22.5,5.5);
export const body={x:-158,y:-50,w:316,d:100,r:4};
