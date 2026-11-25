import { createContext, type ReactNode, useEffect, useState } from "react";
import type { OriginPart, WordEntry } from "#/server/word-lookup";
import { lookUpWritingWord } from "#/server/word-lookup-functions";

/**
 * Opens the word panel beside the page. Editors outside the writing page have
 * no panel, so the toolbar hides its Define button there.
 */
export const WordLookupContext = createContext<((word: string) => void) | null>(
	null,
);

/** A single word, as the dictionary lookup accepts it. */
export const asLookupWord = (text: string) => {
	const word = text.trim().replace(/['’]s$/, "");
	return word.length <= 60 && /^\p{L}[\p{L}'’-]*$/u.test(word) ? word : null;
};

type Lookup = { word: string; language: string };
type Open = (word: string, language: string) => void;

/**
 * A dictionary entry in the notes column: meanings, the word in use, origin,
 * and similar words. Similar words and the words in an origin open in place,
 * with a way back.
 */
export const WordPanel = ({
	word,
}: {
	/** The word to open with, or null to start from the search box. */
	word: string | null;
}) => {
	const [trail, setTrail] = useState<Lookup[]>(
		word ? [{ word, language: "English" }] : [],
	);
	const current = trail.at(-1);
	const [query, setQuery] = useState("");
	const [invalid, setInvalid] = useState(false);
	const previous = trail.length > 1 ? trail[trail.length - 2] : null;
	const [entry, setEntry] = useState<WordEntry | null | undefined>(undefined);

	useEffect(() => {
		if (!current) return;
		let active = true;
		setEntry(undefined);
		lookUpWritingWord({ data: current })
			.then((found) => {
				if (!active) return;
				setEntry(found);
				if (found.language === "English" && found.meanings.length)
					remember(found.word);
			})
			.catch(() => active && setEntry(null));
		return () => {
			active = false;
		};
	}, [current]);

	const open: Open = (next, language) =>
		setTrail((words) => [...words, { word: next, language }]);

	return (
		<section
			aria-label={current ? `Dictionary: ${current.word}` : "Dictionary"}
			// The paper fits its entry, scrolling only once it reaches the bottom.
			className="flex h-full items-start"
		>
			<div
				data-side-paper
				className="max-h-full min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-6 pt-5 pb-8 text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-8"
			>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						const next = asLookupWord(query);
						setInvalid(!next);
						if (!next) return;
						setQuery("");
						open(next, "English");
					}}
				>
					<label className="flex h-9 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 text-sm text-stone-400 focus-within:border-stone-400 focus-within:bg-white">
						<svg
							aria-hidden="true"
							fill="none"
							height="15"
							stroke="currentColor"
							strokeLinecap="round"
							strokeWidth="2"
							viewBox="0 0 24 24"
							width="15"
						>
							<circle cx="11" cy="11" r="7" />
							<path d="m20 20-3.5-3.5" />
						</svg>
						<input
							aria-invalid={invalid}
							aria-label="Look up a word"
							className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-400"
							onChange={(event) => {
								setQuery(event.target.value);
								setInvalid(false);
							}}
							placeholder={
								invalid ? "One word, letters only" : "Look up a word"
							}
							value={query}
						/>
					</label>
				</form>

				<div className="mt-5">
					{previous ? (
						<button
							className="mb-2 text-xs text-stone-500 hover:text-stone-900"
							onClick={() => setTrail((words) => words.slice(0, -1))}
							type="button"
						>
							‹ Back to {previous.word}
						</button>
					) : null}
					{!current ? (
						<Empty onOpen={(next) => open(next, "English")} />
					) : entry === undefined ? (
						<p className="text-sm text-stone-400">
							Looking up “{current.word}”…
						</p>
					) : entry === null ? (
						<p className="text-sm text-stone-500">
							Couldn’t reach the dictionary. Check your connection and try
							again.
						</p>
					) : (
						<Entry entry={entry} onOpen={open} />
					)}
				</div>
			</div>
		</section>
	);
};

const RECENT_KEY = "abyrd.dictionary-recent";

/** Remembers a looked-up word for the empty panel's Recent list. */
const remember = (word: string) => {
	const recent: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
	const words = Array.isArray(recent)
		? recent.filter((item): item is string => typeof item === "string")
		: [];
	localStorage.setItem(
		RECENT_KEY,
		JSON.stringify(
			[word, ...words.filter((item) => item !== word)].slice(0, 8),
		),
	);
};

/** What the panel shows before any word is open: a hint and recent words. */
const Empty = ({ onOpen }: { onOpen: (word: string) => void }) => {
	const [recent, setRecent] = useState<string[]>([]);
	useEffect(() => {
		const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
		if (Array.isArray(saved))
			setRecent(
				saved.filter((item): item is string => typeof item === "string"),
			);
	}, []);
	return (
		<div className="text-sm text-stone-500">
			<p>
				Look up any word, or select one in your writing and press the book
				button in the toolbar.
			</p>
			{recent.length ? (
				<>
					<h3 className="mt-5 mb-2 text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
						Recent
					</h3>
					<div className="flex flex-wrap gap-1.5">
						{recent.map((word) => (
							<button
								className="font-book rounded-full border border-stone-200 px-2.5 py-0.5 text-[14px] text-stone-700 hover:border-stone-400 hover:text-stone-950"
								key={word}
								onClick={() => onOpen(word)}
								type="button"
							>
								{word}
							</button>
						))}
					</div>
				</>
			) : null}
		</div>
	);
};

const Entry = ({ entry, onOpen }: { entry: WordEntry; onOpen: Open }) => {
	const english = entry.language === "English";
	const found =
		entry.meanings.length ||
		entry.root?.meanings.length ||
		entry.origins.length;
	const highlight = [entry.word, entry.root?.word].filter(
		(word): word is string => Boolean(word),
	);
	return (
		<article className="font-book text-[14.5px] leading-relaxed">
			<header className="mb-5">
				{english ? null : (
					<p className="mb-1 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
						{entry.language}
					</p>
				)}
				<h2 className="font-book text-[26px] leading-tight text-stone-950">
					{entry.word}
				</h2>
				{entry.pronunciation ? (
					<p className="mt-1 font-sans text-sm text-stone-500">
						{entry.pronunciation}
					</p>
				) : null}
			</header>

			{found ? null : (
				<p className="mb-6 text-stone-500">
					{english
						? `No dictionary entry for “${entry.word}”.`
						: `Wiktionary has no ${entry.language} entry for “${entry.word}”.`}
				</p>
			)}

			<Meanings meanings={entry.meanings} />

			{entry.examples.length || entry.relatedExamples.length ? (
				<Section title="In use">
					<ul className="grid gap-2">
						{entry.examples.map((example) => (
							<li className="text-stone-700" key={example}>
								<Marked text={example} words={highlight} />
							</li>
						))}
					</ul>
					{entry.relatedExamples.length ? (
						<>
							<p className="mt-3 mb-1.5 font-sans text-xs text-stone-500">
								{entry.examples.length
									? "Related forms in use:"
									: `No sentences use “${entry.word}” itself. Related forms in use:`}
							</p>
							<ul className="grid gap-2">
								{entry.relatedExamples.map((example) => (
									<li className="text-stone-700" key={example}>
										{example}
									</li>
								))}
							</ul>
						</>
					) : null}
				</Section>
			) : null}

			{entry.origins.length ? (
				<Origins onOpen={onOpen} origins={entry.origins} />
			) : null}

			{entry.root ? (
				<div className="mt-8 border-t border-stone-200 pt-6">
					<button
						className="font-book text-[22px] text-stone-950 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-600"
						onClick={() => onOpen(entry.root?.word ?? "", entry.language)}
						type="button"
					>
						{entry.root.word}
					</button>
					<div className="mt-4">
						<Meanings meanings={entry.root.meanings} />
						{entry.root.origins.length ? (
							<Origins onOpen={onOpen} origins={entry.root.origins} />
						) : null}
					</div>
				</div>
			) : null}

			{entry.similar.length ? (
				<Section title="Similar words">
					<div className="flex flex-wrap gap-1.5">
						{entry.similar.map((word) => (
							<button
								className="rounded-full border border-stone-200 px-2.5 py-0.5 text-sm text-stone-700 hover:border-stone-400 hover:text-stone-950"
								key={word}
								onClick={() => onOpen(word, "English")}
								type="button"
							>
								{word}
							</button>
						))}
					</div>
				</Section>
			) : null}

			{entry.fromLibrary.length ? (
				<Section title="From your library">
					<ul className="grid gap-4">
						{entry.fromLibrary.map((passage) => (
							<li key={passage.text}>
								<blockquote className="border-l-2 border-stone-200 pl-3 text-stone-700 italic">
									<Marked text={passage.text} words={highlight} />
								</blockquote>
								{passage.source ? (
									<p className="mt-1 pl-3 font-sans text-xs text-stone-500">
										{passage.source}
									</p>
								) : null}
							</li>
						))}
					</ul>
				</Section>
			) : null}

			<footer className="mt-8 font-sans text-[11px] leading-normal text-stone-400">
				Meanings and origin from{" "}
				{entry.wiktionaryUrl ? (
					<a
						className="underline hover:text-stone-600"
						href={entry.wiktionaryUrl}
						rel="noreferrer"
						target="_blank"
					>
						Wiktionary
					</a>
				) : (
					"Wiktionary"
				)}{" "}
				(CC BY-SA).
				{english
					? " Sentences from Tatoeba (CC BY) and the Free Dictionary API. Similar words from Datamuse."
					: null}
			</footer>
		</article>
	);
};

const Meanings = ({ meanings }: { meanings: WordEntry["meanings"] }) =>
	meanings.map((meaning, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a word can have two noun entries.
		<div className="mb-5" key={index}>
			<p className="mb-1 text-sm text-stone-500 italic">
				{meaning.partOfSpeech.toLowerCase()}
			</p>
			<ol className="grid list-decimal gap-1.5 pl-5 marker:text-sm marker:text-stone-400">
				{meaning.senses.map((sense) => (
					<li key={sense.text}>
						{sense.text}
						{sense.examples.map((example) => (
							<p className="mt-0.5 text-stone-500 italic" key={example}>
								{example}
							</p>
						))}
					</li>
				))}
			</ol>
		</div>
	));

/** Each origin, with the words it names opening their own entries. */
const Origins = ({
	origins,
	onOpen,
}: {
	origins: OriginPart[][];
	onOpen: Open;
}) => (
	<Section title="Origin">
		<div className="grid gap-2 text-stone-700">
			{origins.map((parts, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: origins are positional.
				<p key={index}>
					{parts.map((part, at) =>
						part.link ? (
							<button
								className="text-stone-950 underline decoration-stone-300 decoration-dotted underline-offset-[3px] hover:decoration-stone-700"
								// biome-ignore lint/suspicious/noArrayIndexKey: parts are positional.
								key={at}
								onClick={() =>
									part.link && onOpen(part.link.word, part.link.language)
								}
								title={`Look up ${part.link.language} “${part.link.word}”`}
								type="button"
							>
								{part.text}
							</button>
						) : (
							part.text
						),
					)}
				</p>
			))}
		</div>
	</Section>
);

const Section = ({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) => (
	<section className="mt-6">
		<h3 className="mb-2 font-sans text-[11px] font-semibold tracking-[0.12em] text-stone-400 uppercase">
			{title}
		</h3>
		{children}
	</section>
);

/** The text with the looked-up word (and its root) in bold, wherever it starts a word. */
const Marked = ({ text, words }: { text: string; words: string[] }) => {
	const escaped = words.map((word) =>
		word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
	);
	const pieces: ReactNode[] = [];
	const pattern = new RegExp(
		`(?<!\\p{L})(?:${escaped.join("|")})\\p{L}*`,
		"giu",
	);
	let last = 0;
	for (const match of text.matchAll(pattern)) {
		pieces.push(text.slice(last, match.index));
		pieces.push(
			<strong className="font-semibold text-stone-950" key={match.index}>
				{match[0]}
			</strong>,
		);
		last = (match.index ?? 0) + match[0].length;
	}
	pieces.push(text.slice(last));
	return pieces;
};
