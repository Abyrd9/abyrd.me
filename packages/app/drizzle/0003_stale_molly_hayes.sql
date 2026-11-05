CREATE TABLE `kindle_chapters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`book_asin` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`synopsis` text,
	FOREIGN KEY (`book_asin`) REFERENCES `kindle_books`(`asin`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `kindle_annotations` ADD `chapter_id` integer REFERENCES kindle_chapters(id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `kindle_annotations` ADD `commentary` text;--> statement-breakpoint
ALTER TABLE `kindle_books` ADD `synopsis` text;
