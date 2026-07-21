import { useState } from "react";
import { Button } from "#/components/primitives/button";
import { AnswerForm } from "#/components/study/answer-form";
import type { StudyAnswerFeedback, StudyQuestionPublic } from "#/server/study";

type QuestionCardProps = {
	question: StudyQuestionPublic;
	feedback?: StudyAnswerFeedback;
	flashcardRating?: "know" | "review";
	onReveal: (questionId: string) => Promise<void>;
	onAnswer: (questionId: string, answer: string) => Promise<void>;
	onRate: (questionId: string, rating: "know" | "review") => void;
};

export function QuestionCard({
	question,
	feedback,
	flashcardRating,
	onReveal,
	onAnswer,
	onRate,
}: QuestionCardProps) {
	const [isRevealing, setIsRevealing] = useState(false);
	const [choiceError, setChoiceError] = useState<string | null>(null);

	async function reveal() {
		setChoiceError(null);
		setIsRevealing(true);

		try {
			await onReveal(question.id);
		} catch {
			setChoiceError("Could not load the answer. Try again.");
		} finally {
			setIsRevealing(false);
		}
	}

	async function choose(optionId: string) {
		setChoiceError(null);
		setIsRevealing(true);

		try {
			await onAnswer(question.id, optionId);
		} catch {
			setChoiceError("Could not check that choice. Try again.");
		} finally {
			setIsRevealing(false);
		}
	}

	return (
		<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
			<div className="flex flex-wrap items-center gap-2 text-xs font-medium">
				<span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
					{_topicLabel(question.topic)}
				</span>
				<span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">
					{question.difficulty}
				</span>
				<span className="text-slate-500">
					{question.kind.replace("-", " ")}
				</span>
			</div>

			<h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
				{question.title}
			</h2>
			<p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-700">
				{question.prompt}
			</p>

			<div className="mt-7">
				{question.kind === "flashcard" ? (
					feedback ? (
						<>
							<Feedback feedback={feedback} />
							<div className="mt-5 flex flex-wrap gap-3">
								<Button
									className={
										flashcardRating === "know"
											? "bg-emerald-700 hover:bg-emerald-800"
											: "bg-emerald-600 hover:bg-emerald-700"
									}
									onClick={() => onRate(question.id, "know")}
								>
									{flashcardRating === "know"
										? "Marked: I know this"
										: "I know this"}
								</Button>
								<Button
									className={
										flashcardRating === "review"
											? "bg-amber-700 hover:bg-amber-800"
											: "bg-amber-600 hover:bg-amber-700"
									}
									onClick={() => onRate(question.id, "review")}
								>
									{flashcardRating === "review"
										? "Marked: review this again"
										: "Review this again"}
								</Button>
							</div>
						</>
					) : (
						<Button disabled={isRevealing} onClick={reveal}>
							{isRevealing ? "Loading…" : "Show answer"}
						</Button>
					)
				) : null}

				{question.kind === "multiple-choice" ? (
					feedback ? (
						<Feedback feedback={feedback} />
					) : (
						<div className="grid gap-3">
							{question.options.map((option) => (
								<button
									className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
									disabled={isRevealing}
									key={option.id}
									onClick={() => void choose(option.id)}
									type="button"
								>
									{option.label}
								</button>
							))}
						</div>
					)
				) : null}

				{question.kind === "written" || question.kind === "code" ? (
					feedback ? (
						<Feedback feedback={feedback} />
					) : (
						<AnswerForm
							key={question.id}
							onSubmit={(answer) => onAnswer(question.id, answer)}
							question={question}
						/>
					)
				) : null}
			</div>

			{choiceError ? (
				<p
					className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"
					role="alert"
				>
					{choiceError}
				</p>
			) : null}
		</article>
	);
}

function Feedback({ feedback }: { feedback: StudyAnswerFeedback }) {
	const status =
		feedback.correct === true
			? "Right"
			: feedback.correct === false
				? "Not yet"
				: "Compare your answer";

	return (
		<section
			className={`rounded-xl border p-4 ${
				feedback.correct === false
					? "border-amber-200 bg-amber-50"
					: "border-emerald-200 bg-emerald-50"
			}`}
		>
			<p className="text-sm font-semibold text-slate-900">{status}</p>
			<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
				Answer
			</p>
			<p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
				{feedback.answer}
			</p>
			{feedback.rubric.length > 0 ? (
				<>
					<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
						Check for these points
					</p>
					<ul className="mt-1 grid gap-1 text-sm leading-6 text-slate-700">
						{feedback.rubric.map((item) => (
							<li key={item}>• {item}</li>
						))}
					</ul>
				</>
			) : null}
			<p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
				Why
			</p>
			<p className="mt-1 text-sm leading-6 text-slate-600">
				{feedback.explanation}
			</p>
		</section>
	);
}

function _topicLabel(topic: StudyQuestionPublic["topic"]) {
	return topic.replace("-", " ");
}
