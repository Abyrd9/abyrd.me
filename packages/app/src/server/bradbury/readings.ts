type Reading = readonly [title: string, author: string, page: string];

const stories: Reading[] = [
	["The Gift of the Magi", "O. Henry", "The_Gift_of_the_Magi"],
	["The Open Window", "Saki", "Beasts_and_Super-Beasts/The_Open_Window"],
	["The Story of an Hour", "Kate Chopin", "The_Story_of_an_Hour"],
	[
		"The Tell-Tale Heart",
		"Edgar Allan Poe",
		"Mystery_Tales_of_Edgar_Allan_Poe/The_Tell-Tale_Heart",
	],
	[
		"The Necklace",
		"Guy de Maupassant",
		"Stories_by_Foreign_Authors_(French_I)/The_Necklace",
	],
	["The Yellow Wallpaper", "Charlotte Perkins Gilman", "The_Yellow_Wallpaper"],
	["A White Heron", "Sarah Orne Jewett", "A_White_Heron"],
	[
		"The Nightingale and the Rose",
		"Oscar Wilde",
		"The_Happy_Prince_and_Other_Tales/The_Nightingale_and_the_Rose",
	],
	["The Boarded Window", "Ambrose Bierce", "The_Boarded_Window"],
	[
		"The Celebrated Jumping Frog of Calaveras County",
		"Mark Twain",
		"The_Celebrated_Jumping_Frog_of_Calaveras_County",
	],
	["The Lady, or the Tiger?", "Frank R. Stockton", "The_Lady,_or_the_Tiger%3F"],
	[
		"The Garden Party",
		"Katherine Mansfield",
		"The_Garden_Party,_and_Other_Stories/The_Garden-Party",
	],
	["Araby", "James Joyce", "Dubliners/Araby"],
	["The Man Who Would Be King", "Rudyard Kipling", "The_Man_Who_Would_Be_King"],
	[
		"To Build a Fire",
		"Jack London",
		"Century_Magazine/Volume_76/Issue_4/To_Build_a_Fire",
	],
	["A Retrieved Reformation", "O. Henry", "A_Retrieved_Reformation"],
	["The Interlopers", "Saki", "The_Interlopers"],
	[
		"The Black Cat",
		"Edgar Allan Poe",
		"Mystery_Tales_of_Edgar_Allan_Poe/The_Black_Cat",
	],
	[
		"An Occurrence at Owl Creek Bridge",
		"Ambrose Bierce",
		"An_Occurrence_at_Owl_Creek_Bridge",
	],
	[
		"The Happy Prince",
		"Oscar Wilde",
		"The_Happy_Prince_and_Other_Tales/The_Happy_Prince",
	],
	["Eveline", "James Joyce", "Dubliners/Eveline"],
	[
		"Miss Brill",
		"Katherine Mansfield",
		"The_Garden_Party,_and_Other_Stories/Miss_Brill",
	],
	["The Last Leaf", "O. Henry", "The_Trimmed_Lamp_(1907)/The_Last_Leaf"],
	[
		"The Masque of the Red Death",
		"Edgar Allan Poe",
		"The_Works_of_the_Late_Edgar_Allan_Poe_(1850)/Volume_1/The_Masque_of_the_Red_Death",
	],
	[
		"Her First Ball",
		"Katherine Mansfield",
		"The_Garden_Party,_and_Other_Stories/Her_First_Ball",
	],
	[
		"A Pair of Silk Stockings",
		"Kate Chopin",
		"A_Pair_of_Silk_Stockings_(Chopin)",
	],
	["Kew Gardens", "Virginia Woolf", "Kew_Gardens_(1919)"],
	["The Star", "H. G. Wells", "Tales_of_Space_and_Time/The_Star"],
];

const essays: Reading[] = [
	["Of Studies", "Francis Bacon", "The_Essays_of_Francis_Bacon/L_Of_Studies"],
	["A Modest Proposal", "Jonathan Swift", "A_Modest_Proposal"],
	["The Strenuous Life", "Theodore Roosevelt", "The_Strenuous_Life"],
	["The Decay of Lying", "Oscar Wilde", "Intentions/The_Decay_of_Lying"],
	["Walking", "Henry David Thoreau", "Walking"],
	[
		"Of Friendship",
		"Francis Bacon",
		"The_Essays_of_Francis_Bacon/XXVII_Of_Friendship",
	],
	["Federalist No. 10", "James Madison", "The_Federalist_(Dawson)/10"],
	[
		"Civil Disobedience",
		"Henry David Thoreau",
		"The_Writings_of_Henry_David_Thoreau_(1906)/Volume_4/Civil_Disobedience",
	],
	["Compensation", "Ralph Waldo Emerson", "Essays:_First_Series/Compensation"],
	[
		"The Duties of American Citizenship",
		"Theodore Roosevelt",
		"The_Duties_of_American_Citizenship",
	],
	["Of Truth", "Francis Bacon", "The_Essays_of_Francis_Bacon/I_Of_Truth"],
	[
		"Of the Liberty of Thought and Discussion",
		"John Stuart Mill",
		"On_Liberty/Chapter_2",
	],
	[
		"On the Knocking at the Gate in Macbeth",
		"Thomas De Quincey",
		"On_the_Knocking_at_the_Gate_in_Macbeth",
	],
	[
		"The Philosophy of Composition",
		"Edgar Allan Poe",
		"The_Philosophy_of_Composition",
	],
	["Of Travel", "Francis Bacon", "The_Essays_of_Francis_Bacon/XVIII_Of_Travel"],
	[
		"Self-Reliance",
		"Ralph Waldo Emerson",
		"Essays:_First_Series/Self-Reliance",
	],
	["The American Scholar", "Ralph Waldo Emerson", "The_American_Scholar"],
	["A Defence of Poetry", "Percy Bysshe Shelley", "A_Defence_of_Poetry"],
	["History", "Ralph Waldo Emerson", "Essays:_First_Series/History"],
	[
		"The Significance of the Frontier in American History",
		"Frederick Jackson Turner",
		"The_Frontier_in_American_History/Chapter_I",
	],
	[
		"Of Gardens",
		"Francis Bacon",
		"The_Essays_of_Francis_Bacon/XLVI_Of_Gardens",
	],
	["The Poet", "Ralph Waldo Emerson", "Essays:_Second_Series/The_Poet"],
	["Experience", "Ralph Waldo Emerson", "Essays:_Second_Series/Experience"],
	[
		"An Apology for Idlers",
		"Robert Louis Stevenson",
		"Virginibus_Puerisque_and_Other_Papers/An_Apology_for_Idlers",
	],
	[
		"The Gospel of Wealth",
		"Andrew Carnegie",
		"The_Gospel_of_Wealth_and_Other_Timely_Essays/The_Gospel_of_Wealth",
	],
	[
		"Fundamentals of Scientific Management",
		"Frederick Winslow Taylor",
		"The_Principles_of_Scientific_Management/Chapter_1",
	],
	["Of Beauty", "Francis Bacon", "The_Essays_of_Francis_Bacon/XLIII_Of_Beauty"],
	[
		"What to the Slave Is the Fourth of July?",
		"Frederick Douglass",
		"What_to_the_Slave_Is_the_Fourth_of_July%3F/Annotated",
	],
];

const poems: Reading[] = [
	["Ozymandias", "Percy Bysshe Shelley", "The_Examiner_(London)/Ozymandias"],
	[
		"Hope is the thing with feathers",
		"Emily Dickinson",
		"Poems:_Second_Series_(Dickinson)/Hope",
	],
	[
		"The Tyger",
		"William Blake",
		"Songs_of_Innocence_and_of_Experience_(1826)/Songs_of_Experience/The_Tyger",
	],
	[
		"A Noiseless Patient Spider",
		"Walt Whitman",
		"Leaves_of_Grass_(1882)/Whispers_of_Heavenly_Death/A_Noiseless_Patient_Spider",
	],
	[
		"Jabberwocky",
		"Lewis Carroll",
		"Through_the_Looking-Glass,_and_What_Alice_Found_There/Chapter_I#pagenumber_21",
	],
	[
		"The Road Not Taken",
		"Robert Frost",
		"Mountain_Interval/The_Road_Not_Taken",
	],
	[
		"In Flanders Fields",
		"John McCrae",
		"In_Flanders_Fields_and_Other_Poems/In_Flanders_Fields",
	],
	["The Lake Isle of Innisfree", "W. B. Yeats", "The_Lake_Isle_of_Innisfree"],
	[
		"We Wear the Mask",
		"Paul Laurence Dunbar",
		"Lyrics_of_Lowly_Life/We_wear_the_Mask",
	],
	[
		"I Wandered Lonely as a Cloud",
		"William Wordsworth",
		"Poems_That_Every_Child_Should_Know/I_Wandered_Lonely_as_a_Cloud",
	],
	[
		"Sonnet 18",
		"William Shakespeare",
		"Shakespeare%27s_Sonnets_(1883)/Sonnet_18",
	],
	["To Autumn", "John Keats", "Keats;_poems_published_in_1820/To_Autumn"],
	[
		"Annabel Lee",
		"Edgar Allan Poe",
		"The_Works_of_the_Late_Edgar_Allan_Poe_(1859)/Volume_2/Annabel_Lee",
	],
	[
		"Remember",
		"Christina Rossetti",
		"Goblin_Market_and_Other_Poems_(1862)/Remember",
	],
	[
		"Because I could not stop for Death",
		"Emily Dickinson",
		"The_Complete_Poems_of_Emily_Dickinson/Because_I_could_not_stop_for_Death",
	],
	[
		"To a Skylark",
		"Percy Bysshe Shelley",
		"Prometheus_Unbound;_a_lyrical_drama_in_four_acts_with_other_poems/To_a_Skylark",
	],
	["The New Colossus", "Emma Lazarus", "The_New_Colossus"],
	[
		"Invictus",
		"William Ernest Henley",
		"Oxford_Book_of_English_Verse_1250-1900/Invictus",
	],
	[
		"The Second Coming",
		"W. B. Yeats",
		"Michael_Robartes_and_the_Dancer/The_Second_Coming",
	],
	[
		"A Red, Red Rose",
		"Robert Burns",
		"Six_Excellent_Songs_(Newton_Stewart)/A_Red,_Red_Rose",
	],
	[
		"The Bells",
		"Edgar Allan Poe",
		"The_Works_of_the_Late_Edgar_Allan_Poe_(1859)/Volume_2/The_Bells",
	],
	[
		"The Raven",
		"Edgar Allan Poe",
		"The_American_Review:_A_Whig_Journal_of_Politics,_Literature,_Art,_and_Science/Volume_01/February_1845/The_Raven",
	],
	["Dover Beach", "Matthew Arnold", "Dover_Beach"],
	["The Darkling Thrush", "Thomas Hardy", "The_Darkling_Thrush"],
	["If—", "Rudyard Kipling", "If—"],
	[
		"At the Sea-Side",
		"Robert Louis Stevenson",
		"A_Child%27s_Garden_of_Verses/At_the_Sea-Side",
	],
	["When I Was One-and-Twenty", "A. E. Housman", "A_Shropshire_Lad/XIII"],
	[
		"Fire and Ice",
		"Robert Frost",
		"New_Hampshire,_a_Poem_with_Notes_and_Grace_Notes/Fire_and_Ice",
	],
];

const shelves = [
	{ kind: "Short story", readings: stories },
	{ kind: "Essay", readings: essays },
	{ kind: "Poem", readings: poems },
];

const calendar = new Intl.DateTimeFormat("en-CA", {
	timeZone: "America/New_York",
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export function getBradburyEdition(now: Date) {
	const date = calendar.format(now);
	const day = Date.parse(`${date}T00:00:00Z`) / 86_400_000;

	const readings = shelves.map(({ kind, readings }) => {
		const index = ((day % readings.length) + readings.length) % readings.length;
		const [title, author, page] = readings[index];
		const url = new URL(`/wiki/${page}`, "https://en.wikisource.org").href;
		return { kind, title, author, url };
	});

	return { date, readings };
}
