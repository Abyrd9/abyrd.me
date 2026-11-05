-- Migration 0004 used 1 for inferred archives; real archive timestamps are milliseconds.
UPDATE `kindle_books` SET `archived_at` = NULL WHERE `archived_at` = 1;
