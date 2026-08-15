import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	clearAlgorithmProgress,
	readAlgorithmProgress,
	writeAlgorithmProgress,
} from "#/algorithm-progress";
import { Button } from "#/components/primitives/button";
import { StudyVisual } from "#/components/study/study-visual";
import { loadFlashcardDecks } from "#/server/flashcard-functions";
import type {
	AlgorithmPath,
	AlgorithmPatternLesson,
	ArchitecturePatternCard,
	FlashcardDecks,
	SystemTermCard,
} from "#/server/flashcards";
import type {
	StudyVisualCatalog,
	StudyVisualSpec,
} from "#/server/study-visuals";

type Deck = "terms" | "patterns" | "algorithms";

const algorithmStages = [
	{ id: "spot", label: "Spot it", prompt: "What clues point here?" },
	{ id: "state", label: "State it", prompt: "What must stay true?" },
	{ id: "write", label: "Write it", prompt: "Can you rebuild the recipe?" },
	{ id: "trace", label: "Trace it", prompt: "Can you run it by hand?" },
	{ id: "choose", label: "Choose it", prompt: "Why this pattern?" },
	{ id: "use", label: "Use it", prompt: "Can you apply it with less help?" },
	{ id: "check", label: "Check it", prompt: "What does it cost?" },
] as const;

export const Route = createFileRoute("/_authenticated/quiz")({
	component: StudyFlashcards,
});

function StudyFlashcards() {
	const [decks, setDecks] = useState<FlashcardDecks | null>(null);
	const [deck, setDeck] = useState<Deck>("terms");
	const [termIndex, setTermIndex] = useState(0);
	const [patternIndex, setPatternIndex] = useState(0);
	const [showTermAnswer, setShowTermAnswer] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		void loadFlashcardDecks()
			.then((nextDecks) => {
				if (isCurrent) setDecks(nextDecks);
			})
			.catch(() => {
				if (isCurrent) {
					setMessage("Could not load your flashcards. Refresh and try again.");
				}
			});

		return () => {
			isCurrent = false;
		};
	}, []);

	function chooseDeck(nextDeck: Deck) {
		setDeck(nextDeck);
		setMessage(null);
		setShowTermAnswer(false);
	}

	function chooseTerm(index: number) {
		setTermIndex(index);
		setShowTermAnswer(false);
	}

	function choosePattern(index: number) {
		setPatternIndex(index);
	}

	if (message) return <Message>{message}</Message>;
	if (!decks) return <Loading />;

	const term = decks.systemTerms[termIndex];
	const pattern = decks.architecturePatterns[patternIndex];

	return (
		<section className="flex min-w-0 flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Study cards
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Learn the building blocks.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Review a system-design term, study an architecture pattern, or learn
					an algorithm pattern in TypeScript.
				</p>
			</div>

			<nav
				className="mt-8 grid gap-2 sm:flex sm:flex-wrap sm:gap-3"
				aria-label="Study decks"
			>
				<DeckButton
					active={deck === "terms"}
					onClick={() => chooseDeck("terms")}
				>
					System design terms
				</DeckButton>
				<DeckButton
					active={deck === "patterns"}
					onClick={() => chooseDeck("patterns")}
				>
					Architecture catalog
				</DeckButton>
				<DeckButton
					active={deck === "algorithms"}
					onClick={() => chooseDeck("algorithms")}
				>
					Algorithms
				</DeckButton>
			</nav>

			{deck === "terms" ? (
				<TermsDeck
					onChoose={chooseTerm}
					onMove={(direction) => {
						setTermIndex((index) =>
							move(index, direction, decks.systemTerms.length),
						);
						setShowTermAnswer(false);
					}}
					onTurn={() => setShowTermAnswer((isShown) => !isShown)}
					selectedIndex={termIndex}
					showAnswer={showTermAnswer}
					studyVisuals={decks.studyVisuals}
					term={term}
					terms={decks.systemTerms}
				/>
			) : null}
			{deck === "patterns" ? (
				<PatternsDeck
					onChoose={choosePattern}
					onMove={(direction) =>
						setPatternIndex((index) =>
							move(index, direction, decks.architecturePatterns.length),
						)
					}
					pattern={pattern}
					patterns={decks.architecturePatterns}
					selectedIndex={patternIndex}
					studyVisuals={decks.studyVisuals}
				/>
			) : null}
			{deck === "algorithms" ? (
				<AlgorithmsDeck
					paths={decks.algorithmPaths}
					studyVisuals={decks.studyVisuals}
				/>
			) : null}
		</section>
	);
}

function TermsDeck({
	terms,
	term,
	selectedIndex,
	showAnswer,
	onChoose,
	onMove,
	onTurn,
	studyVisuals,
}: {
	terms: readonly SystemTermCard[];
	term: SystemTermCard;
	selectedIndex: number;
	showAnswer: boolean;
	onChoose: (index: number) => void;
	onMove: (direction: number) => void;
	onTurn: () => void;
	studyVisuals: StudyVisualCatalog;
}) {
	return (
		<div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
			<ItemPicker
				items={terms}
				onChoose={onChoose}
				selectedIndex={selectedIndex}
				label="Terms"
			/>
			<article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Term {selectedIndex + 1} of {terms.length}
				</p>
				{showAnswer ? (
					<TermAnswer studyVisuals={studyVisuals} term={term} />
				) : (
					<TermFront term={term} />
				)}
				<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(-1)}
					>
						Previous term
					</Button>
					<Button className="w-full sm:w-auto" onClick={onTurn}>
						{showAnswer ? "Show term" : "Show definition"}
					</Button>
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(1)}
					>
						Next term
					</Button>
				</div>
			</article>
		</div>
	);
}

function TermFront({ term }: { term: SystemTermCard }) {
	return (
		<div className="mt-8 min-h-52 content-center text-center sm:mt-12 sm:min-h-60">
			<h2 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
				{term.term}
			</h2>
			<p className="mt-5 leading-7 text-slate-600 sm:text-lg sm:leading-8">
				What does this mean, and why would you use it?
			</p>
		</div>
	);
}

function TermAnswer({
	term,
	studyVisuals,
}: {
	term: SystemTermCard;
	studyVisuals: StudyVisualCatalog;
}) {
	return (
		<div className="mt-8 grid gap-6">
			<div>
				<h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					{term.term}
				</h2>
				<p className="mt-4 leading-7 text-slate-700 sm:text-lg sm:leading-8">
					{term.definition}
				</p>
			</div>
			<StudyVisual
				key={`term:${term.id}`}
				visual={studyVisuals[`term:${term.id}`]}
			/>
			<AnswerSection title="Why it matters">{term.whyItMatters}</AnswerSection>
			<AnswerSection title="Example">{term.example}</AnswerSection>
		</div>
	);
}

function PatternsDeck({
	patterns,
	pattern,
	selectedIndex,
	onChoose,
	onMove,
	studyVisuals,
}: {
	patterns: readonly ArchitecturePatternCard[];
	pattern: ArchitecturePatternCard;
	selectedIndex: number;
	onChoose: (index: number) => void;
	onMove: (direction: number) => void;
	studyVisuals: StudyVisualCatalog;
}) {
	return (
		<div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
			<ItemPicker
				items={patterns}
				label="Patterns"
				onChoose={onChoose}
				selectedIndex={selectedIndex}
			/>
			<article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					{formatArchitectureType(pattern.architectureType)} {selectedIndex + 1}{" "}
					of {patterns.length}
				</p>
				<h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					{pattern.title}
				</h2>
				<p className="mt-4 leading-7 text-slate-700 sm:text-lg sm:leading-8">
					{pattern.description}
				</p>
				<StudyVisual
					key={`architecture:${pattern.id}`}
					visual={studyVisuals[`architecture:${pattern.id}`]}
				/>
				<div className="mt-7 grid gap-4 sm:grid-cols-2">
					<AnswerSection title="What it solves">{pattern.solves}</AnswerSection>
					<AnswerSection title="When to use it">
						{pattern.useWhen}
					</AnswerSection>
					<AnswerSection title="Main cost or risk">
						{pattern.tradeoff}
					</AnswerSection>
					<AnswerSection title="Example">{pattern.example}</AnswerSection>
				</div>
				<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						onClick={() => onMove(-1)}
					>
						Previous item
					</Button>
					<Button className="w-full sm:w-auto" onClick={() => onMove(1)}>
						Next item
					</Button>
				</div>
				<a
					className="mt-6 inline-flex text-sm font-semibold text-amber-700 underline underline-offset-4 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
					href="https://en.wikipedia.org/wiki/List_of_software_architecture_styles_and_patterns"
					rel="noreferrer"
					target="_blank"
				>
					Read the architecture catalog source
				</a>
			</article>
		</div>
	);
}

function AlgorithmsDeck({
	paths,
	studyVisuals,
}: {
	paths: readonly AlgorithmPath[];
	studyVisuals: StudyVisualCatalog;
}) {
	const [pathIndex, setPathIndex] = useState<number | null>(null);
	const [lessonIndex, setLessonIndex] = useState<number | null>(null);
	const [cardIndex, setCardIndex] = useState(0);
	const [showRecipe, setShowRecipe] = useState(false);
	const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(
		new Set(),
	);

	useEffect(() => {
		setCompletedLessonIds(readAlgorithmProgress());
	}, []);

	const path = pathIndex === null ? null : paths[pathIndex];
	const lesson =
		path && lessonIndex !== null ? path.lessons[lessonIndex] : null;

	function openPath(index: number) {
		setPathIndex(index);
		setLessonIndex(null);
		setCardIndex(0);
		setShowRecipe(false);
	}

	function openLesson(index: number) {
		setLessonIndex(index);
		setCardIndex(0);
		setShowRecipe(false);
	}

	function openCard(index: number) {
		setCardIndex(index);
		setShowRecipe(false);
	}

	function toggleLessonComplete(lessonId: string) {
		const next = new Set(completedLessonIds);
		if (next.has(lessonId)) next.delete(lessonId);
		else next.add(lessonId);

		setCompletedLessonIds(next);
		writeAlgorithmProgress(next);
	}

	function clearProgress() {
		if (!window.confirm("Clear all completed algorithm lessons?")) return;
		clearAlgorithmProgress();
		setCompletedLessonIds(new Set());
	}

	if (!path) {
		return (
			<AlgorithmPathOverview
				completedLessonIds={completedLessonIds}
				onClear={clearProgress}
				onOpen={openPath}
				paths={paths}
			/>
		);
	}

	if (!lesson) {
		return (
			<AlgorithmPathLessons
				completedLessonIds={completedLessonIds}
				onBack={() => setPathIndex(null)}
				onOpen={openLesson}
				path={path}
			/>
		);
	}

	return (
		<AlgorithmLesson
			cardIndex={cardIndex}
			isComplete={completedLessonIds.has(lesson.id)}
			lesson={lesson}
			onBack={() => setLessonIndex(null)}
			onOpenCard={openCard}
			onToggleComplete={() => toggleLessonComplete(lesson.id)}
			onToggleRecipe={() => setShowRecipe((isShown) => !isShown)}
			path={path}
			showRecipe={showRecipe}
			visual={studyVisuals[`algorithm:${lesson.id}`]}
		/>
	);
}

function AlgorithmPathOverview({
	paths,
	completedLessonIds,
	onOpen,
	onClear,
}: {
	paths: readonly AlgorithmPath[];
	completedLessonIds: ReadonlySet<string>;
	onOpen: (index: number) => void;
	onClear: () => void;
}) {
	const totalLessons = paths.reduce(
		(sum, path) => sum + path.lessons.length,
		0,
	);
	const completedLessons = paths.reduce(
		(sum, path) => sum + _completedCount(path, completedLessonIds),
		0,
	);

	return (
		<section className="mt-8">
			<header className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-sm">
				<div className="grid sm:grid-cols-[9rem_1fr]">
					<div className="flex items-center bg-amber-400 px-6 py-5 font-mono text-sm font-semibold uppercase tracking-[0.18em] text-slate-950 sm:items-start sm:py-8">
						29 patterns
					</div>
					<div className="px-6 py-7 sm:p-8">
						<p className="text-sm font-medium text-amber-300">Pattern paths</p>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
							Learn the move before the problem.
						</h2>
						<p className="mt-3 max-w-2xl leading-7 text-slate-300">
							Pick a path. Each lesson trains you to spot, state, write, trace,
							choose, and use one pattern.
						</p>
					</div>
				</div>
			</header>

			<div className="mt-6 grid gap-4 md:grid-cols-2">
				{paths.map((path, index) => {
					const completed = _completedCount(path, completedLessonIds);
					return (
						<button
							className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:p-6"
							key={path.id}
							onClick={() => onOpen(index)}
							type="button"
						>
							<div className="flex items-start justify-between gap-4">
								<p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
									Path {String(index + 1).padStart(2, "0")}
								</p>
								<span className="text-sm text-slate-500">
									{path.lessons.length} lessons
								</span>
							</div>
							<h3 className="mt-4 text-xl font-semibold tracking-tight text-slate-950 group-hover:text-amber-800 dark:group-hover:text-amber-300">
								{path.title}
							</h3>
							<p className="mt-2 leading-7 text-slate-600">{path.summary}</p>
							<AlgorithmProgress
								completed={completed}
								total={path.lessons.length}
							/>
						</button>
					);
				})}
			</div>

			<div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
				<p>
					{completedLessons} of {totalLessons} lessons complete
				</p>
				{completedLessons > 0 ? (
					<Button
						className="bg-transparent px-0 text-red-700 hover:bg-transparent"
						onClick={onClear}
					>
						Clear progress
					</Button>
				) : null}
			</div>
		</section>
	);
}

function AlgorithmPathLessons({
	path,
	completedLessonIds,
	onBack,
	onOpen,
}: {
	path: AlgorithmPath;
	completedLessonIds: ReadonlySet<string>;
	onBack: () => void;
	onOpen: (index: number) => void;
}) {
	const completed = _completedCount(path, completedLessonIds);

	return (
		<section className="mt-8">
			<Button
				className="bg-transparent px-0 text-amber-800 hover:bg-transparent dark:text-amber-300"
				onClick={onBack}
			>
				← All paths
			</Button>
			<header className="mt-4 grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_13rem] sm:p-8">
				<div>
					<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
						Pattern path
					</p>
					<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
						{path.title}
					</h2>
					<p className="mt-3 leading-7 text-slate-600">{path.summary}</p>
				</div>
				<div className="self-center">
					<AlgorithmProgress
						completed={completed}
						total={path.lessons.length}
					/>
				</div>
			</header>

			<ol className="mt-5 grid gap-3">
				{path.lessons.map((lesson, index) => {
					const isComplete = completedLessonIds.has(lesson.id);
					return (
						<li key={lesson.id}>
							<button
								className="group grid w-full grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:gap-5 sm:px-5"
								onClick={() => onOpen(index)}
								type="button"
							>
								<span className="font-mono text-sm text-slate-500">
									{String(index + 1).padStart(2, "0")}
								</span>
								<span>
									<span className="block font-semibold text-slate-950 group-hover:text-amber-800 dark:group-hover:text-amber-300">
										{lesson.title}
									</span>
									<span className="mt-1 block text-sm leading-6 text-slate-600">
										{lesson.summary}
									</span>
								</span>
								<span
									className={
										isComplete
											? "col-start-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 sm:col-start-auto"
											: "col-start-2 text-slate-400 sm:col-start-auto"
									}
								>
									{isComplete ? "Complete" : "→"}
								</span>
							</button>
						</li>
					);
				})}
			</ol>
		</section>
	);
}

function AlgorithmLesson({
	path,
	lesson,
	cardIndex,
	showRecipe,
	isComplete,
	onBack,
	onOpenCard,
	onToggleRecipe,
	onToggleComplete,
	visual,
}: {
	path: AlgorithmPath;
	lesson: AlgorithmPatternLesson;
	cardIndex: number;
	showRecipe: boolean;
	isComplete: boolean;
	onBack: () => void;
	onOpenCard: (index: number) => void;
	onToggleRecipe: () => void;
	onToggleComplete: () => void;
	visual: StudyVisualSpec;
}) {
	const stage = algorithmStages[cardIndex];
	const isFirst = cardIndex === 0;
	const isLast = cardIndex === algorithmStages.length - 1;

	return (
		<section className="mt-8">
			<Button
				className="bg-transparent px-0 text-amber-800 hover:bg-transparent dark:text-amber-300"
				onClick={onBack}
			>
				← {path.title}
			</Button>

			<nav aria-label="Lesson cards" className="mt-4">
				<ol className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-white min-[420px]:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7">
					{algorithmStages.map((item, index) => (
						<li
							className="border-b border-r border-slate-200 last:border-b-0 lg:border-b-0 lg:last:border-r-0"
							key={item.id}
						>
							<button
								aria-current={index === cardIndex ? "step" : undefined}
								className={
									index === cardIndex
										? "w-full bg-amber-400 px-3 py-2.5 text-left text-slate-950 sm:py-3"
										: "w-full px-3 py-2.5 text-left text-slate-600 transition hover:bg-slate-50 sm:py-3"
								}
								onClick={() => onOpenCard(index)}
								type="button"
							>
								<span className="block font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em]">
									{String(index + 1).padStart(2, "0")}
								</span>
								<span className="mt-1 block text-sm font-semibold leading-5">
									{item.label}
								</span>
							</button>
						</li>
					))}
				</ol>
			</nav>

			<article className="mt-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
					<div>
						<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
							{lesson.title} · {stage.label}
						</p>
						<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
							{stage.prompt}
						</h2>
					</div>
					<span className="shrink-0 font-mono text-sm text-slate-500">
						{cardIndex + 1} / {algorithmStages.length}
					</span>
				</div>

				<StudyVisual key={`algorithm:${lesson.id}`} visual={visual} />

				<AlgorithmLessonContent
					cardIndex={cardIndex}
					lesson={lesson}
					onToggleRecipe={onToggleRecipe}
					showRecipe={showRecipe}
				/>

				<div className="mt-8 grid gap-3 border-t border-slate-200 pt-6 sm:flex sm:flex-wrap sm:justify-between">
					<Button
						className="w-full bg-slate-200 text-slate-800 hover:bg-slate-300 sm:w-auto"
						disabled={isFirst}
						onClick={() => onOpenCard(cardIndex - 1)}
					>
						Previous card
					</Button>
					{isLast ? (
						<Button
							className={
								isComplete
									? "w-full bg-emerald-100 text-emerald-900 hover:bg-emerald-200 sm:w-auto"
									: "w-full bg-emerald-700 text-white hover:bg-emerald-800 sm:w-auto"
							}
							onClick={onToggleComplete}
						>
							{isComplete ? "Mark incomplete" : "Mark lesson complete"}
						</Button>
					) : (
						<Button
							className="w-full sm:w-auto"
							onClick={() => onOpenCard(cardIndex + 1)}
						>
							Next card
						</Button>
					)}
				</div>
			</article>
		</section>
	);
}

function AlgorithmLessonContent({
	lesson,
	cardIndex,
	showRecipe,
	onToggleRecipe,
}: {
	lesson: AlgorithmPatternLesson;
	cardIndex: number;
	showRecipe: boolean;
	onToggleRecipe: () => void;
}) {
	if (cardIndex === 0) return <LessonText>{lesson.spot}</LessonText>;

	if (cardIndex === 1) {
		return (
			<div className="mt-6 rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5 dark:bg-slate-800">
				<p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-300">
					Say this before you code
				</p>
				<p className="mt-3 leading-7 text-slate-800 sm:text-lg">
					{lesson.state}
				</p>
			</div>
		);
	}

	if (cardIndex === 2) {
		return (
			<div className="mt-6">
				<p className="leading-7 text-slate-700 sm:text-lg">
					Write the shape from memory. Name each moving part before you reveal
					it.
				</p>
				<Button className="mt-5" onClick={onToggleRecipe}>
					{showRecipe ? "Hide recipe" : "Reveal TypeScript recipe"}
				</Button>
				{showRecipe ? <CodeRecipe code={lesson.recipe} /> : null}
			</div>
		);
	}

	if (cardIndex === 3) return <LessonText>{lesson.trace}</LessonText>;
	if (cardIndex === 4) return <LessonText>{lesson.choose}</LessonText>;

	if (cardIndex === 5) {
		return (
			<ol className="mt-6 grid gap-3">
				{lesson.problems.map((problem, index) => (
					<li
						className="rounded-xl border border-slate-200 bg-slate-50 p-4"
						key={problem.slug}
					>
						<div className="flex items-start gap-4">
							<span className="font-mono text-xs font-semibold text-amber-700 dark:text-amber-300">
								{String(index + 1).padStart(2, "0")}
							</span>
							<div>
								<a
									className="font-semibold text-slate-950 underline decoration-amber-400 decoration-2 underline-offset-4 hover:text-amber-800 dark:hover:text-amber-300"
									href={`https://leetcode.com/problems/${problem.slug}/`}
									rel="noreferrer"
									target="_blank"
								>
									{problem.title}
								</a>
								<p className="mt-2 leading-6 text-slate-600">
									{problem.prompt}
								</p>
							</div>
						</div>
					</li>
				))}
			</ol>
		);
	}

	return (
		<div className="mt-6 grid gap-4 sm:grid-cols-2">
			<AnswerSection title="Time and memory">{lesson.complexity}</AnswerSection>
			<AnswerSection title="Common mistake">{lesson.mistake}</AnswerSection>
		</div>
	);
}

function LessonText({ children }: { children: string }) {
	return (
		<p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
			{children}
		</p>
	);
}

function CodeRecipe({ code }: { code: string }) {
	return (
		<section className="mt-5 overflow-hidden rounded-xl border border-slate-700 bg-black">
			<p className="border-b border-slate-700 px-4 py-3 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
				TypeScript recipe
			</p>
			<pre className="overflow-x-auto p-4 text-sm leading-6 text-slate-100">
				<code>{code}</code>
			</pre>
		</section>
	);
}

function AlgorithmProgress({
	completed,
	total,
}: {
	completed: number;
	total: number;
}) {
	const percent = total === 0 ? 0 : (completed / total) * 100;

	return (
		<div className="mt-5">
			<div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
				<span>{completed} complete</span>
				<span>{total}</span>
			</div>
			<div
				aria-label={`${completed} of ${total} lessons complete`}
				aria-valuemax={total}
				aria-valuemin={0}
				aria-valuenow={completed}
				className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"
				role="progressbar"
			>
				<div
					className="h-full rounded-full bg-amber-400"
					style={{ width: `${percent}%` }}
				/>
			</div>
		</div>
	);
}

function _completedCount(
	path: AlgorithmPath,
	completedLessonIds: ReadonlySet<string>,
) {
	return path.lessons.filter((lesson) => completedLessonIds.has(lesson.id))
		.length;
}

function ItemPicker<T extends { id: string; title?: string; term?: string }>({
	items,
	selectedIndex,
	onChoose,
	label,
}: {
	items: readonly T[];
	selectedIndex: number;
	onChoose: (index: number) => void;
	label: string;
}) {
	return (
		<aside>
			<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
				{label}
			</h2>
			<div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-col">
				{items.map((item, index) => (
					<Button
						className={
							index === selectedIndex
								? "w-full bg-slate-200 text-center"
								: "w-full text-center"
						}
						key={item.id}
						onClick={() => onChoose(index)}
					>
						{item.title ?? item.term}
					</Button>
				))}
			</div>
		</aside>
	);
}

function AnswerSection({
	title,
	children,
}: {
	title: string;
	children: string;
}) {
	return (
		<section className="rounded-xl bg-slate-50 p-4">
			<h3 className="font-semibold text-slate-950">{title}</h3>
			<p className="mt-2 leading-7 text-slate-700">{children}</p>
		</section>
	);
}

function DeckButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: string;
	onClick: () => void;
}) {
	return (
		<Button
			className={active ? "w-full bg-slate-200 sm:w-auto" : "w-full sm:w-auto"}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function Loading() {
	return <p className="py-14 text-slate-600">Loading flashcards…</p>;
}

function Message({ children }: { children: string }) {
	return <p className="py-14 text-red-700">{children}</p>;
}

function move(index: number, direction: number, length: number) {
	return (index + direction + length) % length;
}

function formatArchitectureType(
	architectureType: ArchitecturePatternCard["architectureType"],
) {
	return architectureType === "style" ? "Style" : "Pattern";
}
