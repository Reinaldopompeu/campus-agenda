ALTER TABLE aulas ADD COLUMN semestre_curso INTEGER CHECK(semestre_curso BETWEEN 1 AND 20);
UPDATE aulas SET semestre_curso=(SELECT semestre_curso FROM turmas WHERE turmas.id=aulas.turma_id);
