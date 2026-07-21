import { Button } from "#/components/primitives/button";
import { QuestionCard } from "#/components/study/question-card";
import type { StudyAnswerFeedback, StudyCoursePublic } from "#/server/study";

type CoursePlayerProps = {
	course: StudyCoursePublic;
	lessonIndex: number;
	feedback: Record<string, StudyAnswerFeedback>;
	flashcardRatings: Record<string, "know" | "review">;
	onLessonIndexChange: (index: number) => void;
	onReveal: (questionId: string) => Promise<void>;
	onAnswer: (questionId: string, answer: string) => Promise<void>;
	onRate: (questionId: string, rating: "know" | "review") => void;
	onStartAssessment: () => void;
};

export function CoursePlayer({
	course,
	lessonIndex,
	feedback,
	flashcardRatings,
	onLessonIndexChange,
	onReveal,
	onAnswer,
	onRate,
	onStartAssessment,
}: CoursePlayerProps) {
	const lesson =
		course.lessons[Math.min(lessonIndex, course.lessons.length - 1)];
	const isLastLesson = lessonIndex >= course.lessons.length - 1;
	const canContinue =
		lesson.kind === "concept" || Boolean(feedback[lesson.question.id]);

	return (
		<section className="grid gap-6">
			<div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
				<p className="text-sm font-medium text-blue-700">
					Lesson {lessonIndex + 1} of {course.lessons.length}
				</p>
				<h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
					{lesson.title}
				</h2>
				<p className="mt-4 whitespace-pre-wrap leading-7 text-slate-700">
					{lesson.body}
				</p>
			</div>

			{lesson.kind !== "concept" ? (
				<QuestionCard
					feedback={feedback[lesson.question.id]}
					flashcardRating={flashcardRatings[lesson.question.id]}
					onAnswer={onAnswer}
					onRate={onRate}
					onReveal={onReveal}
					question={lesson.question}
				/>
			) : null}

			<div className="flex flex-wrap gap-3">
				{lessonIndex > 0 ? (
					<Button
						className="bg-slate-200 text-slate-800 hover:bg-slate-300"
						onClick={() => onLessonIndexChange(lessonIndex - 1)}
					>
						Back
					</Button>
				) : null}

				{isLastLesson ? (
					<Button disabled={!canContinue} onClick={onStartAssessment}>
						Start final quiz
					</Button>
				) : (
					<Button
						disabled={!canContinue}
						onClick={() => onLessonIndexChange(lessonIndex + 1)}
					>
						Continue
					</Button>
				)}
			</div>
		</section>
	);
}
