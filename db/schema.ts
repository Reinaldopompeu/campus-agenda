import {sql} from "drizzle-orm";
import {sqliteTable,integer,text,index,check} from "drizzle-orm/sqlite-core";
export const docentes=sqliteTable("docentes",{id:integer("id").primaryKey({autoIncrement:true}),nome:text("nome").notNull().unique(),chave:text("chave").notNull().default("").unique()});
export const disciplinas=sqliteTable("disciplinas",{codigo:text("codigo"),carga_horaria:integer("carga_horaria"),id:integer("id").primaryKey({autoIncrement:true}),nome:text("nome").notNull().unique(),chave:text("chave").notNull().default("").unique()});
export const turmas=sqliteTable("turmas",{semestre_curso:integer("semestre_curso"),id:integer("id").primaryKey({autoIncrement:true}),nome:text("nome").notNull().unique(),chave:text("chave").notNull().default("").unique()});
export const salas=sqliteTable("salas",{id:integer("id").primaryKey({autoIncrement:true}),nome:text("nome").notNull().unique(),chave:text("chave").notNull().default("").unique()});
export const semestres=sqliteTable("semestres",{id:integer("id").primaryKey({autoIncrement:true}),nome:text("nome").notNull().unique(),chave:text("chave").notNull().default("").unique()});
export const aulas=sqliteTable("aulas",{
 semestre_curso:integer("semestre_curso"),
 id:integer("id").primaryKey({autoIncrement:true}),
 docente_id:integer("docente_id").notNull().references(()=>docentes.id,{onDelete:"restrict"}),
 disciplina_id:integer("disciplina_id").notNull().references(()=>disciplinas.id,{onDelete:"restrict"}),
 turma_id:integer("turma_id").references(()=>turmas.id,{onDelete:"restrict"}),
 sala_id:integer("sala_id").notNull().references(()=>salas.id,{onDelete:"restrict"}),
 semestre_id:integer("semestre_id").notNull().references(()=>semestres.id,{onDelete:"restrict"}),
 turno:text("turno").notNull(),dia_semana:integer("dia_semana").notNull(),hora_inicio:integer("hora_inicio").notNull(),hora_fim:integer("hora_fim").notNull()
},t=>[index("idx_aulas_semestre_dia_inicio").on(t.semestre_id,t.dia_semana,t.hora_inicio),check("horario_valido",sql`${t.hora_inicio} >= 420 AND ${t.hora_fim} <= 1320 AND ${t.hora_inicio} < ${t.hora_fim}`),check("dia_valido",sql`${t.dia_semana} BETWEEN 1 AND 6`),check("turno_valido",sql`${t.turno} IN ('Manhã','Tarde','Noite')`)]);


export const authAccount=sqliteTable('auth_account',{id:integer('id').primaryKey(),username:text('username').notNull(),salt:text('salt').notNull(),passwordHash:text('password_hash').notNull(),failures:integer('failures').notNull().default(0),lockedUntil:integer('locked_until').notNull().default(0)},t=>[check('single_account',sql`${t.id}=1`)]);
export const authSessions=sqliteTable('auth_sessions',{tokenHash:text('token_hash').primaryKey(),expiresAt:integer('expires_at').notNull()});
