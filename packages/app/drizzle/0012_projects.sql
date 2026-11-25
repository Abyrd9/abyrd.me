-- Written by hand; drizzle-kit's version would lose data. Migrations run in
-- one transaction with foreign keys on, where PRAGMA foreign_keys=OFF does
-- nothing, so dropping writing_notes cascades into every table that
-- references it. The steps below keep each row, id, and link:
--   * the new table's parent_id references the new table, so the drop can't
--     cascade into the copied notes; the rename points it at writing_notes;
--   * note_links is copied aside before the drop and put back after;
--   * the id counters carry over, so a deleted note's id is never reused.
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `writings` ADD `project_id` integer REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
CREATE INDEX `writings_project_id_idx` ON `writings` (`project_id`);--> statement-breakpoint
CREATE TABLE `__new_writing_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writing_id` integer,
	`project_id` integer,
	`chapter_id` integer,
	`parent_id` integer,
	`title` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`content` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`writing_id`) REFERENCES `writings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapter_id`) REFERENCES `writing_chapters`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `__new_writing_notes`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "writing_notes_has_home" CHECK(`writing_id` IS NOT NULL OR `project_id` IS NOT NULL)
);
--> statement-breakpoint
INSERT INTO `__new_writing_notes`("id", "writing_id", "chapter_id", "parent_id", "title", "position", "content", "created_at", "updated_at") SELECT "id", "writing_id", "chapter_id", "parent_id", "title", "position", "content", "created_at", "updated_at" FROM `writing_notes`;--> statement-breakpoint
DELETE FROM `sqlite_sequence` WHERE `name` = '__new_writing_notes';--> statement-breakpoint
INSERT INTO `sqlite_sequence`(`name`, `seq`) SELECT '__new_writing_notes', `seq` FROM `sqlite_sequence` WHERE `name` = 'writing_notes';--> statement-breakpoint
CREATE TABLE `__kept_note_links` AS SELECT * FROM `note_links`;--> statement-breakpoint
DROP TABLE `writing_notes`;--> statement-breakpoint
ALTER TABLE `__new_writing_notes` RENAME TO `writing_notes`;--> statement-breakpoint
INSERT INTO `note_links`("id", "source_chapter_id", "source_note_id", "target_note_id", "context") SELECT "id", "source_chapter_id", "source_note_id", "target_note_id", "context" FROM `__kept_note_links`;--> statement-breakpoint
DROP TABLE `__kept_note_links`;--> statement-breakpoint
CREATE INDEX `writing_notes_writing_id_idx` ON `writing_notes` (`writing_id`);--> statement-breakpoint
CREATE INDEX `writing_notes_parent_id_idx` ON `writing_notes` (`parent_id`);--> statement-breakpoint
CREATE INDEX `writing_notes_chapter_id_idx` ON `writing_notes` (`chapter_id`);--> statement-breakpoint
CREATE INDEX `writing_notes_project_id_idx` ON `writing_notes` (`project_id`);--> statement-breakpoint
CREATE TABLE `__new_writing_trash` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`writing_id` integer,
	`writing_title` text,
	`snapshot` text NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_writing_trash`("id", "kind", "title", "writing_id", "writing_title", "snapshot", "deleted_at") SELECT "id", "kind", "title", "writing_id", "writing_title", "snapshot", "deleted_at" FROM `writing_trash`;--> statement-breakpoint
DELETE FROM `sqlite_sequence` WHERE `name` = '__new_writing_trash';--> statement-breakpoint
INSERT INTO `sqlite_sequence`(`name`, `seq`) SELECT '__new_writing_trash', `seq` FROM `sqlite_sequence` WHERE `name` = 'writing_trash';--> statement-breakpoint
DROP TABLE `writing_trash`;--> statement-breakpoint
ALTER TABLE `__new_writing_trash` RENAME TO `writing_trash`;--> statement-breakpoint
CREATE INDEX `writing_trash_deleted_at_idx` ON `writing_trash` (`deleted_at`);
