import { createFileRoute } from "@tanstack/react-router";

const sections = [
	{
		id: "direction",
		title: "Choose who you want to help",
		paragraphs: [
			"Marketing starts with understanding people: what they care about, what they struggle with, and what would help. Your personal brand is the impression your work and interactions leave over time.",
			"Pick a group of people and a few subjects you want to explore. Treat this as a working direction. You can refine it as you learn what you enjoy and what people find useful.",
		],
		example:
			"I want to be known by [people] for helping with or thinking clearly about [problem].",
	},
	{
		id: "listen",
		title: "Listen before deciding what to say",
		paragraphs: [
			"Talk with people you want to reach. Ask what is difficult, what they have tried, and where they get stuck. Read their questions and notice the words they use.",
			"Keep returning to those questions. A useful answer to one real problem gives you a stronger starting point than guessing what might get attention.",
		],
		example:
			"What have you tried? What made it hard? What would make this easier?",
	},
	{
		id: "share",
		title: "Share what you can support",
		paragraphs: [
			"You can describe something you read, noticed, built, or tried without claiming expertise in the whole subject. Be precise about the part you understand and where your experience ends.",
			"Reading a whole book matters when you review the whole book. To discuss one passage, read enough context to represent it fairly, credit the source, and keep your claim within that scope. If it needs much more research, narrow the claim.",
		],
		example:
			"One idea from the chapter I read made me reconsider [assumption]. Here is the example it brought to mind.",
	},
	{
		id: "write",
		title: "Make one useful point",
		paragraphs: [
			"Start with an observation, add a concrete example, and explain why it matters to the person reading. Show enough detail for them to understand or try it.",
			"Good material includes something you learned, a decision you made, an experiment and its result, or an answer to a question someone asked. Separate what the source says, what you observed, and what you still want to test.",
		],
		example:
			"In [source], [author] argues [specific idea]. I noticed [example]. I want to try [action] and see whether [outcome].",
	},
	{
		id: "reach",
		title: "Spend time where those people are",
		paragraphs: [
			"Choose one place where your intended audience already talks. Learn from the conversations there. Leave comments that add an example, answer a question, or ask something thoughtful.",
			"Publish ideas where people can encounter them, and keep longer pieces on your own site when they need more space. Revisit a useful idea with a new example or a clearer explanation. You do not need a new subject every time.",
		],
		example:
			"A short post can explain one lesson from a longer article and link to the full piece for context.",
	},
	{
		id: "trust",
		title: "Build trust through your work",
		paragraphs: [
			"Give people a clear reason to understand and remember your work. Use a plain introduction, return to subjects you care about, and show examples behind your claims.",
			"Credit other people, keep private details private, and correct mistakes clearly. You do not need to keep announcing that you are not an expert. Specific wording lets readers judge what you know.",
		],
		example:
			"I tried this in [situation]. This part worked; this part did not. Here is what I would change.",
	},
	{
		id: "discomfort",
		title: "Let posting feel uncomfortable",
		paragraphs: [
			"Start at a size you can repeat: a useful comment, a draft shared with someone you trust, then a short post. Confidence can grow through practice.",
			"Before publishing, ask whether the point is true, useful to someone specific, and respectful of privacy. Set a drafting limit, edit once, and allow some discomfort to remain. Wait until the next day to review the response. Correct errors; give yourself time before deleting because you feel exposed.",
		],
		example:
			"When you expect embarrassment, compare what you feared with what actually happened after sharing.",
	},
	{
		id: "feedback",
		title: "Use feedback to learn",
		paragraphs: [
			"Someone may know more, disagree, or recommend a book you have not read. Check whether their point changes the claim you made. Thank people for useful corrections and update the work when needed. You can leave insults unanswered.",
			"Look for questions, useful conversations, and signs that someone applied an idea. Notice which subjects you want to keep exploring and which formats you can sustain. Let those observations guide what you share next.",
		],
		example:
			"I have not read that. Which part would you recommend for this question?",
	},
];

const MarketingGuide = () => (
	<article className="py-8 sm:py-14">
		<header className="max-w-3xl">
			<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
				Marketing · A reference guide
			</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
				Build your personal brand
			</h1>
			<p className="mt-4 text-lg leading-8 text-slate-600">
				Help people understand what you care about through useful ideas and real
				examples. Come back here when you need direction or feel nervous about
				sharing.
			</p>
		</header>

		<nav aria-label="Guide sections" className="mt-8 flex flex-wrap gap-2">
			{sections.map((section) => (
				<a
					className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
					href={`#${section.id}`}
					key={section.id}
				>
					{section.title}
				</a>
			))}
		</nav>

		<div className="mt-8 space-y-5">
			{sections.map((section) => (
				<section
					aria-labelledby={`${section.id}-title`}
					className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
					id={section.id}
					key={section.id}
				>
					<h2
						className="text-xl font-semibold tracking-tight text-slate-950"
						id={`${section.id}-title`}
					>
						{section.title}
					</h2>
					{section.paragraphs.map((paragraph) => (
						<p
							className="mt-4 max-w-3xl leading-7 text-slate-600"
							key={paragraph}
						>
							{paragraph}
						</p>
					))}
					<blockquote className="mt-5 max-w-3xl border-l-2 border-amber-500 pl-4 leading-7 text-slate-700">
						{section.example}
					</blockquote>
				</section>
			))}
		</div>
	</article>
);

export const Route = createFileRoute("/_authenticated/marketing")({
	head: () => ({ meta: [{ title: "Marketing - Andrew Byrd" }] }),
	component: MarketingGuide,
});
