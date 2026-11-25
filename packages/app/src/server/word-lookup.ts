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

/** A run of origin text, linked when it names a word that can be looked up. */
export type OriginPart = {
	text: string;
	link?: { word: string; language: string };
};

export type WordEntry = {
	word: string;
	/** The language of this entry, like "English" or "Old French". */
	language: string;
	pronunciation: string | null;
	meanings: Meaning[];
	/** One origin per etymology Wiktionary lists, each as linked parts. */
	origins: OriginPart[][];
	/**
	 * The word this one is a form of, with its own meanings and origin, like
	 * "walk" for "walked".
	 */
	root: { word: string; meanings: Meaning[]; origins: OriginPart[][] } | null;
	similar: string[];
	/** Sentences and quotations that use the word itself. */
	examples: string[];
	/** Sentences using related forms, offered when the word has few of its own. */
	relatedExamples: string[];
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

/** Wiktionary's HTML as text, with spacing collapsed but not trimmed. */
const toPlain = (html: string) =>
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
		// Direction marks Wiktionary puts around "+" in compounds.
		.replace(/[\u200e\u200f]/g, "")
		.replace(/\s+/g, " ");

/** Wiktionary's HTML as plain text. */
const toText = (html: string) => toPlain(html).trim();

/**
 * Origin HTML as text parts, keeping links to words that have Wiktionary
 * entries. Links to Wikipedia, appendices, reconstructed words, and missing
 * pages stay plain text.
 */
const toOriginParts = (html: string) => {
	const parts: OriginPart[] = [];
	let last = 0;
	for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
		parts.push({ text: toPlain(html.slice(last, match.index)) });
		const text = toPlain(match[2]);
		const href = match[1].match(/href="\.\/([^"#]+)(?:#([^"]+))?"/);
		const word = href ? decodeURIComponent(href[1]).replaceAll("_", " ") : "";
		const linkable =
			href &&
			word &&
			!word.includes(":") &&
			!/class="[^"]*\bnew\b/.test(match[1]);
		parts.push(
			linkable
				? {
						text,
						link: {
							word,
							language: href[2]
								? decodeURIComponent(href[2]).replaceAll("_", " ")
								: "English",
						},
					}
				: { text },
		);
		last = (match.index ?? 0) + match[0].length;
	}
	parts.push({ text: toPlain(html.slice(last)) });
	return parts.filter((part) => part.text);
};

type WiktionaryDefinitions = Record<
	string,
	Array<{
		partOfSpeech: string;
		language: string;
		definitions: Array<{
			definition: string;
			examples?: string[];
			parsedExamples?: Array<{ example: string }>;
		}>;
	}>
>;

/** Finds the entry in a language, trying the word as written and then in lowercase. */
const findDefinitions = async (word: string, language: string) => {
	for (const title of new Set([word, word.toLowerCase()])) {
		const found: WiktionaryDefinitions | null = await getJson(
			`https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(title)}`,
		).catch(() => null);
		// English has its own key; other languages can share one, so match by name.
		const entries =
			language === "English"
				? (found?.en ?? [])
				: Object.values(found ?? {})
						.flat()
						.filter((entry) => entry.language === language);
		if (entries.length) return { title, entries };
	}
	return null;
};

/** Pronunciation, origin, and quotations from one language's section of the page. */
const readPage = async (title: string, language: string) => {
	const response = await fetch(
		`https://en.wiktionary.org/api/rest_v1/page/html/${encodeURIComponent(title)}`,
		{ headers, signal: AbortSignal.timeout(8000) },
	).catch(() => null);
	const empty = { pronunciation: null, origins: [], quotations: [] };
	if (!response?.ok) return empty;
	const html = await response.text();
	const heading = html.match(
		new RegExp(`<h2[^>]*id="${language.replaceAll(" ", "_")}"`),
	);
	if (heading?.index === undefined) return empty;
	const next = html.indexOf("<h2", heading.index + heading[0].length);
	const english = html.slice(heading.index, next === -1 ? undefined : next);

	const ipa = english.match(/<span class="IPA[^"]*"[^>]*>([^<]+)<\/span>/);
	const origins: OriginPart[][] = [];
	for (const etymology of english.matchAll(/<h\d[^>]*id="Etymology[^"]*"/g)) {
		const from = (etymology.index ?? 0) + etymology[0].length;
		const end = english.indexOf("<h", from);
		const section = english
			.slice(from, end === -1 ? undefined : end)
			.replace(/<style[\s\S]*?<\/style>/g, "")
			// Footnote markers like [1] carry links of their own.
			.replace(/<sup\b[^>]*mw-ref[\s\S]*?<\/sup>/g, "");
		const parts = [...section.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].flatMap(
			(paragraph, index) => [
				...(index ? [{ text: " " }] : []),
				...toOriginParts(paragraph[1]),
			],
		);
		if (parts.some((part) => part.text.trim())) {
			parts[0].text = parts[0].text.trimStart();
			parts[parts.length - 1].text = parts[parts.length - 1].text.trimEnd();
			origins.push(parts);
		}
	}
	// Quotations Wiktionary cites from published writing, under each sense.
	const quotations = [
		...english.matchAll(
			/class="[^"]*e-quotation[^"]*"[^>]*>([\s\S]*?)<\/span><\/div>/g,
		),
	]
		.map((match) => toText(match[1]))
		.filter((text) => text.length <= 300)
		.slice(0, 6);
	return { pronunciation: ipa ? toText(ipa[1]) : null, origins, quotations };
};

/** Tatoeba sentences: exact matches only, or any form of the word when loose. */
const findSentences = async (word: string, loose = false) => {
	const query = loose ? word : `=${word}`;
	const found = await getJson(
		`https://tatoeba.org/en/api_v0/search?from=eng&query=${encodeURIComponent(query)}&orphans=no&unapproved=no&sort=random`,
	).catch(() => null);
	const results: Array<{ text: string }> = found?.results ?? [];
	return results
		.map((result) => result.text)
		.filter((text) => text.length <= 200)
		.slice(0, 10);
};

/** Example sentences from the Free Dictionary API, which Wiktionary often lacks. */
const findDictionaryExamples = async (word: string) => {
	const found = await getJson(
		`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
	).catch(() => null);
	if (!Array.isArray(found)) return [];
	return found.flatMap(
		(entry: {
			meanings?: Array<{ definitions?: Array<{ example?: string }> }>;
		}) =>
			(entry.meanings ?? []).flatMap((meaning) =>
				(meaning.definitions ?? []).flatMap((sense) =>
					sense.example ? [sense.example] : [],
				),
			),
	);
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
const readEntry = async (word: string, language: string) => {
	const definitions = await findDefinitions(word, language);
	if (!definitions) return null;
	const page = await readPage(definitions.title, language);
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

/**
 * Looks a word up. Words in other languages, reached from an origin, get
 * Wiktionary's entry alone: the other sources are English only.
 */
export const lookUpWord = async (
	db: AppDatabaseClient,
	word: string,
	language = "English",
): Promise<WordEntry> => {
	const lower = word.toLowerCase();
	const english = language === "English";
	const none = Promise.resolve([] as string[]);
	const [entry, sentences, dictionary, related] = await Promise.all([
		readEntry(word, language),
		english ? findSentences(lower) : none,
		english ? findDictionaryExamples(lower) : none,
		english ? findSentences(lower, true) : none,
	]);
	const examples = [
		...new Set([...sentences, ...(entry?.quotations ?? []), ...dictionary]),
	].slice(0, 12);
	const relatedExamples =
		examples.length >= 3
			? []
			: related.filter((text) => !examples.includes(text)).slice(0, 5);
	const formOf = entry?.formOf ?? null;
	const [root, similar] = await Promise.all([
		formOf ? readEntry(formOf, language) : null,
		english ? findSimilar((formOf ?? word).toLowerCase()) : none,
	]);

	return {
		word: entry?.word ?? word,
		language,
		pronunciation: entry?.pronunciation ?? null,
		meanings: entry?.meanings ?? [],
		origins: entry?.origins ?? [],
		root: root
			? { word: root.word, meanings: root.meanings, origins: root.origins }
			: null,
		similar,
		examples,
		relatedExamples,
		fromLibrary: english ? findInLibrary(db, word) : [],
		wiktionaryUrl: entry
			? `https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}#${language.replaceAll(" ", "_")}`
			: null,
	};
};
