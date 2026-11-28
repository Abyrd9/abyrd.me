import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { vocabularyEntries } from "./database/schema";
import { runSignedIn } from "./signed-in";
import { lookUpWord } from "./word-lookup";

const wordInput = z
	.string()
	.trim()
	.max(80)
	.regex(/^\p{L}[\p{L}\p{M}'’ -]*$/u)
	.transform((word) =>
		word.normalize("NFC").toLowerCase().replace(/\s+/g, " "),
	);

export const listVocabulary = createServerFn({ method: "GET" }).handler(() =>
	runSignedIn((db) =>
		db
			.select()
			.from(vocabularyEntries)
			.orderBy(asc(vocabularyEntries.word))
			.all(),
	),
);

export const addVocabularyWord = createServerFn({ method: "POST" })
	.validator((input: unknown) => wordInput.parse(input))
	.handler(({ data: word }) =>
		runSignedIn(async (db) => {
			const existing = db
				.select({ word: vocabularyEntries.word })
				.from(vocabularyEntries)
				.where(eq(vocabularyEntries.word, word))
				.get();
			if (existing) return word;

			const entry = await lookUpWord(db, word);
			const senses = entry.meanings.flatMap(({ partOfSpeech, senses }) =>
				senses.map((sense) => ({ ...sense, partOfSpeech })),
			);
			const exactWord = new RegExp(
				`(^|[^\\p{L}\\p{M}])${word}($|[^\\p{L}\\p{M}])`,
				"iu",
			);
			const examples = new Set(
				[
					...senses.flatMap((sense) => sense.examples),
					...entry.examples,
					...entry.relatedExamples,
				].filter((example) => example.length <= 300 && exactWord.test(example)),
			);

			db.insert(vocabularyEntries)
				.values({
					word,
					definition: senses
						.slice(0, 3)
						.map(({ partOfSpeech, text }) => `${partOfSpeech}: ${text}`)
						.join("\n")
						.slice(0, 1500),
					examples: [...examples].slice(0, 5),
					sourceUrl: entry.wiktionaryUrl,
				})
				.onConflictDoNothing()
				.run();
			return word;
		}),
	);

export const editVocabularyEntry = createServerFn({ method: "POST" })
	.validator((input: unknown) =>
		z
			.object({
				word: wordInput,
				definition: z.string().trim().max(1500),
				examples: z.array(z.string().trim().min(1).max(300)).max(20),
			})
			.parse(input),
	)
	.handler(({ data: { word, definition, examples } }) =>
		runSignedIn((db) => {
			const result = db
				.update(vocabularyEntries)
				.set({ definition, examples: [...new Set(examples)] })
				.where(eq(vocabularyEntries.word, word))
				.returning({ word: vocabularyEntries.word })
				.get();
			return Boolean(result);
		}),
	);
