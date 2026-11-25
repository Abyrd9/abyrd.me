CREATE TABLE `writing_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter_id` integer NOT NULL,
	`passage` text NOT NULL,
	`alternatives` text NOT NULL,
	`status` text NOT NULL,
	`accepted_index` integer,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`chapter_id`) REFERENCES `writing_chapters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writing_suggestions_chapter_id_idx` ON `writing_suggestions` (`chapter_id`);