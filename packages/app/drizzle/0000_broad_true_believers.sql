CREATE TABLE `kindle_annotations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_asin` text NOT NULL,
	`source_key` text NOT NULL,
	`position` integer NOT NULL,
	`highlight` text,
	`note` text,
	`location` text,
	`page` text,
	`added_at` text,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`archived_at` integer,
	FOREIGN KEY (`book_asin`) REFERENCES `kindle_books`(`asin`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `kindle_annotations_source_key_unique` ON `kindle_annotations` (`source_key`);--> statement-breakpoint
CREATE INDEX `kindle_annotations_book_asin_idx` ON `kindle_annotations` (`book_asin`);--> statement-breakpoint
CREATE INDEX `kindle_annotations_archived_at_idx` ON `kindle_annotations` (`archived_at`);--> statement-breakpoint
CREATE TABLE `kindle_books` (
	`asin` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text DEFAULT '' NOT NULL,
	`last_annotated_at` text,
	`last_synced_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `kindle_sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text NOT NULL,
	`book_count` integer DEFAULT 0 NOT NULL,
	`annotation_count` integer DEFAULT 0 NOT NULL,
	`error` text
);
