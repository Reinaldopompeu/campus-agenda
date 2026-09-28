import type {Aula} from './schedule';
export type Period={start:number;end:number;break?:boolean};
export const morningPeriods:Period[]=[{start:450,end:500},{start:500,end:550},{start:550,end:560,break:true},{start:560,end:610},{start:610,end:660},{start:660,end:670,break:true},{start:670,end:720},{start:720,end:770}];
export const dailyPeriods:Period[]=[...morningPeriods,
 {start:770,end:780,break:true},
 {start:780,end:830},{start:830,end:880},{start:880,end:890,break:true},
 {start:890,end:940},{start:940,end:990},{start:990,end:1000,break:true},
 {start:1000,end:1050},{start:1050,end:1100},{start:1100,end:1110,break:true},
 {start:1110,end:1160},{start:1160,end:1210},{start:1210,end:1260},{start:1260,end:1310}];
// Preserve visibility of older records outside the current institutional timetable.
export function schedulePeriods(aulas:Pick<Aula,'hora_inicio'|'hora_fim'>[]):Period[]{
 const points=[420,450,1310,1320,...aulas.flatMap(a=>[a.hora_inicio,a.hora_fim])].sort((a,b)=>a-b).filter((v,i,a)=>i===0||v!==a[i-1]);
 const extra:Period[]=[];
 for(let i=0;i<points.length-1;i++){const start=points[i],end=points[i+1];if((end<=450||start>=1310)&&aulas.some(a=>a.hora_inicio<end&&a.hora_fim>start))extra.push({start,end});}
 return [...dailyPeriods,...extra].sort((a,b)=>a.start-b.start);
}
export const classStartTimes=dailyPeriods.filter(p=>!p.break).map(p=>p.start);
export const classEndTimes=dailyPeriods.filter(p=>!p.break).map(p=>p.end);
export function validClassTimes(start:number,end:number){return classStartTimes.includes(start)&&classEndTimes.includes(end)&&end>start;}
// Fixed breaks do not count towards weekly teaching periods.
export function countClassPeriods(start:number,end:number){return dailyPeriods.filter(p=>!p.break&&p.start>=start&&p.end<=end).length;}
export function requiredClassPeriods(hours:number|null|undefined){return hours===60?4:hours===90?6:null;}

export function periodsForShift(shift:string):Period[]{
 const bounds:Record<string,[number,number]>={'Manhã':[450,770],'Tarde':[780,1100],'Noite':[1110,1310]};
 const range=bounds[shift];
 return range?dailyPeriods.filter(p=>p.start>=range[0]&&p.end<=range[1]):dailyPeriods;
}
