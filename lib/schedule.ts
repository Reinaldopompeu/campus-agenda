export const kinds=["docentes","disciplinas","turmas","salas","semestres"] as const;
export type Kind=typeof kinds[number];
export type Entity={id:number;nome:string;codigo?:string|null;carga_horaria?:number|null;semestre_curso?:number|null};
export type Aula={semestre_curso?:number|null;id:number;docente_id:number;disciplina_id:number;turma_id:number|null;sala_id:number;semestre_id:number;turno:string;dia_semana:number;hora_inicio:number;hora_fim:number;docente:string;disciplina:string;turma:string;sala:string;semestre:string};
export type Data={aulas:Aula[]}&Record<Kind,Entity[]>;
export type Conflict={aula:Aula;tipos:string[]};
export const emptyData:Data={aulas:[],docentes:[],disciplinas:[],turmas:[],salas:[],semestres:[]};
export const days=["Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
export const labels:Record<Kind,string>={docentes:"Docentes",disciplinas:"Disciplinas",turmas:"Turmas",salas:"Salas",semestres:"Semestres"};
export function time(n:number){return `${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`}
export function minutes(s:string){const [h,m]=s.split(":").map(Number);return h*60+m}
export function conflicts(candidate:Partial<Aula>,all:Aula[]):Conflict[]{return all.filter(a=>a.id!==candidate.id&&a.semestre_id===candidate.semestre_id&&a.dia_semana===candidate.dia_semana&&candidate.hora_inicio!<a.hora_fim&&candidate.hora_fim!>a.hora_inicio).flatMap(a=>{const tipos=[];if(a.docente_id===candidate.docente_id)tipos.push("Docente");if(a.sala_id===candidate.sala_id)tipos.push("Sala");if(candidate.turma_id!=null&&a.turma_id===candidate.turma_id)tipos.push("Turma");return tipos.length?[{aula:a,tipos}]:[]})}
export function normalize(s:string){return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR")}
// Lay out each connected overlap group in side-by-side lanes.
export function layoutDay(items:Aula[]){const sorted=[...items].sort((a,b)=>a.hora_inicio-b.hora_inicio||a.hora_fim-b.hora_fim);const result:{aula:Aula;lane:number;lanes:number}[]=[];let group:typeof result=[];let ends:number[]=[];let maxEnd=0;const flush=()=>{group.forEach(x=>result.push({...x,lanes:ends.length}));group=[];ends=[]};for(const aula of sorted){if(aula.hora_inicio>=maxEnd&&group.length)flush();let lane=ends.findIndex(end=>end<=aula.hora_inicio);if(lane<0)lane=ends.length;ends[lane]=aula.hora_fim;group.push({aula,lane,lanes:1});maxEnd=Math.max(aula.hora_fim,group.length===1?aula.hora_fim:maxEnd)}flush();return result}

export function shiftLabel(value:string){return ({'Manhã':'Matutino','Tarde':'Vespertino','Noite':'Noturno'} as Record<string,string>)[value]||value}

export function sameAssignment(a:Pick<Aula,'disciplina_id'|'turma_id'|'semestre_id'|'docente_id'|'semestre_curso'>,b:Pick<Aula,'disciplina_id'|'turma_id'|'semestre_id'|'docente_id'|'semestre_curso'>){return (a.semestre_curso??null)===(b.semestre_curso??null)&&a.disciplina_id===b.disciplina_id&&a.semestre_id===b.semestre_id&&a.turma_id===b.turma_id&&(a.turma_id!==null||a.docente_id===b.docente_id)}
