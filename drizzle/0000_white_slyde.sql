CREATE TABLE `settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `workspace_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_dir` text NOT NULL,
	`name` text,
	`last_opened` integer,
	`config` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_config_project_dir_unique` ON `workspace_config` (`project_dir`);