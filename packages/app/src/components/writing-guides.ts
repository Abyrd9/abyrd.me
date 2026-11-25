// Reference guides for shaping stories and essays, shown in the side panel.
// The explanations and examples are written for this app; the frameworks
// belong to the people credited with each.

export type GuideStep = {
	name: string;
	/** A few words under the step's name in the diagram. */
	short: string;
	meaning: string;
	questions: string[];
	example: string;
	/** For timelines: where the step falls in the story, 0–100. */
	at?: number;
	/** For grouped circles: which group the step belongs to. */
	group?: string;
};

export type Guide = {
	id: string;
	name: string;
	shape: "circle" | "timeline" | "flow";
	summary: string;
	credit: string;
	/** For circles, labels for the top and bottom halves. */
	halves?: [string, string];
	groups?: string[];
	steps: GuideStep[];
};

export const guides: Guide[] = [
	{
		id: "story-circle",
		name: "Story Circle",
		shape: "circle",
		summary:
			"Eight steps around a circle. The top half is the familiar world, the bottom half the unfamiliar one. A character goes down into the unknown, gets what they wanted, pays for it, and comes back changed. It works for a whole novel, a chapter, or a single scene.",
		credit:
			"After Dan Harmon's Story Circle, itself a simplification of the hero's journey.",
		halves: ["Familiar", "Unfamiliar"],
		steps: [
			{
				name: "You",
				short: "In a zone of comfort",
				meaning:
					"Meet the character where they're settled. Show what normal looks like for them before anything pushes on it.",
				questions: [
					"Who are they when nothing is happening to them?",
					"What do they take for granted?",
				],
				example:
					"Mara keeps the ledger at her father's ferry office, and likes knowing where everything is.",
			},
			{
				name: "Need",
				short: "But they want something",
				meaning:
					"Something is missing or wrong, and they feel it. What they think they want may not be what they need.",
				questions: [
					"What do they want, and what do they actually need?",
					"Why can't they get it where they are?",
				],
				example:
					"A letter says her brother hasn't been seen on the island for a month.",
			},
			{
				name: "Go",
				short: "They enter the unfamiliar",
				meaning:
					"They cross a line into a situation with different rules. Make the crossing cost something, so going back isn't easy.",
				questions: [
					"What threshold do they cross?",
					"What can't they undo once they're over it?",
				],
				example:
					"She takes the night ferry to the island alone, against her father's wishes.",
			},
			{
				name: "Search",
				short: "They adapt to it",
				meaning:
					"The new world tests them. They learn its rules, gather allies, and make mistakes. This is often the longest stretch.",
				questions: [
					"What do they have to learn to survive here?",
					"Who helps them, and who's in the way?",
				],
				example:
					"The islanders lie to her. She learns the tides, and which people to trust.",
			},
			{
				name: "Find",
				short: "They get what they wanted",
				meaning:
					"At the bottom of the circle they reach the thing they came for, usually not in the form they expected.",
				questions: [
					"What do they find?",
					"How is it different from what they imagined?",
				],
				example: "She finds her brother alive. He's hiding by choice.",
			},
			{
				name: "Take",
				short: "Then pay a price for it",
				meaning:
					"Getting it costs something real. This is where the story earns its ending.",
				questions: [
					"What does winning cost them?",
					"What do they give up, or lose, that they can't get back?",
				],
				example:
					"To protect him, she has to burn the ledger, and her family's livelihood with it.",
			},
			{
				name: "Return",
				short: "Back where they started",
				meaning:
					"They come back up into the familiar world, carrying what happened with them.",
				questions: [
					"What do they bring home?",
					"How does home look to them now?",
				],
				example:
					"She returns on the morning ferry without him, and the office looks smaller.",
			},
			{
				name: "Change",
				short: "Having changed",
				meaning:
					"The world they came back to is the same; they aren't. Show the difference in something they do.",
				questions: [
					"How are they different from the person in step one?",
					"What action proves it?",
				],
				example:
					"She runs the office now, and keeps two ledgers: one true, one for the town.",
			},
		],
	},
	{
		id: "heros-journey",
		name: "Hero's Journey",
		shape: "circle",
		summary:
			"Twelve stages in three movements: leaving home, being tested, and coming back. It's the pattern behind many myths and adventure stories. Use it as a map of possibilities, not a checklist; most stories skip or merge stages.",
		credit:
			"After Joseph Campbell's monomyth, in the twelve-stage form popularized by Christopher Vogler.",
		groups: ["Departure", "Initiation", "Return"],
		steps: [
			{
				name: "Ordinary World",
				short: "Home, before",
				group: "Departure",
				meaning:
					"Show the hero's everyday life, and the flaw or lack that the journey will touch.",
				questions: [
					"What does a normal day look like?",
					"What's quietly wrong?",
				],
				example: "A farm boy repairs nets and dreams about the mainland.",
			},
			{
				name: "Call to Adventure",
				short: "Something disrupts it",
				group: "Departure",
				meaning:
					"A problem, message, or opportunity arrives that the ordinary world can't absorb.",
				questions: ["What arrives?", "Why now?"],
				example: "A wounded stranger washes ashore carrying a sealed map.",
			},
			{
				name: "Refusal of the Call",
				short: "They hesitate",
				group: "Departure",
				meaning:
					"Fear, duty, or doubt holds them back. This shows the stakes and makes the choice to go mean something.",
				questions: [
					"What are they afraid of losing?",
					"Who tells them not to go?",
				],
				example: "He hides the map. His mother needs him for the harvest.",
			},
			{
				name: "Meeting the Mentor",
				short: "Someone prepares them",
				group: "Departure",
				meaning:
					"A guide offers advice, a gift, or confidence. The mentor can be a person, a memory, or a book.",
				questions: [
					"Who or what gives them what they lack?",
					"What does the mentor withhold?",
				],
				example:
					"The stranger teaches him to read the map's stars before he dies.",
			},
			{
				name: "Crossing the Threshold",
				short: "They commit",
				group: "Departure",
				meaning:
					"They leave the known world. The story's real business starts here.",
				questions: [
					"What's the point of no return?",
					"What do they leave behind?",
				],
				example: "He takes the boat out past the reef at night.",
			},
			{
				name: "Tests, Allies, Enemies",
				short: "They learn the new world",
				group: "Initiation",
				meaning:
					"Smaller trials teach them the rules and show who's on which side.",
				questions: [
					"What do they get wrong at first?",
					"Who do they trust too much, or too little?",
				],
				example:
					"A smuggler helps him, then sells his route to the harbor guard.",
			},
			{
				name: "Approach",
				short: "They near the danger",
				group: "Initiation",
				meaning:
					"They prepare for the central ordeal. Tension builds; plans are made and fail.",
				questions: [
					"What are they walking toward?",
					"What do they rehearse, and what can't they plan for?",
				],
				example:
					"He reaches the drowned city marked on the map, and waits for low tide.",
			},
			{
				name: "Ordeal",
				short: "The greatest test",
				group: "Initiation",
				meaning:
					"They face their biggest fear and seem to fail, or die, before coming through.",
				questions: [
					"What do they most fear here?",
					"What has to die, literally or not?",
				],
				example: "The tide turns early. He nearly drowns in the vault.",
			},
			{
				name: "Reward",
				short: "They seize the prize",
				group: "Initiation",
				meaning:
					"Having survived, they gain the thing they came for, or a truth worth more.",
				questions: [
					"What do they win?",
					"What do they understand now that they didn't?",
				],
				example:
					"The treasure is a ledger of debts his village owes the crown.",
			},
			{
				name: "The Road Back",
				short: "Consequences follow",
				group: "Return",
				meaning: "They turn toward home, but what they did follows them.",
				questions: ["Who's chasing them?", "What does going home require?"],
				example: "The harbor guard is waiting at the reef.",
			},
			{
				name: "Resurrection",
				short: "One final test",
				group: "Return",
				meaning:
					"A last, decisive trial where they have to use everything they've learned. Their change is proven here.",
				questions: [
					"How is this test different from the ordeal?",
					"What choice shows who they've become?",
				],
				example:
					"He burns the ledger in front of the guard rather than hand it over.",
			},
			{
				name: "Return with the Elixir",
				short: "Home, changed",
				group: "Return",
				meaning:
					"They come home with something that heals or changes it: an object, knowledge, or themselves.",
				questions: [
					"What do they bring back?",
					"How does home change because of it?",
				],
				example:
					"The village's debts are gone with the ledger, and he no longer dreams of leaving.",
			},
		],
	},
	{
		id: "three-act",
		name: "Three Acts",
		shape: "timeline",
		summary:
			"The oldest working shape: setup, confrontation, resolution. The turning points matter more than the acts; each one changes the direction of the story. The percentages are rough guides to where they tend to fall.",
		credit:
			"A long tradition, often traced to Aristotle's beginning, middle, and end, and later set out by Syd Field and others.",
		steps: [
			{
				name: "Opening",
				short: "The world and the person",
				at: 0,
				meaning:
					"Establish the main character, their world, and what they want, quickly enough that the reader cares.",
				questions: [
					"What's the first image you want in the reader's mind?",
					"What does the character want right now?",
				],
				example: "Mara balances the ferry ledger by lamplight.",
			},
			{
				name: "Inciting Incident",
				short: "The story starts",
				at: 12,
				meaning:
					"Something happens that upends normal life and poses the story's central question.",
				questions: [
					"What event makes this story start today?",
					"What question does it raise?",
				],
				example: "The letter about her brother arrives.",
			},
			{
				name: "First Turning Point",
				short: "No way back",
				at: 25,
				meaning:
					"The character commits to a course of action and enters Act Two. It should be their choice.",
				questions: ["What do they decide?", "Why can't they undo it?"],
				example: "She takes the night ferry to the island.",
			},
			{
				name: "Midpoint",
				short: "Everything shifts",
				at: 50,
				meaning:
					"A revelation or reversal changes what the story is about, often turning the character from reacting to acting.",
				questions: [
					"What do they learn that changes the goal?",
					"How does the story's question change?",
				],
				example: "She learns her brother isn't missing. He's hiding.",
			},
			{
				name: "Crisis",
				short: "All seems lost",
				at: 75,
				meaning:
					"The lowest point. The plan fails, and the character has to face what they've been avoiding.",
				questions: [
					"What's the worst thing that could happen now?",
					"What truth can't they avoid anymore?",
				],
				example: "Her father arrives to bring them both home by force.",
			},
			{
				name: "Climax",
				short: "The decisive choice",
				at: 90,
				meaning:
					"The central conflict comes to a head, and the character's final choice decides it.",
				questions: ["What choice resolves the story?", "What does it cost?"],
				example: "She burns the ledger to protect her brother.",
			},
			{
				name: "Resolution",
				short: "The new normal",
				at: 100,
				meaning:
					"Show the world after. Let the reader feel the change before the story ends.",
				questions: [
					"What's different now?",
					"What image do you want to end on?",
				],
				example: "She keeps two ledgers now: one true, one for the town.",
			},
		],
	},
	{
		id: "essay",
		name: "Essay",
		shape: "flow",
		summary:
			"A shape for thinking on paper. Start from a real question, follow your answer, take the best objection seriously, and end somewhere you couldn't have reached at the start. The essay is the record of the thinking.",
		credit:
			'After Montaigne\'s essais, "attempts", and the way philosophers argue: claim, objection, reply.',
		steps: [
			{
				name: "Question",
				short: "Something you actually wonder",
				meaning:
					"Begin with a question you don't know the answer to. A puzzle you've noticed beats a topic you've been assigned.",
				questions: [
					"What keeps bothering you about this?",
					"Can you ask it in one sentence?",
				],
				example: "Why does knowing more make me less willing to speak?",
			},
			{
				name: "Stakes",
				short: "Why it matters",
				meaning:
					"Show why the question deserves an answer: what depends on it, or what goes wrong if we get it wrong.",
				questions: [
					"Who should care about this, and why?",
					"What changes if you answer it?",
				],
				example:
					"If learning makes us quieter, the people who know least end up talking most.",
			},
			{
				name: "Claim",
				short: "Your first answer",
				meaning:
					"Give your best current answer and the reasons for it. Be plain and specific.",
				questions: [
					"What do you think, in one sentence?",
					"What's your strongest reason?",
				],
				example:
					"We go quiet because learning shows us how much we don't know.",
			},
			{
				name: "Objection",
				short: "The best case against it",
				meaning:
					"Make the strongest argument against your claim, the version a smart opponent would make.",
				questions: [
					"Where is your claim weakest?",
					"What would someone who disagrees say first?",
				],
				example:
					"Experts talk all the time. Maybe it's fear of judgment, not knowledge, that silences us.",
			},
			{
				name: "Response",
				short: "Answer it honestly",
				meaning:
					"Reply to the objection. Concede what's right, refine what's left, or change your mind.",
				questions: [
					"What does the objection get right?",
					"What survives of your claim?",
				],
				example:
					"It's both: knowing more raises the bar, and the higher bar makes judgment scarier.",
			},
			{
				name: "Return",
				short: "The question, seen anew",
				meaning:
					"Come back to the opening question and show how you see it now. The ending is the distance traveled.",
				questions: [
					"How would you ask the question now?",
					"What would you tell yourself at the start?",
				],
				example:
					"Writing isn't announcing what I know; it's how I find out. So the bar was never the point.",
			},
		],
	},
];
