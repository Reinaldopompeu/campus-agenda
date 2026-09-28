import {z} from 'zod';
import {database} from '@/db/connection';
import {countClassPeriods,requiredClassPeriods,validClassTimes} from '@/lib/periods';
import {conflicts,type Aula} from '@/lib/schedule';
const key=z.number().int().positive();
const schema=z.object({disciplina_id:key,turma_id:key.nullable().default(null),original_docente_id:key.optional(),semestre_id:key,semestre_curso:z.number().int().min(1).max(20),original_semestre_curso:z.number().int().min(1).max(20).nullable().optional(),slots:z.array(z.object({docente_id:key,sala_id:key,turno:z.enum(['Manhã','Tarde','Noite']),dia_semana:z.number().int().min(1).max(6),hora_inicio:z.number().int(),hora_fim:z.number().int()})).min(1).max(6)});
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function saveWeekly(input:unknown){
 const parsed=schema.safeParse(input);if(!parsed.success)return reply({error:'Preencha todos os dados da distribuição semanal.'},400);
 const v=parsed.data,db=database();const subject=await db.prepare('SELECT carga_horaria FROM disciplinas WHERE id=?').bind(v.disciplina_id).first<{carga_horaria:number|null}>();
 if(!subject)return reply({error:'Disciplina não encontrada.'},404);
 const required=requiredClassPeriods(subject.carga_horaria);if(!required)return reply({error:'Esta distribuição é para disciplinas de 60 ou 90 horas.'},400);
 if(v.slots.some(s=>!validClassTimes(s.hora_inicio,s.hora_fim)))return reply({error:'Use somente os horários da grade.'},400);
 const total=v.slots.reduce((n,s)=>n+countClassPeriods(s.hora_inicio,s.hora_fim),0);
 if(total!==required)return reply({error:`Disciplina de ${subject.carga_horaria} horas exige exatamente ${required} aulas semanais. Você informou ${total}. Intervalos não contam.`},400);
 const all=(await db.prepare(`SELECT a.*,d.nome docente,p.nome disciplina,COALESCE(t.nome,'Sem turma') turma,s.nome sala,e.nome semestre FROM aulas a JOIN docentes d ON d.id=a.docente_id JOIN disciplinas p ON p.id=a.disciplina_id LEFT JOIN turmas t ON t.id=a.turma_id JOIN salas s ON s.id=a.sala_id JOIN semestres e ON e.id=a.semestre_id WHERE a.semestre_id=?`).bind(v.semestre_id).all<Aula>()).results;
 const owner=v.original_docente_id||v.slots[0].docente_id;
 const originalSemester=v.original_semestre_curso===undefined?v.semestre_curso:v.original_semestre_curso;
 const external=all.filter(a=>!((a.semestre_curso??null)===originalSemester&&a.disciplina_id===v.disciplina_id&&a.turma_id===v.turma_id&&(v.turma_id!==null||a.docente_id===owner)));
 const proposed=v.slots.map((s,i)=>({...s,id:-(i+1),disciplina_id:v.disciplina_id,turma_id:v.turma_id,semestre_id:v.semestre_id,semestre_curso:v.semestre_curso,docente:'Docente selecionado',disciplina:'Horário desta distribuição',turma:'Turma selecionada',sala:'Sala selecionada',semestre:''}));
 const found=proposed.flatMap(s=>conflicts(s,[...external,...proposed]));if(found.length)return reply({error:'Existem horários sobrepostos. Revise os dias, docentes, salas e turmas.',conflicts:found},409);
 // D1 executes the replacement as one transaction. A conflict rolls back the entire schedule.
 const statements=[db.prepare('DELETE FROM aulas WHERE disciplina_id=? AND turma_id IS ? AND semestre_id=? AND (? IS NOT NULL OR docente_id=?) AND semestre_curso IS ?').bind(v.disciplina_id,v.turma_id,v.semestre_id,v.turma_id,owner,originalSemester),...v.slots.map(s=>db.prepare('INSERT INTO aulas(docente_id,disciplina_id,turma_id,sala_id,semestre_id,turno,dia_semana,hora_inicio,hora_fim,semestre_curso) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(s.docente_id,v.disciplina_id,v.turma_id,s.sala_id,v.semestre_id,s.turno,s.dia_semana,s.hora_inicio,s.hora_fim,v.semestre_curso))];
 try{await db.batch(statements);return reply({ok:true,total})}catch(e){if(String(e).includes('SCHEDULE_CONFLICT'))return reply({error:'Outro cadastro ocupou um dos horários. A distribuição anterior foi preservada; revise e tente novamente.'},409);throw e}
}
