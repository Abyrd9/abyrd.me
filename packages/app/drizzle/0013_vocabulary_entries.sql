CREATE TABLE `vocabulary_entries` (
	`word` text PRIMARY KEY NOT NULL,
	`definition` text NOT NULL,
	`examples` text NOT NULL,
	`source_url` text
);
--> statement-breakpoint
INSERT INTO `vocabulary_entries` (`word`, `definition`, `examples`) VALUES
	('indigence', 'Noun: Extreme poverty. Someone in indigence cannot afford basics like food or a place to live.',
	 '["After months without work, the family fell into indigence and could no longer afford rent.","The shelter helps people living in indigence find a meal and a bed for the night.","The report described children living in such indigence that they went to school without shoes."]'),
	('lustreless', 'Adjective: Dull or lacking shine. It can also describe something that lacks sparkle, energy, or excitement. The usual US spelling is lusterless.',
	 '["The old silver spoon looked lustreless until she polished it.","After weeks without rain, the leaves looked dusty and lustreless.","The play had a promising cast, but the performance felt lustreless and the audience barely applauded."]'),
	('penitential', 'Adjective: Showing sorrow for something you did wrong, often in a religious setting.',
	 '["During the penitential prayer, she admitted what she had done and asked for forgiveness.","He wrote a penitential letter to his sister, saying he was sorry for blaming her.","The congregation sang a penitential hymn about regret and forgiveness."]');
