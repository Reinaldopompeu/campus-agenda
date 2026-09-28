import { z } from 'zod';
import { kinds, emptyData, normalize, conflicts, sameAssignment, type Data, type Aula, type Kind, type Entity } from './schedule';
import { requiredClassPeriods, countClassPeriods, validClassTimes, periodsForShift } from './periods';

export const newData = (): Data => structuredClone(emptyData);
const id = z.number().int().positive();
const entitySchema = z.object({ id, nome: z.string().trim().min(1).max(100), codigo: z.string().max(40).nullable().optional(), carga_horaria: z.number().int().positive().max(10000).nullable().optional(), semestre_curso: z.number().int().min(1).max(20).nullable().optional() });
const lessonSchema = z.object({ id: id.optional(), docente_id: id, disciplina_id: id, turma_id: id.nullable().default(null), sala_id: id, semestre_id: id, semestre_curso: z.number().int().min(1).max(20), turno: z.enum(['Manhã','Tarde','Noite']), dia_semana: z.number().int().min(1).max(6), hora_inicio: z.number().int(), hora_fim: z.number().int() });
const backupLessonSchema = lessonSchema.extend({id, semestre_curso: z.number().int().min(1).max(20).nullable().optional()});
export class LocalError extends Error {
  status: number;
  details: object;
  constructor(message: string, status = 400, details = {}) { super(message); this.status = status; this.details = details; }
}
function requireValue(value: unknown, message: string): asserts value { if (!value) throw new LocalError(message); }
const nextId = (rows: {id:number}[]) => Math.max(0, ...rows.map(row => row.id)) + 1;
const links = [['docentes','docente_id','docente'],['disciplinas','disciplina_id','disciplina'],['turmas','turma_id','turma'],['salas','sala_id','sala'],['semestres','semestre_id','semestre']] as const;
export function joined(data: Data): Data {
  return { ...data, aulas: data.aulas.map(a => {
    const row = {...a};
    for (const [kind, key, label] of links) row[label] = data[kind].find(e => e.id === a[key])?.nome ?? (kind === 'turmas' ? 'Sem turma' : '');
    return row;
  }) };
}
function relations(data: Data, a: Partial<Aula>) {
  for (const [kind,key] of links) {
    if (kind === 'turmas' && a.turma_id == null) continue;
    requireValue(data[kind].some(e => e.id === a[key]), 'Um cadastro selecionado não existe mais. Atualize a agenda.');
  }
}
function validLesson(data: Data, a: Partial<Aula>) {
  relations(data,a);
  requireValue(validClassTimes(a.hora_inicio!,a.hora_fim!), 'Selecione horários da grade.');
  const periods = periodsForShift(a.turno!);
  requireValue(a.hora_inicio! >= periods[0].start && a.hora_fim! <= periods.at(-1)!.end, 'Os horários devem pertencer ao turno selecionado.');
}
function checkConflict(a: Aula, all: Aula[]) {
  const found = conflicts(a,all);
  if (found.length) throw new LocalError('Conflito de horário. Revise docente, sala e turma.',409,{conflicts:found});
}
export function applyAction(data: Data, raw: unknown) {
  const body = z.record(z.unknown()).parse(raw);
  if (body.action === 'save_entity') {
    const kind = z.enum(kinds).parse(body.kind);
    const key = body.id === undefined ? undefined : id.parse(body.id);
    const nome = z.string().trim().min(1).max(100).parse(body.nome).replace(/\s+/g,' ');
    if (kind === 'semestres') requireValue(/^\d{4}\.[123]$/.test(nome), 'Use o formato 2026.1, 2026.2 ou 2026.3.');
    requireValue(!data[kind].some(e => e.id !== key && normalize(e.nome) === normalize(nome)), 'Já existe um cadastro com este nome.');
    const old = data[kind].find(e => e.id === key);
    if (key) requireValue(old,'Cadastro não encontrado.');
    const item: Entity = {id:key ?? nextId(data[kind]),nome};
    if (kind === 'disciplinas') {
      item.codigo = z.string().trim().min(1).max(40).parse(body.codigo);
      item.carga_horaria = z.number().int().positive().max(10000).parse(body.carga_horaria);
      requireValue(!old || old.carga_horaria === item.carga_horaria || !data.aulas.some(a => a.disciplina_id === key), 'Remova a distribuição antes de alterar a carga horária.');
    }
    if (kind === 'turmas') item.semestre_curso = z.number().int().min(1).max(20).nullable().optional().parse(body.semestre_curso) ?? null;
    data[kind] = [...data[kind].filter(e => e.id !== key),item].sort((a,b) => a.nome.localeCompare(b.nome,'pt-BR'));
    return {ok:true,id:item.id};
  }
  if (body.action === 'delete_entity') {
    const kind = z.enum(kinds).parse(body.kind), key = id.parse(body.id);
    const field = links.find(([k]) => k === kind)![1];
    requireValue(!data.aulas.some(a => a[field] === key),'Este cadastro está vinculado a aulas. Edite ou exclua essas aulas primeiro.');
    data[kind] = data[kind].filter(e => e.id !== key);
    return {ok:true};
  }
  if (body.action === 'save_weekly') {
    const v = z.object({disciplina_id:id,turma_id:id.nullable().default(null),semestre_id:id,semestre_curso:z.number().int().min(1).max(20),original_docente_id:id.optional(),original_semestre_curso:z.number().int().min(1).max(20).nullable().optional(),slots:z.array(z.record(z.unknown())).min(1).max(6)}).parse(body.data);
    const subject = data.disciplinas.find(d => d.id === v.disciplina_id);
    const required = requiredClassPeriods(subject?.carga_horaria);
    requireValue(required,'Esta distribuição é para disciplinas de 60 ou 90 horas.');
    const slots = v.slots.map(s => lessonSchema.parse({...s,disciplina_id:v.disciplina_id,turma_id:v.turma_id,semestre_id:v.semestre_id,semestre_curso:v.semestre_curso}));
    slots.forEach(s => validLesson(data,s));
    const total = slots.reduce((n,s) => n+countClassPeriods(s.hora_inicio,s.hora_fim),0);
    requireValue(total === required, `Esta disciplina exige exatamente ${required} aulas semanais. Você informou ${total}. Intervalos não contam.`);
    const original = {...slots[0], docente_id:v.original_docente_id ?? slots[0].docente_id, semestre_curso:v.original_semestre_curso === undefined ? v.semestre_curso : v.original_semestre_curso};
    const remaining = data.aulas.filter(a => !sameAssignment(a,original));
    let key = nextId(data.aulas);
    const proposed = slots.map(s => ({...s,id:key++}) as Aula);
    const all = joined({...data,aulas:[...remaining,...proposed]}).aulas;
    proposed.forEach(a => checkConflict(a,all));
    data.aulas = [...remaining,...proposed];
    return {ok:true,total};
  }
  if (body.action === 'save_aula') {
    const v = lessonSchema.parse(body.data);
    validLesson(data,v);
    const old = data.aulas.find(a => a.id === v.id);
    if (v.id) requireValue(old,'Esta aula não existe mais.');
    for (const key of [v.disciplina_id,old?.disciplina_id]) requireValue(!requiredClassPeriods(data.disciplinas.find(d => d.id === key)?.carga_horaria),'Salve a distribuição semanal completa desta disciplina.');
    const aula = {...v,id:v.id ?? nextId(data.aulas)} as Aula;
    checkConflict(aula,joined(data).aulas);
    data.aulas = [...data.aulas.filter(a => a.id !== aula.id),aula];
    return {ok:true,id:aula.id};
  }
  if (body.action === 'delete_aula' || body.action === 'delete_weekly') {
    const target = data.aulas.find(a => a.id === id.parse(body.id));
    requireValue(target,'Aula não encontrada.');
    if (body.action === 'delete_weekly') data.aulas = data.aulas.filter(a => !sameAssignment(a,target));
    else {
      requireValue(!requiredClassPeriods(data.disciplinas.find(d => d.id === target.disciplina_id)?.carga_horaria),'Exclua a distribuição semanal completa.');
      data.aulas = data.aulas.filter(a => a.id !== target.id);
    }
    return {ok:true};
  }
  throw new LocalError('Operação inválida.');
}
export function parseBackup(raw: unknown): Data {
  const envelope = z.object({format:z.literal('campus-local'),version:z.literal(1),data:z.object({docentes:z.array(entitySchema).max(10000),disciplinas:z.array(entitySchema).max(10000),turmas:z.array(entitySchema).max(10000),salas:z.array(entitySchema).max(10000),semestres:z.array(entitySchema).max(10000),aulas:z.array(backupLessonSchema).max(50000)})}).parse(raw);
  const data = envelope.data as Data;
  for (const kind of [...kinds,'aulas'] as const) requireValue(new Set(data[kind].map(e => e.id)).size === data[kind].length,'Backup com identificadores duplicados.');
  for (const kind of kinds) requireValue(new Set(data[kind].map(e => normalize(e.nome))).size === data[kind].length,'Backup com cadastros duplicados.');
  data.semestres.forEach(e => requireValue(/^\d{4}\.[123]$/.test(e.nome),'Semestre inválido no backup.'));
  data.aulas.forEach(a => { relations(data,a); requireValue(a.hora_inicio >= 420 && a.hora_fim <= 1320 && a.hora_fim > a.hora_inicio,'Horário inválido no backup.'); });
  // Older schedules can have incomplete workloads; preserve them for correction in the agenda.
  return joined(data);
}
export function makeBackup(data: Data) { return {format:'campus-local',version:1,exportedAt:new Date().toISOString(),data:joined(data)}; }
