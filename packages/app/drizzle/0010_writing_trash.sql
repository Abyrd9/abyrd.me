CREATE TABLE `writing_trash` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`writing_id` integer NOT NULL,
	`writing_title` text NOT NULL,
	`snapshot` text NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `writing_trash_deleted_at_idx` ON `writing_trash` (`deleted_at`);