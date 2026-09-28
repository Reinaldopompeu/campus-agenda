CREATE TABLE `aulas_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`docente_id` integer NOT NULL,
	`disciplina_id` integer NOT NULL,
	`turma_id` integer,
	`sala_id` integer NOT NULL,
	`semestre_id` integer NOT NULL,
	`turno` text NOT NULL,
	`dia_semana` integer NOT NULL,
	`hora_inicio` integer NOT NULL,
	`hora_fim` integer NOT NULL,
	FOREIGN KEY (`docente_id`) REFERENCES `docentes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`disciplina_id`) REFERENCES `disciplinas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`turma_id`) REFERENCES `turmas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`sala_id`) REFERENCES `salas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`semestre_id`) REFERENCES `semestres`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "horario_valido" CHECK("aulas_new"."hora_inicio" >= 420 AND "aulas_new"."hora_fim" <= 1320 AND "aulas_new"."hora_inicio" < "aulas_new"."hora_fim"),
	CONSTRAINT "dia_valido" CHECK("aulas_new"."dia_semana" BETWEEN 1 AND 6),
	CONSTRAINT "turno_valido" CHECK("aulas_new"."turno" IN ('Manhã','Tarde','Noite'))
);

INSERT INTO aulas_new SELECT * FROM aulas;
DROP TABLE aulas;
ALTER TABLE aulas_new RENAME TO aulas;
CREATE INDEX idx_aulas_semestre_dia_inicio ON aulas(semestre_id,dia_semana,hora_inicio);
CREATE TRIGGER aulas_conflito_insert BEFORE INSERT ON aulas
WHEN EXISTS (SELECT 1 FROM aulas a WHERE a.semestre_id=NEW.semestre_id AND a.dia_semana=NEW.dia_semana AND NEW.hora_inicio<a.hora_fim AND NEW.hora_fim>a.hora_inicio AND (a.docente_id=NEW.docente_id OR a.sala_id=NEW.sala_id OR a.turma_id=NEW.turma_id))
BEGIN SELECT RAISE(ABORT, 'SCHEDULE_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER aulas_conflito_update BEFORE UPDATE ON aulas
WHEN EXISTS (SELECT 1 FROM aulas a WHERE a.id<>OLD.id AND a.semestre_id=NEW.semestre_id AND a.dia_semana=NEW.dia_semana AND NEW.hora_inicio<a.hora_fim AND NEW.hora_fim>a.hora_inicio AND (a.docente_id=NEW.docente_id OR a.sala_id=NEW.sala_id OR a.turma_id=NEW.turma_id))
BEGIN SELECT RAISE(ABORT, 'SCHEDULE_CONFLICT'); END;
--> statement-breakpoint
PRAGMA optimize;
