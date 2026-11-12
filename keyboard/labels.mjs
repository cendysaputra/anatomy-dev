import {clamp,layers} from './motion.mjs';
// Anchor points are in the same world coordinates as the component geometry.
export const labels=[
 {id:'keycaps',layer:'caps',text:'Keycap',at:[130,37,22],side:'right'},
 {id:'switches',layer:'switches',text:'Switch',at:[136,31,17],side:'right'},
 {id:'stabilizers',layer:'switches',text:'Stabilizer',at:[-74,32,14],side:'left'},
 {id:'plate',layer:'plate',text:'Plate',at:[148,39,12.8],side:'right'},
 {id:'pcb',layer:'pcb',text:'PCB',at:[148,39,8.6],side:'right'},
 {id:'foam',layer:'foam',text:'Foam peredam',at:[-148,39,5.5],side:'left'},
 {id:'tray',layer:'tray',text:'Casing bawah',at:[156,48,12],side:'right'},
 {id:'bezel',layer:'bezel',text:'Frame atas',at:[-156,47,13],side:'left'},
 {id:'screws',layer:'screws',text:'Sekrup',at:[-154,46,14],side:'left'},
 {id:'cable',layer:'cable',text:'Kabel USB',at:[115,-96,8],side:'right'},
];
export function labelOpacity(layer,progress){return clamp((progress-layers[layer].start-.12)/.24)}
// Keep leaders close to their anchors while maintaining readable spacing.
export function arrangeLabels(items,height,gap=30,pad=24){
 const sorted=items.map(x=>({...x})).sort((a,b)=>a.y-b.y);
 for(let i=0;i<sorted.length;i++)sorted[i].y=Math.max(pad,sorted[i].y,i?sorted[i-1].y+gap:pad);
 for(let i=sorted.length-1;i>=0;i--)sorted[i].y=Math.min(height-pad,sorted[i].y,i<sorted.length-1?sorted[i+1].y-gap:height-pad);
 return sorted;
}
