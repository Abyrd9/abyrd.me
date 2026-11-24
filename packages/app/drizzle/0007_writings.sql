CREATE TABLE `writing_chapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`writing_id` integer NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`position` integer NOT NULL,
	`content` text,
	`word_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`writing_id`) REFERENCES `writings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `writing_chapters_writing_id_idx` ON `writing_chapters` (`writing_id`);--> statement-breakpoint
CREATE TABLE `writings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`page_size` text DEFAULT 'trade' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `writings_updated_at_idx` ON `writings` (`updated_at`);