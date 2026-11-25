import { createContext, type ReactNode, useEffect, useState } from "react";
import type { WordEntry } from "#/server/word-lookup";
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

/**
 * A dictionary entry in the notes column: meanings, origin, similar words,
 * and the word in use. Similar words open in place, with a way back.
 */
export const WordPanel = ({
	word,
	onClose,
}: {
	word: string;
	onClose: () => void;
}) => {
	const [trail, setTrail] = useState([word]);
	const current = trail[trail.length - 1];
	const [entry, setEntry] = useState<WordEntry | null | undefined>(undefined);

	useEffect(() => {
		let active = true;
		setEntry(undefined);
		lookUpWritingWord({ data: { word: current } })
			.then((found) => active && setEntry(found))
			.catch(() => active && setEntry(null));
		return () => {
			active = false;
		};
	}, [current]);

	const open = (next: string) => setTrail((words) => [...words, next]);
	const rail =
		"inline-flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-stone-200 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100";

	return (
		<section
			aria-label={`Dictionary: ${current}`}
			className="flex h-full max-sm:flex-col-reverse"
		>
			<div className="min-h-0 flex-1 overflow-y-auto bg-white px-6 pt-10 pb-12 font-book text-stone-900 shadow-[0_1px_3px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.06)] sm:px-10">
				{entry === undefined ? (
					<p className="text-stone-400">Looking up “{current}”…</p>
				) : entry === null ? (
					<p className="text-stone-500">
						Couldn’t reach the dictionary. Check your connection and try again.
					</p>
				) : (
					<Entry entry={entry} onOpen={open} />
				)}
			</div>
			<aside
				aria-label="Dictionary controls"
				className="flex shrink-0 gap-3 text-xs text-stone-500 max-sm:items-center max-sm:px-3 max-sm:py-2 sm:w-36 sm:flex-col sm:items-start sm:pl-4"
			>
				<button className={rail} onClick={onClose} type="button">
					<svg
						aria-hidden="true"
						fill="none"
						height="14"
						stroke="currentColor"
						strokeLinecap="round"
						strokeWidth="2"
						viewBox="0 0 24 24"
						width="14"
					>
						<path d="M18 6 6 18M6 6l12 12" />
					</svg>
					Close
				</button>
				{trail.length > 1 ? (
					<button
						className={rail}
						onClick={() => setTrail((words) => words.slice(0, -1))}
						type="button"
					>
						‹ {trail[trail.length - 2]}
					</button>
				) : null}
			</aside>
		</section>
	);
};

const Entry = ({
	entry,
	onOpen,
}: {
	entry: WordEntry;
	onOpen: (word: string) => void;
}) => {
	const found =
		entry.meanings.length ||
		entry.root?.meanings.length ||
		entry.origins.length;
	const highlight = [entry.word, entry.root?.word].filter(
		(word): word is string => Boolean(word),
	);
	return (
		<article className="text-[15px] leading-relaxed">
			<header className="mb-6">
				<h2 className="font-book text-3xl text-stone-950">{entry.word}</h2>
				{entry.pronunciation ? (
					<p className="mt-1 text-stone-500">{entry.pronunciation}</p>
				) : null}
			</header>

			{found ? null : (
				<p className="mb-6 text-stone-500">
					No dictionary entry for “{entry.word}”.
				</p>
			)}

			<Meanings meanings={entry.meanings} />
			{entry.origins.length ? <Origins origins={entry.origins} /> : null}

			{entry.root ? (
				<div className="mt-8 border-t border-stone-200 pt-6">
					<button
						className="font-book text-2xl text-stone-950 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-600"
						onClick={() => onOpen(entry.root?.word ?? "")}
						type="button"
					>
						{entry.root.word}
					</button>
					<div className="mt-4">
						<Meanings meanings={entry.root.meanings} />
						{entry.root.origins.length ? (
							<Origins origins={entry.root.origins} />
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
								onClick={() => onOpen(word)}
								type="button"
							>
								{word}
							</button>
						))}
					</div>
				</Section>
			) : null}

			{entry.examples.length ? (
				<Section title="In use">
					<ul className="grid gap-2">
						{entry.examples.map((example) => (
							<li className="text-stone-700" key={example}>
								<Marked text={example} words={highlight} />
							</li>
						))}
					</ul>
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

			<footer className="mt-10 font-sans text-[11px] leading-normal text-stone-400">
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
				(CC BY-SA). Sentences from Tatoeba (CC BY). Similar words from Datamuse.
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

const Origins = ({ origins }: { origins: string[] }) => (
	<Section title="Origin">
		<div className="grid gap-2 text-stone-700">
			{origins.map((origin) => (
				<p key={origin}>{origin}</p>
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
	<section className="mt-7">
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
