CREATE TABLE `aulas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`docente_id` integer NOT NULL,
	`disciplina_id` integer NOT NULL,
	`turma_id` integer NOT NULL,
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
	CONSTRAINT "horario_valido" CHECK("aulas"."hora_inicio" >= 420 AND "aulas"."hora_fim" <= 1320 AND "aulas"."hora_inicio" < "aulas"."hora_fim"),
	CONSTRAINT "dia_valido" CHECK("aulas"."dia_semana" BETWEEN 1 AND 6),
	CONSTRAINT "turno_valido" CHECK("aulas"."turno" IN ('Manhã','Tarde','Noite'))
);
--> statement-breakpoint
CREATE INDEX `idx_aulas_semestre_dia_inicio` ON `aulas` (`semestre_id`,`dia_semana`,`hora_inicio`);--> statement-breakpoint
CREATE TABLE `disciplinas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `disciplinas_nome_unique` ON `disciplinas` (`nome`);--> statement-breakpoint
CREATE TABLE `docentes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `docentes_nome_unique` ON `docentes` (`nome`);--> statement-breakpoint
CREATE TABLE `salas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `salas_nome_unique` ON `salas` (`nome`);--> statement-breakpoint
CREATE TABLE `semestres` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `semestres_nome_unique` ON `semestres` (`nome`);--> statement-breakpoint
CREATE TABLE `turmas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `turmas_nome_unique` ON `turmas` (`nome`);