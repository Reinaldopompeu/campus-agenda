import type {Data,Aula} from './schedule';
import {countClassPeriods,requiredClassPeriods,dailyPeriods} from './periods';
export type WorkloadAssignment={key:string;disciplina:string;codigo:string;turma:string;hours:number|null;weekly:number;minutes:number;complete:boolean;groupWeekly:number;expected:number|null};
export function teacherWorkloads(data:Data,semesterId:number){
 const lessons=data.aulas.filter(a=>a.semestre_id===semesterId);
 const groups=new Map<string,Aula[]>();
 for(const a of lessons){const key=`${a.disciplina_id}:${a.turma_id}:${a.semestre_curso??""}:${a.turma_id===null?a.docente_id:""}`;groups.set(key,[...(groups.get(key)||[]),a]);}
 return data.docentes.map(teacher=>{
 const assignments:WorkloadAssignment[]=[];
 for(const [key,rows] of groups){const own=rows.filter(a=>a.docente_id===teacher.id);if(!own.length)continue;
 const subject=data.disciplinas.find(d=>d.id===rows[0].disciplina_id);
 const weekly=own.reduce((n,a)=>n+countClassPeriods(a.hora_inicio,a.hora_fim),0);
 const groupWeekly=rows.reduce((n,a)=>n+countClassPeriods(a.hora_inicio,a.hora_fim),0);
 const expected=requiredClassPeriods(subject?.carga_horaria);
 const minutes=own.reduce((sum,a)=>sum+a.hora_fim-a.hora_inicio-dailyPeriods.filter(p=>p.break).reduce((n,p)=>n+Math.max(0,Math.min(p.end,a.hora_fim)-Math.max(p.start,a.hora_inicio)),0),0);
 const hours=subject?.carga_horaria&&groupWeekly>0?subject.carga_horaria*weekly/(expected||groupWeekly):null;
 assignments.push({key,disciplina:subject?.nome||rows[0].disciplina,codigo:subject?.codigo||'',turma:rows[0].turma,hours,weekly,minutes,complete:expected===null||groupWeekly===expected,groupWeekly,expected});
 }
 return {teacher,assignments,weekly:assignments.reduce((s,a)=>s+a.weekly,0),minutes:assignments.reduce((s,a)=>s+a.minutes,0),hours:assignments.reduce((s,a)=>s+(a.hours||0),0),missing:assignments.some(a=>a.hours===null),pending:assignments.some(a=>!a.complete)};
 }).sort((a,b)=>a.teacher.nome.localeCompare(b.teacher.nome,'pt-BR'));
}

