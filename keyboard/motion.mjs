export const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>v*v*(3-2*v);
export const layers={
 caps:{offset:[0,0,96],start:0,end:.7},
 switches:{offset:[0,0,58],start:.1,end:.8},
 plate:{offset:[-12,0,27],start:.18,end:.85},
 pcb:{offset:[20,0,-4],start:.23,end:.88},
 foam:{offset:[-20,-8,-30],start:.3,end:.95},
 tray:{offset:[0,8,-58],start:.2,end:1},
 bezel:{offset:[-72,12,23],start:.12,end:.9},
 screws:{offset:[-22,12,54],start:0,end:.5},
 cable:{offset:[0,-28,6],start:.25,end:.8},
};
export function displacement(name,progress){const{offset,start,end}=layers[name];const t=smooth(clamp((progress-start)/(end-start)));return offset.map(v=>v*t)}
