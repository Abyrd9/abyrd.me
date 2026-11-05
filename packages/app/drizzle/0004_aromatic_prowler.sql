ALTER TABLE `kindle_books` ADD `archived_at` integer;
--> statement-breakpoint
UPDATE `kindle_books` SET `archived_at` = 1
WHERE EXISTS (SELECT 1 FROM `kindle_annotations` WHERE `book_asin` = `kindle_books`.`asin`)
AND NOT EXISTS (SELECT 1 FROM `kindle_annotations` WHERE `book_asin` = `kindle_books`.`asin` AND `archived_at` IS NULL);
