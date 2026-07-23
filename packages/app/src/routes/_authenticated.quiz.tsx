import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RehearsalForm } from "#/components/interview/rehearsal-form";
import { Button } from "#/components/primitives/button";
import type {
	CurrentBriefing,
	InterviewGuide,
	InterviewNumber,
	InterviewRehearsalPublic,
	InterviewTrack,
} from "#/server/interview";
import {
	loadCurrentBriefings,
	loadInterviewCatalog,
	loadInterviewGuide,
	loadInterviewNumbers,
} from "#/server/interview-functions";

type View = InterviewTrack | "current" | "numbers";

export const Route = createFileRoute("/_authenticated/quiz")({
	component: InterviewHub,
});

function InterviewHub() {
	const [catalog, setCatalog] = useState<readonly InterviewRehearsalPublic[]>(
		[],
	);
	const [briefings, setBriefings] = useState<readonly CurrentBriefing[]>([]);
	const [numbers, setNumbers] = useState<readonly InterviewNumber[]>([]);
	const [view, setView] = useState<View>("coding");
	const [active, setActive] = useState<InterviewRehearsalPublic | null>(null);
	const [guide, setGuide] = useState<InterviewGuide | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		async function load() {
			try {
				const [nextCatalog, nextBriefings, nextNumbers] = await Promise.all([
					loadInterviewCatalog(),
					loadCurrentBriefings(),
					loadInterviewNumbers(),
				]);
				if (!isCurrent) return;

				setCatalog(nextCatalog);
				setBriefings(nextBriefings);
				setNumbers(nextNumbers);
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

	function open(rehearsal: InterviewRehearsalPublic) {
		setActive(rehearsal);
		setGuide(null);
		setMessage(null);
	}

	async function showGuide(rehearsal: InterviewRehearsalPublic) {
		const nextGuide = await loadInterviewGuide({
			data: { rehearsalId: rehearsal.id },
		});
		setGuide(nextGuide);
	}

	function returnToHub(nextView: View = "coding") {
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
					Choose the interview work you need.
				</h1>
				<p className="mt-4 text-lg leading-8 text-slate-600">
					Write an answer when you want to practise, or open the guide whenever
					you need help.
				</p>
			</div>

			{active ? (
				<Rehearsal
					guide={guide}
					onBack={() => returnToHub(active.track)}
					onShowGuide={() => showGuide(active)}
					rehearsal={active}
				/>
			) : (
				<>
					<nav
						className="mt-8 flex flex-wrap gap-3"
						aria-label="Interview practice sections"
					>
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
						<NavButton
							active={view === "numbers"}
							onClick={() => setView("numbers")}
						>
							Numbers to know
						</NavButton>
					</nav>

					{message ? <Message>{message}</Message> : null}

					<div className="mt-8">
						{view === "coding" || view === "system-design" ? (
							<Catalog
								onOpen={open}
								rehearsals={catalog.filter((item) => item.track === view)}
								title={
									view === "coding"
										? "Coding rehearsals"
										: "System-design rehearsals"
								}
							/>
						) : null}
						{view === "current" ? <Briefings briefings={briefings} /> : null}
						{view === "numbers" ? <Numbers numbers={numbers} /> : null}
					</div>
				</>
			)}
		</section>
	);
}

function Catalog({
	title,
	rehearsals,
	onOpen,
}: {
	title: string;
	rehearsals: readonly InterviewRehearsalPublic[];
	onOpen: (rehearsal: InterviewRehearsalPublic) => void;
}) {
	return (
		<section>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
				{title}
			</h2>
			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{rehearsals.map((item) => (
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
						<Button className="mt-5 self-start" onClick={() => onOpen(item)}>
							Open rehearsal
						</Button>
					</article>
				))}
			</div>
		</section>
	);
}

function Rehearsal({
	rehearsal,
	guide,
	onBack,
	onShowGuide,
}: {
	rehearsal: InterviewRehearsalPublic;
	guide: InterviewGuide | null;
	onBack: () => void;
	onShowGuide: () => Promise<void>;
}) {
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
					<Guide guide={guide} rehearsal={rehearsal} />
				) : (
					<RehearsalForm
						key={rehearsal.id}
						onShowGuide={onShowGuide}
						onSubmit={onShowGuide}
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
}: {
	rehearsal: InterviewRehearsalPublic;
	guide: InterviewGuide;
}) {
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
		</section>
	);
}

function Briefings({ briefings }: { briefings: readonly CurrentBriefing[] }) {
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
				{briefings.map((card) => (
					<article
						className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
						key={card.id}
					>
						<p className="text-sm font-medium text-blue-700">
							Checked {card.checkedOn}
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
				))}
			</div>
		</section>
	);
}

function Numbers({ numbers }: { numbers: readonly InterviewNumber[] }) {
	return (
		<section>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-950">
				Numbers to know
			</h2>
			<p className="mt-3 max-w-2xl leading-7 text-slate-600">
				Use these as starting points for estimates, not fixed laws. State the
				workload, then measure the real limit.
			</p>
			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				{numbers.map((card) => (
					<article
						className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
						key={card.id}
					>
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-sm font-medium text-blue-700">
								{card.category}
							</p>
							<p className="text-sm text-slate-500">Checked {card.checkedOn}</p>
						</div>
						<h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
							{card.title}
						</h3>
						<p className="mt-3 text-lg font-semibold leading-7 text-slate-900">
							{card.number}
						</p>
						<p className="mt-3 leading-7 text-slate-700">{card.context}</p>
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
				))}
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
