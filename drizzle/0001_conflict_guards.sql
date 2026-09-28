CREATE TRIGGER aulas_conflito_insert BEFORE INSERT ON aulas
WHEN EXISTS (SELECT 1 FROM aulas a WHERE a.semestre_id=NEW.semestre_id AND a.dia_semana=NEW.dia_semana AND NEW.hora_inicio<a.hora_fim AND NEW.hora_fim>a.hora_inicio AND (a.docente_id=NEW.docente_id OR a.sala_id=NEW.sala_id OR a.turma_id=NEW.turma_id))
BEGIN SELECT RAISE(ABORT, 'SCHEDULE_CONFLICT'); END;
--> statement-breakpoint
CREATE TRIGGER aulas_conflito_update BEFORE UPDATE ON aulas
WHEN EXISTS (SELECT 1 FROM aulas a WHERE a.id<>OLD.id AND a.semestre_id=NEW.semestre_id AND a.dia_semana=NEW.dia_semana AND NEW.hora_inicio<a.hora_fim AND NEW.hora_fim>a.hora_inicio AND (a.docente_id=NEW.docente_id OR a.sala_id=NEW.sala_id OR a.turma_id=NEW.turma_id))
BEGIN SELECT RAISE(ABORT, 'SCHEDULE_CONFLICT'); END;
--> statement-breakpoint
PRAGMA optimize;
