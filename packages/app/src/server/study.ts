import { Data, Effect } from "effect";

export type StudyTopic = "algorithms" | "system-design" | "programming" | "web";

export type StudyQuestionKind =
	| "flashcard"
	| "multiple-choice"
	| "written"
	| "code";

type StudyDifficulty = "foundation" | "intermediate" | "advanced";

type QuestionBase = {
	id: string;
	title: string;
	topic: StudyTopic;
	difficulty: StudyDifficulty;
	tags: readonly string[];
	explanation: string;
};

type FlashcardQuestion = QuestionBase & {
	kind: "flashcard";
	prompt: string;
	answer: string;
};

type MultipleChoiceQuestion = QuestionBase & {
	kind: "multiple-choice";
	prompt: string;
	options: readonly {
		id: string;
		label: string;
	}[];
	correctOptionId: string;
};

type WrittenQuestion = QuestionBase & {
	kind: "written";
	prompt: string;
	placeholder: string;
	referenceAnswer: string;
	rubric: readonly string[];
};

type CodeQuestion = QuestionBase & {
	kind: "code";
	prompt: string;
	language: string;
	starterCode: string;
	referenceAnswer: string;
	rubric: readonly string[];
};

type StudyQuestion =
	| FlashcardQuestion
	| MultipleChoiceQuestion
	| WrittenQuestion
	| CodeQuestion;

export type StudyQuestionPublic =
	| (Omit<FlashcardQuestion, "answer" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<MultipleChoiceQuestion, "correctOptionId" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<WrittenQuestion, "referenceAnswer" | "rubric" | "explanation"> & {
			explanation?: never;
	  })
	| (Omit<CodeQuestion, "referenceAnswer" | "rubric" | "explanation"> & {
			explanation?: never;
	  });

export type StudyAnswerFeedback = {
	questionId: string;
	kind: StudyQuestionKind;
	correct: boolean | null;
	answer: string;
	explanation: string;
	rubric: readonly string[];
};

export type StudySessionPublic = {
	id: string;
	label: string;
	questions: readonly StudyQuestionPublic[];
};

type CourseBlock =
	| {
			id: string;
			kind: "concept";
			title: string;
			body: string;
	  }
	| {
			id: string;
			kind: "checkpoint" | "challenge";
			title: string;
			body: string;
			questionId: string;
	  };

type StudyCourse = {
	id: string;
	title: string;
	summary: string;
	outcomes: readonly string[];
	lessons: readonly CourseBlock[];
	assessmentQuestionIds: readonly string[];
};

export type StudyCourseSummary = Pick<
	StudyCourse,
	"id" | "title" | "summary" | "outcomes"
> & {
	lessonCount: number;
};

export type StudyCoursePublic = Omit<StudyCourse, "lessons"> & {
	lessons: readonly (
		| Extract<CourseBlock, { kind: "concept" }>
		| (Omit<Extract<CourseBlock, { questionId: string }>, "questionId"> & {
				question: StudyQuestionPublic;
		  })
	)[];
	assessment: readonly StudyQuestionPublic[];
};

export class StudyQuestionNotFound extends Data.TaggedError(
	"StudyQuestionNotFound",
)<{ questionId: string }> {}

export class StudyCourseNotFound extends Data.TaggedError(
	"StudyCourseNotFound",
)<{
	courseId: string;
}> {}

const topics: readonly StudyTopic[] = [
	"algorithms",
	"system-design",
	"programming",
	"web",
];

const kinds: readonly StudyQuestionKind[] = [
	"flashcard",
	"multiple-choice",
	"written",
	"code",
];

const questions: readonly StudyQuestion[] = [
	{
		id: "algorithms-window-invariant",
		kind: "flashcard",
		title: "The sliding-window rule",
		topic: "algorithms",
		difficulty: "foundation",
		tags: ["arrays", "sliding-window"],
		prompt: "What rule should a sliding-window solution keep true?",
		answer:
			"The current slice of the input must obey one clear rule. For a no-repeat problem, the slice must contain no repeated letter. Add a letter on the right. If it breaks the rule, move the left edge right until the rule holds again.",
		explanation:
			"Each edge moves only forward. Together they make at most twice as many moves as there are letters, so the work grows with the input size.",
	},
	{
		id: "algorithms-window-choice",
		kind: "multiple-choice",
		title: "Find the rule",
		topic: "algorithms",
		difficulty: "intermediate",
		tags: ["strings", "sliding-window"],
		prompt:
			"For the longest part of a string with no repeated letters, which rule should the current slice follow?",
		options: [
			{ id: "a", label: "The current slice stays sorted." },
			{ id: "b", label: "The current slice has no repeated letter." },
			{ id: "c", label: "The current slice has a non-negative sum." },
			{ id: "d", label: "The two edges always move together." },
		],
		correctOptionId: "b",
		explanation:
			"Remember where you last saw each letter. In `abca`, the last `a` makes the slice repeat. Move the left edge past the first `a`; the new slice is `bca`.",
	},
	{
		id: "algorithms-window-written",
		kind: "written",
		title: "Why this stays fast",
		topic: "algorithms",
		difficulty: "intermediate",
		tags: ["complexity", "two-pointers"],
		prompt:
			"Why is a sliding-window solution O(n) even when the code has a loop inside another loop?",
		placeholder: "Count how far the left and right edges can move…",
		referenceAnswer:
			"Do not count the loops by shape. Count edge moves. The right edge crosses the input once. The left edge also crosses it at most once. That gives at most 2n moves, so the work is O(n).",
		rubric: [
			"Counts total edge moves, not nested loops.",
			"Says that both edges move only forward.",
			"Concludes O(n), not O(n²).",
		],
		explanation:
			"The inner loop does not restart from the beginning. It only spends moves the left edge has not spent before.",
	},
	{
		id: "algorithms-window-code",
		kind: "code",
		title: "Longest slice with no repeats",
		topic: "algorithms",
		difficulty: "advanced",
		tags: ["strings", "hash-map", "sliding-window"],
		prompt:
			"Write longestUniqueSubstring. Return the length of the longest slice with no repeated letter. For `abcabcbb`, return 3.",
		language: "TypeScript",
		starterCode:
			"export function longestUniqueSubstring(value: string): number {\n\t// Write your solution\n}\n",
		referenceAnswer:
			"export function longestUniqueSubstring(value: string): number {\n\tconst lastSeen = new Map<string, number>();\n\tlet best = 0;\n\tlet left = 0;\n\n\tfor (let right = 0; right < value.length; right += 1) {\n\t\tconst character = value[right];\n\t\tconst previous = lastSeen.get(character);\n\n\t\tif (previous !== undefined && previous >= left) left = previous + 1;\n\n\t\tlastSeen.set(character, right);\n\t\tbest = Math.max(best, right - left + 1);\n\t}\n\n\treturn best;\n}\n",
		rubric: [
			"Moves a left edge and a right edge through the string.",
			"Remembers where each letter last appeared.",
			"Never moves the left edge backward.",
			"Explains O(n) time and space based on the letters seen.",
		],
		explanation:
			"A repeated letter may sit before the current slice. Ignore it. Only move the left edge when its old position is still inside the slice.",
	},
	{
		id: "system-design-requirements",
		kind: "flashcard",
		title: "What it does and how well it does it",
		topic: "system-design",
		difficulty: "foundation",
		tags: ["requirements", "interviews"],
		prompt:
			"Before you draw a system, what is the difference between what it must do and how well it must do it?",
		answer:
			"First list what the system must do: create a short link and send a visitor to the full link. Then list how well it must do it: how fast it must respond, how much traffic it must handle, how often it may fail, and how long it keeps data.",
		explanation:
			"If you skip the second list, you can build a system that works but fails under the traffic or speed the question requires.",
	},
	{
		id: "system-design-choice",
		kind: "multiple-choice",
		title: "A shortener with many reads",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["caching", "url-shortener"],
		prompt:
			"A shortener gets far more redirects than new links. What change cuts database reads for links many people open?",
		options: [
			{ id: "a", label: "Use longer short codes." },
			{ id: "b", label: "Keep popular link lookups in a cache." },
			{ id: "c", label: "Make the write API synchronous." },
			{ id: "d", label: "Store analytics in the same row as the link." },
		],
		correctOptionId: "b",
		explanation:
			"A cache keeps a copy of a popular short-link result in memory. Most visitors get the result there. The database still holds the real record.",
	},
	{
		id: "system-design-written",
		kind: "written",
		title: "Get the numbers first",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["capacity-planning", "url-shortener"],
		prompt:
			"What numbers would you estimate before designing a URL shortener, and what would those numbers change?",
		placeholder:
			"Think about redirects, new links, storage, and response time…",
		referenceAnswer:
			"Estimate new links per day, redirects per link, busiest requests per second, record size, how long you keep records, and acceptable redirect time. These numbers tell you how much storage you need, whether to add a cache, and when to split data across machines.",
		rubric: [
			"Separates redirects from new links.",
			"Includes the busiest period, not just the average.",
			"Links the numbers to storage, caching, or splitting data.",
		],
		explanation:
			"The numbers tell you where the pressure is. In this system, redirects usually need the most care.",
	},
	{
		id: "system-design-code",
		kind: "code",
		title: "Turn a number into a short code",
		topic: "system-design",
		difficulty: "intermediate",
		tags: ["encoding", "url-shortener"],
		prompt:
			"Write encodeBase62 for a whole number that is zero or more. It turns an ID into a short text code.",
		language: "TypeScript",
		starterCode:
			"export function encodeBase62(id: number): string {\n\t// Write your solution\n}\n",
		referenceAnswer:
			'const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";\n\nexport function encodeBase62(id: number): string {\n\tif (!Number.isSafeInteger(id) || id < 0) throw new Error("id must be a non-negative safe integer");\n\tif (id === 0) return alphabet[0];\n\n\tlet value = id;\n\tlet encoded = "";\n\n\twhile (value > 0) {\n\t\tencoded = alphabet[value % alphabet.length] + encoded;\n\t\tvalue = Math.floor(value / alphabet.length);\n\t}\n\n\treturn encoded;\n}\n',
		rubric: [
			"Handles zero explicitly.",
			"Keeps dividing by 62 to find each character.",
			"Builds the characters from right to left, or reverses them at the end.",
			"Notes that real public IDs may need to hide their order and avoid clashes.",
		],
		explanation:
			"Base62 makes an ID shorter. It does not by itself stop people from guessing nearby IDs or solve how IDs are made during an outage.",
	},
	{
		id: "programming-idempotency",
		kind: "flashcard",
		title: "Safe retries",
		topic: "programming",
		difficulty: "foundation",
		tags: ["api-design", "retries"],
		prompt:
			"When can a client safely send the same request again, and why does that matter?",
		answer:
			"A request is safe to retry when sending it twice has the same result as sending it once. This matters when a client times out: it can try again without creating two orders, charges, or records.",
		explanation:
			"Servers often use a retry key or a client-chosen record ID to spot the second request and return the first result.",
	},
	{
		id: "programming-promise-choice",
		kind: "multiple-choice",
		title: "What Promise.all does on failure",
		topic: "programming",
		difficulty: "intermediate",
		tags: ["javascript", "promises"],
		prompt: "What does Promise.all do when one of its input promises rejects?",
		options: [
			{
				id: "a",
				label: "It waits for all promises, then returns every result.",
			},
			{ id: "b", label: "It rejects as soon as one input rejects." },
			{ id: "c", label: "It retries the rejected promise automatically." },
			{ id: "d", label: "It converts rejected promises to undefined." },
		],
		correctOptionId: "b",
		explanation:
			"The Promise.all call fails as soon as one promise fails. Work started by the other promises may still carry on unless you stop it yourself.",
	},
	{
		id: "programming-state-written",
		kind: "written",
		title: "Where state belongs",
		topic: "programming",
		difficulty: "intermediate",
		tags: ["state", "design"],
		prompt: "Where should state live when more than one component needs it?",
		placeholder:
			"Name the lowest component that needs to coordinate the others…",
		referenceAnswer:
			"Put state in the lowest component that every reader or updater shares. Compute related values from that state instead of storing copies. Move state higher only when sibling components must stay in step.",
		rubric: [
			"Names the lowest shared owner.",
			"Avoids two copies of the same fact.",
			"Computes values that can come from existing state.",
		],
		explanation:
			"One owner gives the rest of the page one source of truth. That keeps related parts from drifting apart.",
	},
	{
		id: "programming-debounce-code",
		kind: "code",
		title: "Wait for typing to stop",
		topic: "programming",
		difficulty: "advanced",
		tags: ["javascript", "closures", "timers"],
		prompt:
			"Write debounce. The returned function should wait until calls stop for waitMs, then run only the most recent call.",
		language: "TypeScript",
		starterCode:
			"export function debounce<TArgs extends unknown[]>(\n\tcallback: (...args: TArgs) => void,\n\twaitMs: number,\n): (...args: TArgs) => void {\n\t// Write your solution\n}\n",
		referenceAnswer:
			"export function debounce<TArgs extends unknown[]>(\n\tcallback: (...args: TArgs) => void,\n\twaitMs: number,\n): (...args: TArgs) => void {\n\tlet timeoutId: ReturnType<typeof setTimeout> | undefined;\n\n\treturn (...args) => {\n\t\tif (timeoutId !== undefined) clearTimeout(timeoutId);\n\n\t\ttimeoutId = setTimeout(() => {\n\t\t\tcallback(...args);\n\t\t}, waitMs);\n\t};\n}\n",
		rubric: [
			"Keeps one timer between calls.",
			"Cancels the old timer before starting a new one.",
			"Passes through the newest arguments.",
			"Can explain how to cancel it or keep `this` if asked.",
		],
		explanation:
			"The returned function keeps the timer between calls. That lets a new call cancel the old wait.",
	},
	{
		id: "web-cache-control",
		kind: "flashcard",
		title: "A 60-second cache",
		topic: "web",
		difficulty: "foundation",
		tags: ["http", "caching"],
		prompt: "What does Cache-Control: max-age=60 tell a browser or cache?",
		answer:
			"It may reuse this response for 60 seconds after saving it. During that time it does not need to ask the server again, unless another cache rule says otherwise.",
		explanation:
			"Read the whole header. Rules such as `private` or `no-store` can change what a cache may do.",
	},
	{
		id: "web-cors-choice",
		kind: "multiple-choice",
		title: "Why the browser asks first",
		topic: "web",
		difficulty: "intermediate",
		tags: ["http", "cors"],
		prompt:
			"Why does a browser sometimes ask a site for permission before sending a cross-site request?",
		options: [
			{ id: "a", label: "To authenticate the user before every request." },
			{
				id: "b",
				label:
					"To ask whether a cross-site request with certain methods or headers is allowed.",
			},
			{ id: "c", label: "To encrypt a request body." },
			{ id: "d", label: "To warm a CDN cache." },
		],
		correctOptionId: "b",
		explanation:
			"For some cross-site requests, the browser first sends an OPTIONS request. It checks whether the server allows that site, method, and headers before sending the real request.",
	},
	{
		id: "web-rendering-written",
		kind: "written",
		title: "Why a stylesheet can delay the page",
		topic: "web",
		difficulty: "intermediate",
		tags: ["browser", "performance"],
		prompt:
			"Why can a large stylesheet delay the first visible page, and what are two ways to make that faster?",
		placeholder: "Explain what the browser waits for, then name two fixes…",
		referenceAnswer:
			"The browser needs style rules before it can draw the page. It waits while it downloads and reads a stylesheet. Cut unused CSS, split large files, include only the styles needed for the first screen, or load less important styles later.",
		rubric: [
			"Says the browser waits for style rules before it draws.",
			"Gives at least two clear fixes.",
			"Does not say every stylesheet should load later.",
		],
		explanation:
			"Tie the file the browser waits for to what the person sees: a blank page or a late first paint.",
	},
	{
		id: "web-debounce-hook-code",
		kind: "code",
		title: "A React value that waits",
		topic: "web",
		difficulty: "advanced",
		tags: ["react", "hooks", "performance"],
		prompt:
			"Write useDebouncedValue. It should return a value that updates waitMs after the last input change.",
		language: "TypeScript / React",
		starterCode:
			"export function useDebouncedValue<T>(value: T, waitMs: number): T {\n\t// Write your solution\n}\n",
		referenceAnswer:
			'import { useEffect, useState } from "react";\n\nexport function useDebouncedValue<T>(value: T, waitMs: number): T {\n\tconst [debouncedValue, setDebouncedValue] = useState(value);\n\n\tuseEffect(() => {\n\t\tconst timeoutId = setTimeout(() => setDebouncedValue(value), waitMs);\n\t\treturn () => clearTimeout(timeoutId);\n\t}, [value, waitMs]);\n\n\treturn debouncedValue;\n}\n',
		rubric: [
			"Stores the value that the page should show.",
			"Starts a timer and clears the old one in an effect.",
			"Reacts when value or waitMs changes.",
			"Explains why clearing the old timer matters.",
		],
		explanation:
			"When the input changes again, cleanup clears the old timer. Only the latest input gets to update the result.",
	},
];

const courses: readonly StudyCourse[] = [
	{
		id: "url-shortener",
		title: "Build a URL Shortener",
		summary:
			"Start with the question, get the key numbers, then design the busy redirect path.",
		outcomes: [
			"Ask what the system must do before choosing parts.",
			"Use rough numbers to choose the right work.",
			"Explain why redirects need a cache and separate analytics.",
		],
		lessons: [
			{
				id: "requirements",
				kind: "concept",
				title: "Start with what people need",
				body: "Ask what happens when someone makes a link and when someone opens one. Then ask how fast, reliable, and large the system must be. Do this before you pick a database or draw boxes.",
			},
			{
				id: "requirements-checkpoint",
				kind: "checkpoint",
				title: "Check the first step",
				body: "Name what the system does and how well it must do it before you estimate traffic.",
				questionId: "system-design-requirements",
			},
			{
				id: "estimation",
				kind: "concept",
				title: "Count the busy work",
				body: "Estimate new links, redirects, busiest requests per second, record size, and how long you keep records. If many more people open links than create them, make the redirect path fast with a cache.",
			},
			{
				id: "capacity-challenge",
				kind: "challenge",
				title: "Let the numbers guide you",
				body: "Explain which estimates change the design and why.",
				questionId: "system-design-written",
			},
			{
				id: "architecture",
				kind: "concept",
				title: "Build the simple version first",
				body: "Start with a way to create a link, a place to save it, and a way to redirect visitors. Add a cache for popular links. Record analytics in the background so redirects stay fast. Add copies of data only when the uptime goal needs them.",
			},
		],
		assessmentQuestionIds: [
			"system-design-choice",
			"system-design-code",
			"system-design-requirements",
		],
	},
	{
		id: "sliding-window",
		title: "Learn the Sliding Window",
		summary:
			"Spot a moving slice of input, state its rule, and write the code one step at a time.",
		outcomes: [
			"Spot when a continuous part of the input may help.",
			"State the rule before you code.",
			"Explain why both edges make the code fast.",
		],
		lessons: [
			{
				id: "recognition",
				kind: "concept",
				title: "Look for one continuous slice",
				body: "Use this pattern when a question asks about a part of a string or list that stays together. Move one edge at a time and keep track of what is inside. First ask whether the slice has a fixed size or a rule such as “at most k.”",
			},
			{
				id: "invariant-checkpoint",
				kind: "checkpoint",
				title: "State the rule",
				body: "Your current slice needs one rule. When adding an item breaks that rule, move the left edge until it holds again.",
				questionId: "algorithms-window-invariant",
			},
			{
				id: "proof",
				kind: "concept",
				title: "See why it is still fast",
				body: "Do not judge the code by the number of loops. Count how far each edge can move. If neither edge goes backward, each crosses the input once. That is O(n).",
			},
			{
				id: "implementation-challenge",
				kind: "challenge",
				title: "Write the code",
				body: "Remember where you last saw each letter. Move the left edge only when that old letter is still inside the current slice.",
				questionId: "algorithms-window-code",
			},
		],
		assessmentQuestionIds: [
			"algorithms-window-choice",
			"algorithms-window-written",
			"algorithms-window-code",
		],
	},
];

const questionById = new Map(
	questions.map((question) => [question.id, question]),
);
const courseById = new Map(courses.map((course) => [course.id, course]));

export function getStudySession(input: {
	date: string;
	attempt: number;
}): Effect.Effect<StudySessionPublic, never> {
	const questionIds = _selectQuestionIds(input.date, input.attempt);

	return Effect.succeed({
		id: `${input.date}:${input.attempt}`,
		label: input.attempt === 0 ? "Today’s questions" : "Question set",
		questions: questionIds.map((id) => _toPublic(_getQuestionOrDie(id))),
	});
}

export function revealStudyQuestion(
	questionId: string,
): Effect.Effect<StudyAnswerFeedback, StudyQuestionNotFound> {
	return Effect.gen(function* () {
		const question = yield* _findQuestion(questionId);

		if (question.kind === "flashcard") return _feedbackForFlashcard(question);
		if (question.kind === "multiple-choice")
			return _feedbackForChoice(question, false);

		return _feedbackForWrittenAnswer(question);
	});
}

export function evaluateStudyAnswer(input: {
	questionId: string;
	answer: string;
}): Effect.Effect<StudyAnswerFeedback, StudyQuestionNotFound> {
	return Effect.gen(function* () {
		const question = yield* _findQuestion(input.questionId);

		if (question.kind === "multiple-choice")
			return _feedbackForChoice(
				question,
				input.answer === question.correctOptionId,
			);
		if (question.kind === "flashcard") return _feedbackForFlashcard(question);

		return _feedbackForWrittenAnswer(question);
	});
}

export function getStudyCatalog(): Effect.Effect<
	readonly StudyCourseSummary[],
	never
> {
	return Effect.succeed(
		courses.map((course) => ({
			id: course.id,
			title: course.title,
			summary: course.summary,
			outcomes: course.outcomes,
			lessonCount: course.lessons.length,
		})),
	);
}

export function getStudyCourse(
	courseId: string,
): Effect.Effect<StudyCoursePublic, StudyCourseNotFound> {
	return Effect.gen(function* () {
		const course = yield* _findCourse(courseId);

		return {
			...course,
			lessons: course.lessons.map((lesson) => {
				if (lesson.kind === "concept") return lesson;

				const question = _getQuestionOrDie(lesson.questionId);
				return {
					id: lesson.id,
					kind: lesson.kind,
					title: lesson.title,
					body: lesson.body,
					question: _toPublic(question),
				};
			}),
			assessment: course.assessmentQuestionIds.map((questionId) =>
				_toPublic(_getQuestionOrDie(questionId)),
			),
		};
	});
}

function _findQuestion(
	questionId: string,
): Effect.Effect<StudyQuestion, StudyQuestionNotFound> {
	const question = questionById.get(questionId);
	return question
		? Effect.succeed(question)
		: Effect.fail(new StudyQuestionNotFound({ questionId }));
}

function _findCourse(
	courseId: string,
): Effect.Effect<StudyCourse, StudyCourseNotFound> {
	const course = courseById.get(courseId);
	return course
		? Effect.succeed(course)
		: Effect.fail(new StudyCourseNotFound({ courseId }));
}

function _getQuestionOrDie(questionId: string): StudyQuestion {
	const question = questionById.get(questionId);
	if (!question) throw new Error(`Missing study question: ${questionId}`);
	return question;
}

function _toPublic(question: StudyQuestion): StudyQuestionPublic {
	if (question.kind === "flashcard") {
		const {
			answer: _answer,
			explanation: _explanation,
			...publicQuestion
		} = question;
		return publicQuestion;
	}

	if (question.kind === "multiple-choice") {
		const {
			correctOptionId: _correctOptionId,
			explanation: _explanation,
			...publicQuestion
		} = question;
		return publicQuestion;
	}

	const {
		referenceAnswer: _referenceAnswer,
		rubric: _rubric,
		explanation: _explanation,
		...publicQuestion
	} = question;
	return publicQuestion;
}

function _feedbackForWrittenAnswer(
	question: Exclude<StudyQuestion, MultipleChoiceQuestion | FlashcardQuestion>,
): StudyAnswerFeedback {
	return {
		questionId: question.id,
		kind: question.kind,
		correct: null,
		answer: question.referenceAnswer,
		explanation: question.explanation,
		rubric: question.rubric,
	};
}

function _feedbackForFlashcard(
	question: FlashcardQuestion,
): StudyAnswerFeedback {
	return {
		questionId: question.id,
		kind: question.kind,
		correct: null,
		answer: question.answer,
		explanation: question.explanation,
		rubric: [],
	};
}

function _feedbackForChoice(
	question: MultipleChoiceQuestion,
	correct: boolean,
): StudyAnswerFeedback {
	const correctOption = question.options.find(
		(option) => option.id === question.correctOptionId,
	);

	return {
		questionId: question.id,
		kind: question.kind,
		correct,
		answer: correctOption?.label ?? "",
		explanation: question.explanation,
		rubric: [],
	};
}

function _selectQuestionIds(date: string, attempt: number): readonly string[] {
	const seed = _hash(`${date}:${attempt}`);

	return topics.flatMap((topic, topicIndex) => {
		const firstKind = kinds[(seed + topicIndex) % kinds.length];
		const secondKind = kinds[(seed + topicIndex + 2) % kinds.length];

		return [
			_getQuestionByTopicAndKind(topic, firstKind).id,
			_getQuestionByTopicAndKind(topic, secondKind).id,
		];
	});
}

function _getQuestionByTopicAndKind(
	topic: StudyTopic,
	kind: StudyQuestionKind,
): StudyQuestion {
	const question = questions.find(
		(candidate) => candidate.topic === topic && candidate.kind === kind,
	);

	if (!question) throw new Error(`Missing ${kind} question for ${topic}`);
	return question;
}

function _hash(value: string): number {
	let hash = 2_166_136_261;

	for (const character of value) {
		hash ^= character.charCodeAt(0);
		hash = Math.imul(hash, 16_777_619);
	}

	return hash >>> 0;
}
