ALTER TABLE `disciplinas` ADD `chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `disciplinas_chave_unique` ON `disciplinas` (`chave`);--> statement-breakpoint
ALTER TABLE `docentes` ADD `chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `docentes_chave_unique` ON `docentes` (`chave`);--> statement-breakpoint
ALTER TABLE `salas` ADD `chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `salas_chave_unique` ON `salas` (`chave`);--> statement-breakpoint
ALTER TABLE `semestres` ADD `chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `semestres_chave_unique` ON `semestres` (`chave`);--> statement-breakpoint
ALTER TABLE `turmas` ADD `chave` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `turmas_chave_unique` ON `turmas` (`chave`);