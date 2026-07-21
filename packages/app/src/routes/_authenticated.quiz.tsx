import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RehearsalForm } from "#/components/interview/rehearsal-form";
import { Button } from "#/components/primitives/button";
import {
	completeInterview,
	createInterviewProgress,
	dueInterviewIds,
	type InterviewProgress,
	loadInterviewProgress,
	type MissReason,
	saveInterviewProgress,
	setInterviewMissReasons,
} from "#/interview-progress";
import type {
	CurrentBriefing,
	InterviewGuide,
	InterviewRehearsalPublic,
	InterviewTrack,
} from "#/server/interview";
import {
	loadCurrentBriefings,
	loadInterviewCatalog,
	loadInterviewGuide,
} from "#/server/interview-functions";

type View = "today" | InterviewTrack | "current";

const missReasons: readonly { id: MissReason; label: string }[] = [
	{ id: "pattern", label: "I did not find the right pattern." },
	{ id: "code", label: "My code had a problem." },
	{ id: "edge-case", label: "I missed an edge case." },
	{ id: "scale", label: "I did not size the system well." },
	{ id: "trade-off", label: "I did not explain a trade-off." },
	{ id: "explanation", label: "I did not explain my answer clearly." },
	{ id: "current-fact", label: "I needed a current technical fact." },
];

export const Route = createFileRoute("/_authenticated/quiz")({
	component: InterviewHub,
});

function InterviewHub() {
	const [progress, setProgress] = useState(createInterviewProgress);
	const [catalog, setCatalog] = useState<readonly InterviewRehearsalPublic[]>(
		[],
	);
	const [briefings, setBriefings] = useState<readonly CurrentBriefing[]>([]);
	const [view, setView] = useState<View>("today");
	const [active, setActive] = useState<InterviewRehearsalPublic | null>(null);
	const [guide, setGuide] = useState<InterviewGuide | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		async function load() {
			try {
				const [nextCatalog, nextBriefings] = await Promise.all([
					loadInterviewCatalog(),
					loadCurrentBriefings(),
				]);
				if (!isCurrent) return;

				setCatalog(nextCatalog);
				setBriefings(nextBriefings);
				setProgress(loadInterviewProgress());
			} catch {
				if (isCurrent)
					setMessage(
						"Could not load interview practice. Refresh and try again.",
					);
			} finally {
				if (isCurrent) setIsLoading(false);
			}
		}

		void load();
		return () => {
			isCurrent = false;
		};
	}, []);

	function updateProgress(
		update: (current: InterviewProgress) => InterviewProgress,
	) {
		setProgress((current) => {
			const next = update(current);
			saveInterviewProgress(next);
			return next;
		});
	}

	function open(rehearsal: InterviewRehearsalPublic) {
		setActive(rehearsal);
		setGuide(null);
		setMessage(null);
	}

	async function finish(rehearsal: InterviewRehearsalPublic) {
		const nextGuide = await loadInterviewGuide({
			data: { rehearsalId: rehearsal.id },
		});
		setGuide(nextGuide);
		updateProgress((current) =>
			completeInterview(current, rehearsal.id, _localDate()),
		);
	}

	function returnToHub(nextView: View = "today") {
		setActive(null);
		setGuide(null);
		setView(nextView);
	}

	if (isLoading) return <Loading />;

	return (
		<section className="flex flex-1 flex-col py-10 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-blue-700">Interview practice</p>
				<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
					Practise the whole interview.
				</h1>
				<p className="mt-4 text-lg leading-8 text-slate-600">
					Write an answer first. Then use the guide to see what you missed and
					come back when it is due.
				</p>
			</div>

			{active ? (
				<Rehearsal
					guide={guide}
					onBack={() => returnToHub(active.track)}
					onFinish={() => finish(active)}
					onMissReasonsChange={(reasons) =>
						updateProgress((current) =>
							setInterviewMissReasons(current, active.id, reasons),
						)
					}
					progress={progress}
					rehearsal={active}
				/>
			) : (
				<>
					<nav
						className="mt-8 flex flex-wrap gap-3"
						aria-label="Interview practice sections"
					>
						<NavButton
							active={view === "today"}
							onClick={() => setView("today")}
						>
							Today
						</NavButton>
						<NavButton
							active={view === "coding"}
							onClick={() => setView("coding")}
						>
							Coding
						</NavButton>
						<NavButton
							active={view === "system-design"}
							onClick={() => setView("system-design")}
						>
							System design
						</NavButton>
						<NavButton
							active={view === "current"}
							onClick={() => setView("current")}
						>
							Keep current
						</NavButton>
					</nav>

					{message ? <Message>{message}</Message> : null}

					<div className="mt-8">
						{view === "today" ? (
							<Today catalog={catalog} onOpen={open} progress={progress} />
						) : null}
						{view === "coding" || view === "system-design" ? (
							<Catalog
								onOpen={open}
								progress={progress}
								rehearsals={catalog.filter((item) => item.track === view)}
								title={
									view === "coding"
										? "Coding rehearsals"
										: "System-design rehearsals"
								}
							/>
						) : null}
						{view === "current" ? <Briefings briefings={briefings} /> : null}
					</div>
				</>
			)}
		</section>
	);
}

function Today({
	catalog,
	progress,
	onOpen,
}: {
	catalog: readonly InterviewRehearsalPublic[];
	progress: InterviewProgress;
	onOpen: (rehearsal: InterviewRehearsalPublic) => void;
}) {
	const today = _localDate();
	const due = dueInterviewIds(progress, today)
		.map((id) => catalog.find((item) => item.id === id))
		.filter((item): item is InterviewRehearsalPublic => Boolean(item));
	const completed = Object.keys(progress.attempts).length;
	const nextTrack: InterviewTrack =
		completed % 2 === 0 ? "coding" : "system-design";
	const nextNew =
		catalog.find(
			(item) => item.track === nextTrack && !progress.attempts[item.id],
		) ?? catalog.find((item) => !progress.attempts[item.id]);

	return (
		<div className="grid gap-6">
			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<p className="text-sm font-medium text-blue-700">Your next step</p>
				<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
					{due.length > 0
						? "Review work that is due."
						: "Start one new rehearsal."}
				</h2>
				<p className="mt-3 leading-7 text-slate-600">
					{due.length > 0
						? "Repeat the work before you add more. The guide will show your last miss reasons."
						: "Today alternates between coding and system design. Take the time limit seriously, then use the guide."}
				</p>
				{due[0] ? (
					<Button className="mt-6" onClick={() => onOpen(due[0])}>
						Review {due[0].title}
					</Button>
				) : nextNew ? (
					<Button className="mt-6" onClick={() => onOpen(nextNew)}>
						Start {nextNew.title}
					</Button>
				) : (
					<p className="mt-6 text-sm text-slate-600">
						You have completed the core set. Pick any rehearsal to keep it
						fresh.
					</p>
				)}
			</section>

			{due.length > 1 ? (
				<section>
					<h2 className="text-lg font-semibold text-slate-950">Also due</h2>
					<div className="mt-3 grid gap-3">
						{due.slice(1).map((item) => (
							<button
								className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400"
								key={item.id}
								onClick={() => onOpen(item)}
								type="button"
							>
								<span className="font-semibold text-slate-950">
									{item.title}
								</span>
								<span className="ml-2 text-sm text-slate-600">
									{item.track === "coding" ? "Coding" : "System design"}
								</span>
							</button>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}

function Catalog({
	title,
	rehearsals,
	progress,
	onOpen,
}: {
	title: string;
	rehearsals: readonly InterviewRehearsalPublic[];
	progress: InterviewProgress;
	onOpen: (rehearsal: InterviewRehearsalPublic) => void;
}) {
	return (
		<section>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
				{title}
			</h2>
			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{rehearsals.map((item) => {
					const attempt = progress.attempts[item.id];
					return (
						<article
							className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							key={item.id}
						>
							<p className="text-sm font-medium text-blue-700">
								{item.durationMinutes} minutes
							</p>
							<h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
								{item.title}
							</h3>
							<p className="mt-3 leading-7 text-slate-600">{item.summary}</p>
							<p className="mt-4 text-sm text-slate-500">
								{attempt ? `Next review: ${attempt.dueOn}` : "Not started"}
							</p>
							<Button className="mt-5 self-start" onClick={() => onOpen(item)}>
								{attempt ? "Practise again" : "Start rehearsal"}
							</Button>
						</article>
					);
				})}
			</div>
		</section>
	);
}

function Rehearsal({
	rehearsal,
	guide,
	progress,
	onBack,
	onFinish,
	onMissReasonsChange,
}: {
	rehearsal: InterviewRehearsalPublic;
	guide: InterviewGuide | null;
	progress: InterviewProgress;
	onBack: () => void;
	onFinish: () => Promise<void>;
	onMissReasonsChange: (reasons: readonly MissReason[]) => void;
}) {
	const selectedReasons = progress.attempts[rehearsal.id]?.missReasons ?? [];

	return (
		<div className="mt-8 grid gap-6">
			<Button
				className="w-fit bg-slate-200 text-slate-800 hover:bg-slate-300"
				onClick={onBack}
			>
				Back to {rehearsal.track === "coding" ? "coding" : "system design"}
			</Button>
			<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
				<div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-600">
					<span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
						{rehearsal.track === "coding" ? "Coding" : "System design"}
					</span>
					<span>{rehearsal.durationMinutes} minutes</span>
				</div>
				<h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
					{rehearsal.title}
				</h2>
				<p className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-700">
					{rehearsal.prompt}
				</p>

				<section className="mt-7 rounded-xl bg-slate-50 p-4">
					<h3 className="font-semibold text-slate-950">
						Questions to ask first
					</h3>
					<ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
						{rehearsal.clarifyingQuestions.map((question) => (
							<li key={question}>• {question}</li>
						))}
					</ul>
				</section>

				{guide ? (
					<Guide
						guide={guide}
						onMissReasonsChange={onMissReasonsChange}
						rehearsal={rehearsal}
						selectedReasons={selectedReasons}
					/>
				) : (
					<RehearsalForm
						key={rehearsal.id}
						onSubmit={onFinish}
						rehearsal={rehearsal}
					/>
				)}
			</article>
		</div>
	);
}

function Guide({
	rehearsal,
	guide,
	selectedReasons,
	onMissReasonsChange,
}: {
	rehearsal: InterviewRehearsalPublic;
	guide: InterviewGuide;
	selectedReasons: readonly MissReason[];
	onMissReasonsChange: (reasons: readonly MissReason[]) => void;
}) {
	function toggle(reason: MissReason) {
		onMissReasonsChange(
			selectedReasons.includes(reason)
				? selectedReasons.filter((item) => item !== reason)
				: [...selectedReasons, reason],
		);
	}

	return (
		<section className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
			<p className="text-sm font-semibold text-emerald-900">Guide</p>
			<h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
				Reference approach
			</h3>
			<p className="mt-1 whitespace-pre-wrap leading-7 text-slate-800">
				{guide.answer}
			</p>
			<h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-600">
				Check for these points
			</h3>
			<ul className="mt-1 grid gap-1 text-sm leading-6 text-slate-700">
				{guide.checklist.map((item) => (
					<li key={item}>• {item}</li>
				))}
			</ul>
			<h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-600">
				Common misses
			</h3>
			<ul className="mt-1 grid gap-1 text-sm leading-6 text-slate-700">
				{guide.commonMisses.map((item) => (
					<li key={item}>• {item}</li>
				))}
			</ul>
			{rehearsal.seniorFollowUps.length > 0 ? (
				<>
					<h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-600">
						Senior and staff follow-ups
					</h3>
					<ul className="mt-1 grid gap-1 text-sm leading-6 text-slate-700">
						{rehearsal.seniorFollowUps.map((item) => (
							<li key={item}>• {item}</li>
						))}
					</ul>
				</>
			) : null}
			<fieldset className="mt-6 border-t border-emerald-200 pt-5">
				<legend className="text-sm font-semibold text-slate-950">
					What should you revisit?
				</legend>
				<div className="mt-3 grid gap-2">
					{missReasons.map((reason) => (
						<label
							className="flex items-start gap-2 text-sm leading-6 text-slate-700"
							key={reason.id}
						>
							<input
								checked={selectedReasons.includes(reason.id)}
								onChange={() => toggle(reason.id)}
								type="checkbox"
							/>
							{reason.label}
						</label>
					))}
				</div>
			</fieldset>
		</section>
	);
}

function Briefings({ briefings }: { briefings: readonly CurrentBriefing[] }) {
	const today = _localDate();
	return (
		<section>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
				Keep current
			</h2>
			<p className="mt-3 max-w-2xl leading-7 text-slate-600">
				These cards link to the source and show when we last checked them. They
				are short because they support practice; they do not replace it.
			</p>
			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{briefings.map((card) => {
					const needsReview = card.reviewBy < today;
					return (
						<article
							className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							key={card.id}
						>
							<p
								className={`text-sm font-medium ${needsReview ? "text-amber-700" : "text-blue-700"}`}
							>
								{needsReview ? "Needs review" : "Checked"} {card.checkedOn}
							</p>
							<h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
								{card.title}
							</h3>
							<p className="mt-3 font-medium leading-6 text-slate-800">
								{card.question}
							</p>
							<p className="mt-3 leading-7 text-slate-700">{card.answer}</p>
							<p className="mt-3 text-sm leading-6 text-slate-600">
								{card.whyItMatters}
							</p>
							<a
								className="mt-4 inline-flex text-sm font-semibold text-blue-700 underline underline-offset-4"
								href={card.sourceUrl}
								rel="noreferrer"
								target="_blank"
							>
								Read {card.sourceName}
							</a>
						</article>
					);
				})}
			</div>
		</section>
	);
}

function NavButton({
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
			className={
				active ? undefined : "bg-slate-200 text-slate-800 hover:bg-slate-300"
			}
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

function Message({ children }: { children: string }) {
	return (
		<p
			className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
			role="alert"
		>
			{children}
		</p>
	);
}

function Loading() {
	return (
		<div className="mt-10 rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
			Loading interview practice…
		</div>
	);
}

function _localDate() {
	const date = new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
