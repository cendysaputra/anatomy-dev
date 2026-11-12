export const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>v*v*(3-2*v);
// Exploded view: a clean stack. The bottom case stays put; every layer above it rises by one
// step and slides one step left, so the layers fan out in order from bottom to top.
const STEP=[-22,0,34];
const at=n=>STEP.map(v=>v*n);
export const layers={
 tray:{offset:at(0),start:.3,end:.9},
 cable:{offset:at(0),start:.3,end:.9},
 foam:{offset:at(1),start:.25,end:.85},
 pcb:{offset:at(2),start:.2,end:.8},
 plate:{offset:at(3),start:.15,end:.75},
 switches:{offset:at(4),start:.1,end:.7},
 bezel:{offset:at(5),start:.05,end:.65},
 screws:{offset:at(5),start:.05,end:.65},
 caps:{offset:at(6.3),start:0,end:.6},
};
export function displacement(name,progress){const{offset,start,end}=layers[name];const t=smooth(clamp((progress-start)/(end-start)));return offset.map(v=>v*t)}
