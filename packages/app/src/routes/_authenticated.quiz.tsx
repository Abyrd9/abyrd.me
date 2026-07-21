import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "#/components/primitives/button";
import { CoursePlayer } from "#/components/study/course-player";
import { QuestionCard } from "#/components/study/question-card";
import type {
	StudyAnswerFeedback,
	StudyCoursePublic,
	StudyCourseSummary,
	StudySessionPublic,
} from "#/server/study";
import {
	loadStudyCatalog,
	loadStudyCourse,
	loadStudySession,
	revealStudyAnswer,
	submitStudyAnswer,
} from "#/server/study-functions";
import {
	courseProgress,
	createStudyProgress,
	loadStudyProgress,
	type StudyProgress,
	saveStudyProgress,
	sessionProgress,
} from "#/study-progress";

type StudyView = "practice" | "courses" | "course" | "assessment";

export const Route = createFileRoute("/_authenticated/quiz")({
	component: StudyHub,
});

function StudyHub() {
	const [progress, setProgress] = useState(createStudyProgress);
	const [view, setView] = useState<StudyView>("practice");
	const [session, setSession] = useState<StudySessionPublic | null>(null);
	const [sessionKey, setSessionKey] = useState<string | null>(null);
	const [catalog, setCatalog] = useState<readonly StudyCourseSummary[]>([]);
	const [course, setCourse] = useState<StudyCoursePublic | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		let isCurrent = true;

		async function loadInitialStudyHub() {
			try {
				const storedProgress = loadStudyProgress();
				const [nextCatalog, dailySession] = await Promise.all([
					loadStudyCatalog(),
					loadStudySession({
						data: { date: _localDate(), attempt: 0 },
					}),
				]);

				if (!isCurrent) return;

				setProgress(storedProgress);
				setCatalog(nextCatalog);
				setSession(dailySession);
				setSessionKey(`daily:${dailySession.id}`);
			} catch {
				if (isCurrent) {
					setMessage(
						"Could not load the study material. Refresh and try again.",
					);
				}
			} finally {
				if (isCurrent) setIsLoading(false);
			}
		}

		void loadInitialStudyHub();

		return () => {
			isCurrent = false;
		};
	}, []);

	function updateProgress(update: (current: StudyProgress) => StudyProgress) {
		setProgress((current) => {
			const next = update(current);
			saveStudyProgress(next);
			return next;
		});
	}

	async function loadDailyFocus() {
		setIsLoading(true);
		setMessage(null);

		try {
			const nextSession = await loadStudySession({
				data: { date: _localDate(), attempt: 0 },
			});

			setSession(nextSession);
			setSessionKey(`daily:${nextSession.id}`);
			setView("practice");
		} catch {
			setMessage("Could not load today’s set. Try again.");
		} finally {
			setIsLoading(false);
		}
	}

	async function startAnotherPracticeSet() {
		const nextAttempt = progress.practiceAttempt + 1;
		setIsLoading(true);
		setMessage(null);

		try {
			const nextSession = await loadStudySession({
				data: { date: _localDate(), attempt: nextAttempt },
			});

			updateProgress((current) => ({
				...current,
				practiceAttempt: nextAttempt,
			}));
			setSession(nextSession);
			setSessionKey(`practice:${nextSession.id}`);
			setView("practice");
		} catch {
			setMessage("Could not load a new set. Try again.");
		} finally {
			setIsLoading(false);
		}
	}

	async function openCourse(courseId: string) {
		setIsLoading(true);
		setMessage(null);

		try {
			const nextCourse = await loadStudyCourse({ data: { courseId } });
			setCourse(nextCourse);
			setView("course");
		} catch {
			setMessage("Could not load that course. Try again.");
		} finally {
			setIsLoading(false);
		}
	}

	async function reveal(questionId: string, key: string) {
		const feedback = await revealStudyAnswer({ data: { questionId } });
		storeFeedback(key, feedback);
	}

	async function submit(questionId: string, answer: string, key: string) {
		const feedback = await submitStudyAnswer({ data: { questionId, answer } });
		storeFeedback(key, feedback);
	}

	function storeFeedback(key: string, feedback: StudyAnswerFeedback) {
		updateProgress((current) => {
			const currentSession = sessionProgress(current, key);

			return {
				...current,
				sessions: {
					...current.sessions,
					[key]: {
						...currentSession,
						feedback: {
							...currentSession.feedback,
							[feedback.questionId]: feedback,
						},
					},
				},
			};
		});
	}

	function rateFlashcard(
		questionId: string,
		rating: "know" | "review",
		key: string,
	) {
		updateProgress((current) => {
			const currentSession = sessionProgress(current, key);

			return {
				...current,
				sessions: {
					...current.sessions,
					[key]: {
						...currentSession,
						flashcardRatings: {
							...currentSession.flashcardRatings,
							[questionId]: rating,
						},
					},
				},
			};
		});
	}

	if (isLoading && !session) {
		return <StudyLoading />;
	}

	return (
		<section className="flex flex-1 flex-col py-10 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-blue-700">Interview study</p>
				<h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
					Practice for technical interviews.
				</h1>
				<p className="mt-4 text-lg leading-8 text-slate-600">
					Take a daily set, start a new set, or work through a short course.
				</p>
			</div>

			<div className="mt-8 flex flex-wrap gap-3">
				<Button
					className={
						view === "practice"
							? undefined
							: "bg-slate-200 text-slate-800 hover:bg-slate-300"
					}
					disabled={isLoading}
					onClick={() => void loadDailyFocus()}
				>
					Today’s questions
				</Button>
				<Button
					className="bg-slate-200 text-slate-800 hover:bg-slate-300"
					disabled={isLoading}
					onClick={() => void startAnotherPracticeSet()}
				>
					New question set
				</Button>
				<Button
					className={
						view === "courses" || view === "course" || view === "assessment"
							? undefined
							: "bg-slate-200 text-slate-800 hover:bg-slate-300"
					}
					disabled={isLoading}
					onClick={() => setView("courses")}
				>
					Courses
				</Button>
			</div>

			{message ? (
				<p
					className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
					role="alert"
				>
					{message}
				</p>
			) : null}

			<div className="mt-8">
				{isLoading ? <StudyLoading compact /> : null}
				{!isLoading && view === "practice" && session && sessionKey ? (
					<StudySession
						feedback={sessionProgress(progress, sessionKey).feedback}
						flashcardRatings={
							sessionProgress(progress, sessionKey).flashcardRatings
						}
						onAnswer={(questionId, answer) =>
							submit(questionId, answer, sessionKey)
						}
						onNext={() => {
							updateProgress((current) => {
								const currentSession = sessionProgress(current, sessionKey);

								return {
									...current,
									sessions: {
										...current.sessions,
										[sessionKey]: {
											...currentSession,
											questionIndex: Math.min(
												currentSession.questionIndex + 1,
												session.questions.length - 1,
											),
										},
									},
								};
							});
						}}
						onRate={(questionId, rating) =>
							rateFlashcard(questionId, rating, sessionKey)
						}
						onReveal={(questionId) => reveal(questionId, sessionKey)}
						questionIndex={sessionProgress(progress, sessionKey).questionIndex}
						session={session}
					/>
				) : null}

				{!isLoading && view === "courses" ? (
					<CourseCatalog
						catalog={catalog}
						onOpen={openCourse}
						progress={progress}
					/>
				) : null}

				{!isLoading && view === "course" && course ? (
					<CoursePlayer
						course={course}
						feedback={
							sessionProgress(progress, `course:${course.id}:lessons`).feedback
						}
						flashcardRatings={
							sessionProgress(progress, `course:${course.id}:lessons`)
								.flashcardRatings
						}
						lessonIndex={courseProgress(progress, course.id).lessonIndex}
						onAnswer={(questionId, answer) =>
							submit(questionId, answer, `course:${course.id}:lessons`)
						}
						onLessonIndexChange={(lessonIndex) => {
							updateProgress((current) => ({
								...current,
								courses: {
									...current.courses,
									[course.id]: {
										...courseProgress(current, course.id),
										lessonIndex,
									},
								},
							}));
						}}
						onRate={(questionId, rating) =>
							rateFlashcard(questionId, rating, `course:${course.id}:lessons`)
						}
						onReveal={(questionId) =>
							reveal(questionId, `course:${course.id}:lessons`)
						}
						onStartAssessment={() => setView("assessment")}
					/>
				) : null}

				{!isLoading && view === "assessment" && course ? (
					<Assessment
						course={course}
						feedback={
							sessionProgress(progress, `course:${course.id}:assessment`)
								.feedback
						}
						flashcardRatings={
							sessionProgress(progress, `course:${course.id}:assessment`)
								.flashcardRatings
						}
						onAnswer={(questionId, answer) =>
							submit(questionId, answer, `course:${course.id}:assessment`)
						}
						onComplete={() => {
							updateProgress((current) => ({
								...current,
								courses: {
									...current.courses,
									[course.id]: {
										...courseProgress(current, course.id),
										completed: true,
									},
								},
							}));
							setView("courses");
						}}
						onRate={(questionId, rating) =>
							rateFlashcard(
								questionId,
								rating,
								`course:${course.id}:assessment`,
							)
						}
						onReveal={(questionId) =>
							reveal(questionId, `course:${course.id}:assessment`)
						}
					/>
				) : null}
			</div>
		</section>
	);
}

function StudySession({
	session,
	questionIndex,
	feedback,
	flashcardRatings,
	onReveal,
	onAnswer,
	onRate,
	onNext,
}: {
	session: StudySessionPublic;
	questionIndex: number;
	feedback: Record<string, StudyAnswerFeedback>;
	flashcardRatings: Record<string, "know" | "review">;
	onReveal: (questionId: string) => Promise<void>;
	onAnswer: (questionId: string, answer: string) => Promise<void>;
	onRate: (questionId: string, rating: "know" | "review") => void;
	onNext: () => void;
}) {
	const currentIndex = Math.min(questionIndex, session.questions.length - 1);
	const question = session.questions[currentIndex];
	const isComplete = session.questions.every((item) =>
		Boolean(feedback[item.id]),
	);
	const hasFeedback = Boolean(feedback[question.id]);

	if (isComplete) {
		return (
			<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
				<p className="text-sm font-semibold text-emerald-800">
					{session.label} complete
				</p>
				<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
					You reviewed all {session.questions.length} questions.
				</h2>
				<p className="mt-3 leading-7 text-slate-700">
					Start another set now, or come back tomorrow for a new daily set.
				</p>
			</section>
		);
	}

	return (
		<div className="grid gap-5">
			<p className="text-sm font-medium text-slate-500">
				{session.label} · Question {currentIndex + 1} of{" "}
				{session.questions.length}
			</p>
			<QuestionCard
				feedback={feedback[question.id]}
				flashcardRating={flashcardRatings[question.id]}
				onAnswer={onAnswer}
				onRate={onRate}
				onReveal={onReveal}
				question={question}
			/>
			{hasFeedback ? <Button onClick={onNext}>Next question</Button> : null}
		</div>
	);
}

function CourseCatalog({
	catalog,
	progress,
	onOpen,
}: {
	catalog: readonly StudyCourseSummary[];
	progress: StudyProgress;
	onOpen: (courseId: string) => void;
}) {
	return (
		<section className="grid gap-4 sm:grid-cols-2">
			{catalog.map((item) => {
				const complete = courseProgress(progress, item.id).completed;

				return (
					<article
						className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
						key={item.id}
					>
						<p className="text-sm font-medium text-blue-700">
							{item.lessonCount} lessons {complete ? "· completed" : ""}
						</p>
						<h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
							{item.title}
						</h2>
						<p className="mt-3 leading-7 text-slate-600">{item.summary}</p>
						<ul className="mt-5 grid gap-2 text-sm leading-6 text-slate-700">
							{item.outcomes.map((outcome) => (
								<li key={outcome}>• {outcome}</li>
							))}
						</ul>
						<Button
							className="mt-6 self-start"
							onClick={() => void onOpen(item.id)}
						>
							{complete ? "Review course" : "Start course"}
						</Button>
					</article>
				);
			})}
		</section>
	);
}

function Assessment({
	course,
	feedback,
	flashcardRatings,
	onReveal,
	onAnswer,
	onRate,
	onComplete,
}: {
	course: StudyCoursePublic;
	feedback: Record<string, StudyAnswerFeedback>;
	flashcardRatings: Record<string, "know" | "review">;
	onReveal: (questionId: string) => Promise<void>;
	onAnswer: (questionId: string, answer: string) => Promise<void>;
	onRate: (questionId: string, rating: "know" | "review") => void;
	onComplete: () => void;
}) {
	const [questionIndex, setQuestionIndex] = useState(0);
	const question = course.assessment[questionIndex];
	const isComplete = course.assessment.every((item) =>
		Boolean(feedback[item.id]),
	);

	if (isComplete) {
		return (
			<section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
				<p className="text-sm font-semibold text-emerald-800">
					Final quiz complete
				</p>
				<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
					You finished {course.title}.
				</h2>
				<p className="mt-3 leading-7 text-slate-700">
					Review the guides, then return to a daily set to practise the same
					ideas again.
				</p>
				<Button className="mt-6" onClick={onComplete}>
					Back to courses
				</Button>
			</section>
		);
	}

	return (
		<div className="grid gap-5">
			<p className="text-sm font-medium text-slate-500">
				{course.title} · Final quiz · Question {questionIndex + 1} of{" "}
				{course.assessment.length}
			</p>
			<QuestionCard
				feedback={feedback[question.id]}
				flashcardRating={flashcardRatings[question.id]}
				onAnswer={onAnswer}
				onRate={onRate}
				onReveal={onReveal}
				question={question}
			/>
			{feedback[question.id] && questionIndex < course.assessment.length - 1 ? (
				<Button onClick={() => setQuestionIndex((index) => index + 1)}>
					Next question
				</Button>
			) : null}
		</div>
	);
}

function StudyLoading({ compact = false }: { compact?: boolean }) {
	return (
		<div
			className={`rounded-2xl border border-slate-200 bg-white text-slate-600 ${compact ? "p-4 text-sm" : "mt-10 p-8"}`}
		>
			Loading…
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
