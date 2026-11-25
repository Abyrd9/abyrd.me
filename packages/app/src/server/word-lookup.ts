// Looks a word up in free sources: Wiktionary for meanings, pronunciation, and
// origin; Tatoeba for example sentences; Datamuse for similar words; and the
// writer's own Kindle highlights and saved quotes for passages that use it.
import { eq, like } from "drizzle-orm";
import { kindleAnnotations, kindleBooks, quotes } from "./database/schema";
import type { AppDatabaseClient } from "./database/service";

// Wikimedia asks automated clients to identify themselves.
const headers = { "User-Agent": "abyrd-app/1.0 (personal writing app)" };

type Meaning = {
	partOfSpeech: string;
	senses: Array<{ text: string; examples: string[] }>;
};

export type WordEntry = {
	word: string;
	pronunciation: string | null;
	meanings: Meaning[];
	origins: string[];
	/**
	 * The word this one is a form of, with its own meanings and origin, like
	 * "walk" for "walked".
	 */
	root: { word: string; meanings: Meaning[]; origins: string[] } | null;
	similar: string[];
	examples: string[];
	fromLibrary: Array<{ text: string; source: string }>;
	wiktionaryUrl: string | null;
};

const getJson = async (url: string) => {
	const response = await fetch(url, {
		headers,
		signal: AbortSignal.timeout(8000),
	});
	return response.ok ? response.json() : null;
};

const entities: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

/** Wiktionary's HTML as plain text. */
const toText = (html: string) =>
	html
		.replace(/<style[\s\S]*?<\/style>/g, "")
		.replace(/<sup[^>]*class="[^"]*reference[\s\S]*?<\/sup>/g, "")
		.replace(/<[^>]+>/g, "")
		.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (match, code: string) =>
			code[0] === "#"
				? String.fromCodePoint(
						code[1].toLowerCase() === "x"
							? Number.parseInt(code.slice(2), 16)
							: Number(code.slice(1)),
					)
				: (entities[code] ?? match),
		)
		.replace(/\s+/g, " ")
		.trim();

type WiktionaryDefinitions = {
	en?: Array<{
		partOfSpeech: string;
		definitions: Array<{
			definition: string;
			examples?: string[];
			parsedExamples?: Array<{ example: string }>;
		}>;
	}>;
};

/** Finds the English entry, trying the word as written and then in lowercase. */
const findDefinitions = async (word: string) => {
	for (const title of new Set([word, word.toLowerCase()])) {
		const found: WiktionaryDefinitions | null = await getJson(
			`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(title)}`,
		).catch(() => null);
		if (found?.en?.length) return { title, entries: found.en };
	}
	return null;
};

/** Pronunciation and origin from the English section of the full page. */
const readPage = async (title: string) => {
	const response = await fetch(
		`https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(title)}`,
		{ headers, signal: AbortSignal.timeout(8000) },
	).catch(() => null);
	if (!response?.ok) return { pronunciation: null, origins: [] };
	const html = await response.text();
	const start = html.indexOf('id="English"');
	if (start === -1) return { pronunciation: null, origins: [] };
	const next = html.indexOf("<h2", start);
	const english = html.slice(start, next === -1 ? undefined : next);

	const ipa = english.match(/<span class="IPA[^"]*"[^>]*>([^<]+)<\/span>/);
	const origins: string[] = [];
	for (const heading of english.matchAll(/<h\d[^>]*id="Etymology[^"]*"/g)) {
		const from = (heading.index ?? 0) + heading[0].length;
		const end = english.indexOf("<h", from);
		const section = english.slice(from, end === -1 ? undefined : end);
		const text = [...section.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
			.map((paragraph) => toText(paragraph[1]))
			.filter(Boolean)
			.join(" ");
		if (text) origins.push(text);
	}
	return { pronunciation: ipa ? toText(ipa[1]) : null, origins };
};

const findExamples = async (word: string) => {
	const found = await getJson(
		`https://tatoeba.org/en/api_v0/search?from=eng&query=${encodeURIComponent(`=${word}`)}&orphans=no&unapproved=no&sort=random`,
	).catch(() => null);
	const results: Array<{ text: string }> = found?.results ?? [];
	return results
		.map((result) => result.text)
		.filter((text) => text.length <= 200)
		.slice(0, 10);
};

const findSimilar = async (word: string) => {
	const [synonyms, meansLike] = await Promise.all(
		[
			`rel_syn=${encodeURIComponent(word)}`,
			`ml=${encodeURIComponent(word)}`,
		].map((query) =>
			getJson(`https://api.datamuse.com/words?${query}&max=16`).catch(
				() => null,
			),
		),
	);
	// True synonyms first; Datamuse's looser "means like" list drifts quickly,
	// so only its closest few join them.
	const words = [
		...(synonyms ?? []),
		...(meansLike ?? []).slice(0, Math.max(4, 10 - (synonyms?.length ?? 0))),
	].map((item: { word: string }) => item.word);
	return [...new Set(words)]
		.filter((item) => item.toLowerCase() !== word.toLowerCase())
		.slice(0, 14);
};

/** Passages from the writer's Kindle highlights and saved quotes that use the word. */
const findInLibrary = (db: AppDatabaseClient, word: string) => {
	const pattern = `%${word}%`;
	const whole = new RegExp(
		`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
		"iu",
	);
	const highlights = db
		.select({
			text: kindleAnnotations.highlight,
			title: kindleBooks.title,
			author: kindleBooks.author,
		})
		.from(kindleAnnotations)
		.innerJoin(kindleBooks, eq(kindleAnnotations.bookAsin, kindleBooks.asin))
		.where(like(kindleAnnotations.highlight, pattern))
		.limit(40)
		.all()
		.map((row) => ({
			text: row.text ?? "",
			source: row.author ? `${row.title}, ${row.author}` : row.title,
		}));
	const saved = db
		.select({
			text: quotes.text,
			attribution: quotes.attribution,
			sourceTitle: quotes.sourceTitle,
		})
		.from(quotes)
		.where(like(quotes.text, pattern))
		.limit(40)
		.all()
		.map((row) => ({
			text: row.text,
			source: [row.sourceTitle, row.attribution].filter(Boolean).join(", "),
		}));
	return [...highlights, ...saved]
		.filter((item) => whole.test(item.text))
		.slice(0, 8);
};

/** Wiktionary's meanings, pronunciation, and origin for one word. */
const readEntry = async (word: string) => {
	const definitions = await findDefinitions(word);
	if (!definitions) return null;
	const page = await readPage(definitions.title);
	let formOf: string | null = null;
	const meanings = definitions.entries
		.map((entry) => ({
			partOfSpeech: entry.partOfSpeech,
			senses: entry.definitions
				.map((sense) => {
					const root = sense.definition.match(
						/class="form-of-definition-link"[\s\S]*?title="([^"]+)"/,
					);
					if (root && !formOf) formOf = toText(root[1]);
					const examples = sense.parsedExamples?.length
						? sense.parsedExamples.map((example) => example.example)
						: (sense.examples ?? []);
					return {
						text: toText(sense.definition),
						examples: examples.map(toText).filter(Boolean).slice(0, 3),
					};
				})
				.filter((sense) => sense.text)
				.slice(0, 8),
		}))
		.filter((meaning) => meaning.senses.length);
	return { word: definitions.title, formOf, meanings, ...page };
};

export const lookUpWord = async (
	db: AppDatabaseClient,
	word: string,
): Promise<WordEntry> => {
	const [entry, examples] = await Promise.all([
		readEntry(word),
		findExamples(word.toLowerCase()),
	]);
	const formOf = entry?.formOf ?? null;
	const [root, similar] = await Promise.all([
		formOf ? readEntry(formOf) : null,
		findSimilar((formOf ?? word).toLowerCase()),
	]);

	return {
		word: entry?.word ?? word,
		pronunciation: entry?.pronunciation ?? null,
		meanings: entry?.meanings ?? [],
		origins: entry?.origins ?? [],
		root: root
			? { word: root.word, meanings: root.meanings, origins: root.origins }
			: null,
		similar,
		examples,
		fromLibrary: findInLibrary(db, word),
		wiktionaryUrl: entry
			? `https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}#English`
			: null,
	};
};
