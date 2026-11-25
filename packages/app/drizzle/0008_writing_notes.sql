CREATE TABLE `note_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source_chapter_id` integer,
	`source_note_id` integer,
	`target_note_id` integer NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`source_chapter_id`) REFERENCES `writing_chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_note_id`) REFERENCES `writing_notes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`target_note_id`) REFERENCES `writing_notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "note_links_one_source" CHECK(("note_links"."source_chapter_id" IS NULL) <> ("note_links"."source_note_id" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `note_links_target_idx` ON `note_links` (`target_note_id`);--> statement-breakpoint
CREATE INDEX `note_links_source_chapter_idx` ON `note_links` (`source_chapter_id`);--> statement-breakpoint
CREATE INDEX `note_links_source_note_idx` ON `note_links` (`source_note_id`);--> statement-breakpoint
CREATE TABLE `writing_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writing_id` integer NOT NULL,
	`chapter_id` integer,
	`parent_id` integer,
	`title` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`content` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`writing_id`) REFERENCES `writings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`chapter_id`) REFERENCES `writing_chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `writing_notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writing_notes_writing_id_idx` ON `writing_notes` (`writing_id`);--> statement-breakpoint
CREATE INDEX `writing_notes_parent_id_idx` ON `writing_notes` (`parent_id`);--> statement-breakpoint
CREATE INDEX `writing_notes_chapter_id_idx` ON `writing_notes` (`chapter_id`);