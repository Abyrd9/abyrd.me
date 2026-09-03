import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
	clearFantasyBoardState,
	type FantasyBoardState,
	type FantasyPlayerStatus,
	readFantasyBoardState,
	toggleFantasyPlayerStatus,
	writeFantasyBoardState,
} from "#/fantasy-board";

type Position = "D/ST" | "K" | "QB" | "RB" | "TE" | "WR";
type BoardView = "all" | "panthers" | "plan" | "sleepers" | "team" | Position;
type FantasyPlayer = {
	readonly name: string;
	readonly note: string;
	readonly panther?: boolean;
	readonly position: Position;
	readonly sleeper?: boolean;
	readonly target?: boolean;
	readonly team: string;
	readonly tier: 1 | 2 | 3 | 4 | 5;
};

const views = [
	["plan", "Start Here"],
	["all", "All Players"],
	["RB", "Running Backs"],
	["WR", "Wide Receivers"],
	["QB", "Quarterbacks"],
	["TE", "Tight Ends"],
	["D/ST", "Defenses"],
	["K", "Kickers"],
	["sleepers", "Late Picks"],
	["panthers", "Panthers"],
	["team", "My Picks"],
] satisfies readonly [BoardView, string][];

const tiers = [
	[1, "Best players"],
	[2, "Great starters"],
	[3, "Good picks"],
	[4, "Later picks"],
	[5, "Final-round options"],
] satisfies readonly [FantasyPlayer["tier"], string][];

const positionNames = {
	"D/ST": "Defense and special teams",
	K: "Kicker",
	QB: "Quarterback",
	RB: "Running back",
	TE: "Tight end",
	WR: "Wide receiver",
} satisfies Record<Position, string>;

const averageUnits = {
	"D/ST": "sacks per game",
	K: "field goals per game",
	QB: "passing yards per game",
	RB: "rushing yards per game",
	TE: "receiving yards per game",
	WR: "receiving yards per game",
} satisfies Record<Position, string>;

export const Route = createFileRoute("/_authenticated/fantasy")({
	component: FantasyDraftBoard,
});

function FantasyDraftBoard() {
	const [view, setView] = useState<BoardView>("plan");
	const [query, setQuery] = useState("");
	const [playerStatus, setPlayerStatus] = useState<FantasyBoardState>({});
	const [showBestAvailable, setShowBestAvailable] = useState(false);

	useEffect(() => {
		setPlayerStatus(readFantasyBoardState());
	}, []);

	const visiblePlayers = players.filter((player) => {
		if (view === "team" && playerStatus[player.name] !== "mine") return false;
		if (view === "sleepers" && !player.sleeper) return false;
		if (view === "panthers" && !player.panther) return false;
		if (
			["D/ST", "K", "QB", "RB", "TE", "WR"].includes(view) &&
			player.position !== view
		) {
			return false;
		}

		const search = view === "all" ? query.trim().toLowerCase() : "";
		if (!search) return true;

		return `${player.name} ${player.position} ${player.team}`
			.toLowerCase()
			.includes(search);
	});

	const bestAvailable = players
		.filter((player) => !playerStatus[player.name])
		.slice(0, 5);

	function setStatus(player: string, status: FantasyPlayerStatus) {
		setPlayerStatus((current) => {
			const next = toggleFantasyPlayerStatus(current, player, status);
			writeFantasyBoardState(next);
			return next;
		});
	}

	function resetBoard() {
		if (!Object.keys(playerStatus).length) return;
		if (!window.confirm("Clear every pick and start over?")) return;

		clearFantasyBoardState();
		setPlayerStatus({});
		setShowBestAvailable(false);
	}

	return (
		<section className="flex min-w-0 flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Fantasy football
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Fantasy Draft Helper
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					12 teams · You pick 8th · Head-to-head points
				</p>
				<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
					Full PPR: each catch is worth 1 point. The order reverses each round,
					so you pick 5th in Round 2, then 8th again in Round 3.
				</p>
			</div>

			<nav
				aria-label="Fantasy draft board views"
				className="-mx-4 mt-7 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0"
			>
				{views.map(([value, label]) => (
					<button
						aria-pressed={view === value}
						className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
							view === value
								? "border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
								: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
						}`}
						key={value}
						onClick={() => {
							setView(value);
							setShowBestAvailable(false);
						}}
						type="button"
					>
						{label}
					</button>
				))}
			</nav>

			{view === "plan" ? (
				<DraftPlan />
			) : (
				<div className="mt-6">
					{view === "all" ? (
						<label className="block">
							<span className="sr-only">Search players</span>
							<input
								className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none placeholder:text-slate-500 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Search player, position, or team"
								type="search"
								value={query}
							/>
						</label>
					) : null}

					{showBestAvailable ? (
						<div
							aria-live="polite"
							className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
						>
							<p className="font-semibold">Your top five options</p>
							<p className="mt-2 text-sm leading-6">
								{bestAvailable
									.map((player) => `${player.name} (${player.position})`)
									.join(" · ") || "Everyone on the board is marked."}
							</p>
						</div>
					) : null}

					<p className="mt-3 text-xs text-slate-500">
						2025 averages use regular-season totals from{" "}
						<a
							className="underline hover:text-slate-700"
							href="https://github.com/nflverse/nflverse-data"
							rel="noreferrer"
							target="_blank"
						>
							nflverse
						</a>
						.
					</p>

					<PlayerList
						onSetStatus={setStatus}
						players={visiblePlayers}
						playerStatus={playerStatus}
						view={view}
					/>
				</div>
			)}

			<div className="sticky bottom-3 mt-8 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:bg-slate-900/95">
				<button
					className="min-h-11 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
					onClick={resetBoard}
					type="button"
				>
					Start over
				</button>
				<button
					className="min-h-11 rounded-xl bg-emerald-300 px-4 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
					onClick={() => {
						setQuery("");
						setView("all");
						setShowBestAvailable(true);
					}}
					type="button"
				>
					Who should I pick?
				</button>
			</div>
		</section>
	);
}

function DraftPlan() {
	return (
		<div className="mt-6 grid gap-4">
			<article className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950 sm:p-6">
				<h2 className="text-xl font-semibold text-slate-950">
					Your first pick: 8th overall
				</h2>
				<p className="mt-3 leading-7 text-slate-700">
					Pick the best player still available. Start with a running back or
					wide receiver. Because catches earn a point, players who catch lots of
					passes are extra valuable.
				</p>
				<div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
					{[
						["Round 1 · Pick 8", "Best running back or receiver"],
						["Round 2 · Pick 5", "Running back or receiver"],
						["Round 3 · Pick 8", "Running back/receiver—or Bowers/McBride"],
						["Round 4 · Pick 5", "Running back/receiver—or Bowers/McBride"],
						["Round 5 · Pick 8", "Running back or receiver"],
						["Round 6 · Pick 5", "Quarterback, running back, or receiver"],
					].map(([pick, goal]) => (
						<div
							className="rounded-xl bg-white p-3 text-center dark:bg-slate-900"
							key={pick}
						>
							<strong className="block text-sm text-slate-950">{pick}</strong>
							<span className="mt-1 block text-xs text-slate-600">{goal}</span>
						</div>
					))}
				</div>
			</article>

			<article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
				<h2 className="text-xl font-semibold text-slate-950">
					A simple draft plan
				</h2>
				<ol className="mt-4 grid gap-4">
					{draftRules.map(([when, title, detail]) => (
						<li className="flex gap-3" key={title}>
							<span className="h-fit min-w-24 shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-center text-xs font-semibold text-slate-700">
								{when}
							</span>
							<div>
								<strong className="text-slate-950">{title}</strong>
								{detail ? (
									<p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
										{detail}
									</p>
								) : null}
							</div>
						</li>
					))}
				</ol>
			</article>

			<article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
				<h2 className="text-xl font-semibold text-slate-950">
					If you want Panthers players 🐾
				</h2>
				<div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700">
					<p>
						<strong>Tetairoa McMillan (WR):</strong> the best Panther to target.
						Pick him near where this board ranks him.
					</p>
					<p>
						<strong>Chuba Hubbard (RB):</strong> a useful backup running back if
						he is still available in the later rounds.
					</p>
					<p>
						<strong>Jalen Coker (WR):</strong> a late bench pick who may earn a
						larger role.
					</p>
					<p>
						<strong>Bryce Young (QB):</strong> only a late backup quarterback,
						not your main quarterback.
					</p>
				</div>
			</article>
		</div>
	);
}

function PlayerList({
	players: visiblePlayers,
	playerStatus,
	onSetStatus,
	view,
}: {
	readonly players: readonly FantasyPlayer[];
	readonly playerStatus: FantasyBoardState;
	readonly onSetStatus: (player: string, status: FantasyPlayerStatus) => void;
	readonly view: BoardView;
}) {
	if (!visiblePlayers.length) {
		return (
			<p className="py-16 text-center text-slate-500">
				No players match this list. Try another tab or search.
			</p>
		);
	}

	return (
		<div className="mt-6 grid gap-7">
			{tiers.map(([tier, label]) => {
				const tierPlayers = visiblePlayers.filter(
					(player) => player.tier === tier,
				);
				if (!tierPlayers.length) return null;

				const available = tierPlayers.filter(
					(player) => !playerStatus[player.name],
				).length;
				const count =
					view === "team"
						? `${tierPlayers.length} you picked`
						: `${available} still available`;

				return (
					<section key={tier}>
						<div className="mb-2 flex items-end justify-between gap-3 px-1">
							<h2 className="font-semibold text-slate-950">{label}</h2>
							<span className="text-xs text-slate-500">{count}</span>
						</div>
						<div className="grid gap-2">
							{tierPlayers.map((player) => (
								<PlayerCard
									key={player.name}
									onSetStatus={onSetStatus}
									player={player}
									status={playerStatus[player.name]}
								/>
							))}
						</div>
					</section>
				);
			})}
		</div>
	);
}

function PlayerCard({
	player,
	status,
	onSetStatus,
}: {
	readonly player: FantasyPlayer;
	readonly status?: FantasyPlayerStatus;
	readonly onSetStatus: (player: string, status: FantasyPlayerStatus) => void;
}) {
	return (
		<article
			className={`grid gap-4 rounded-2xl border bg-white p-4 transition sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${
				status === "mine"
					? "border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-900"
					: "border-slate-200"
			} ${status === "gone" ? "opacity-45" : ""}`}
		>
			<div className={status === "gone" ? "line-through" : ""}>
				<h3 className="font-semibold text-slate-950">{player.name}</h3>
				<p className="mt-1 text-sm text-slate-500">
					{positionNames[player.position]} ({player.position}) · {player.team} ·{" "}
					{tiers[player.tier - 1][1]}
				</p>
				<p className="mt-2 text-sm text-slate-700">
					{lastSeasonAverages[player.name] === undefined ? (
						"No 2025 NFL average"
					) : (
						<>
							2025 average:{" "}
							<span className="text-slate-500">
								{lastSeasonAverages[player.name]}{" "}
								{averageUnits[player.position]}
							</span>
						</>
					)}
				</p>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{player.panther ? <PlayerTag color="blue">Panther</PlayerTag> : null}
					{player.sleeper ? (
						<PlayerTag color="amber">Late pick</PlayerTag>
					) : null}
					{player.target ? (
						<PlayerTag color="emerald">Recommended</PlayerTag>
					) : null}
				</div>
				<p className="mt-2 text-sm leading-6 text-slate-600">{player.note}</p>
			</div>
			<div className="grid grid-cols-2 gap-2 sm:flex">
				<button
					aria-pressed={status === "mine"}
					className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
						status === "mine"
							? "border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
							: "border-slate-200 bg-slate-50 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
					}`}
					onClick={() => onSetStatus(player.name, "mine")}
					type="button"
				>
					I picked {player.position === "D/ST" ? "it" : "him"}
				</button>
				<button
					aria-pressed={status === "gone"}
					className={`min-h-10 rounded-lg border px-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
						status === "gone"
							? "border-slate-500 bg-slate-200 text-slate-950"
							: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
					}`}
					onClick={() => onSetStatus(player.name, "gone")}
					type="button"
				>
					Someone else did
				</button>
			</div>
		</article>
	);
}

function PlayerTag({
	children,
	color,
}: {
	readonly children: React.ReactNode;
	readonly color: "amber" | "blue" | "emerald";
}) {
	const colors = {
		amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
		blue: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
		emerald:
			"bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
	};

	return (
		<span
			className={`rounded-full px-2 py-1 text-xs font-semibold ${colors[color]}`}
		>
			{children}
		</span>
	);
}

const draftRules = [
	[
		"Rounds 1–5",
		"Build your running backs and receivers first.",
		"Rounds 1–2: Take a running back or wide receiver.\nRounds 3–4: Keep taking them unless Bowers or McBride is available.\nRound 5: Take another running back or wide receiver.",
	],
	[
		"Round 6+",
		"Wait until Round 6 for a quarterback.",
		"In Round 6 or later, take Josh Allen or Lamar Jackson if either is still available. Otherwise, keep taking running backs and receivers.",
	],
	[
		"Round 7+",
		"Take the best tight end left.",
		"Look for Kraft, Warren, Kittle, LaPorta, Kincaid, or Andrews.",
	],
	[
		"Rounds 9–13",
		"Use late picks on players who could improve.",
		"Rookies and backups can earn larger roles during the season.",
	],
	[
		"Any round",
		"Use Panthers fandom only to break a tie.",
		"If two players are close, pick the Panther. Do not take one several rounds too early.",
	],
	[
		"Last 2 rounds",
		"Wait until the end for defense and kicker.",
		"Pick your defense in the second-to-last round and your kicker in the last round.",
	],
] as const;

const players = [
	{
		name: "Jahmyr Gibbs",
		position: "RB",
		team: "DET",
		tier: 1,
		note: "One of the safest top players and a great first pick",
		target: true,
	},
	{
		name: "Bijan Robinson",
		position: "RB",
		team: "ATL",
		tier: 1,
		note: "Expected to get the ball often and score many touchdowns",
		target: true,
	},
	{
		name: "Jonathan Taylor",
		position: "RB",
		team: "IND",
		tier: 1,
		note: "Expected to handle most carries and score often",
		target: true,
	},
	{
		name: "Christian McCaffrey",
		position: "RB",
		team: "SF",
		tier: 1,
		note: "Still one of the best when healthy, but injuries are a concern",
	},
	{
		name: "Ja'Marr Chase",
		position: "WR",
		team: "CIN",
		tier: 1,
		note: "One of the best wide receivers and a good pick at 8th overall",
		target: true,
	},
	{
		name: "Puka Nacua",
		position: "WR",
		team: "LAR",
		tier: 1,
		note: "Should gain many yards and score often",
		target: true,
	},
	{
		name: "Jaxon Smith-Njigba",
		position: "WR",
		team: "SEA",
		tier: 1,
		note: "Widely ranked among the best wide receivers",
	},
	{
		name: "Amon-Ra St. Brown",
		position: "WR",
		team: "DET",
		tier: 1,
		note: "A dependable star on a strong offense",
	},
	{
		name: "Josh Allen",
		position: "QB",
		team: "BUF",
		tier: 1,
		note: "The top quarterback, but do not take him too early",
		target: true,
	},
	{
		name: "Lamar Jackson",
		position: "QB",
		team: "BAL",
		tier: 1,
		note: "Scores extra points by running and has huge weeks",
		target: true,
	},
	{
		name: "Drake Maye",
		position: "QB",
		team: "NE",
		tier: 1,
		note: "Could finish as one of fantasy's best quarterbacks",
	},
	{
		name: "Brock Bowers",
		position: "TE",
		team: "LV",
		tier: 1,
		note: "One of the few tight ends who can give you a large weekly advantage",
		target: true,
	},
	{
		name: "Trey McBride",
		position: "TE",
		team: "ARI",
		tier: 1,
		note: "One of the best tight ends to draft",
	},
	{
		name: "Colston Loveland",
		position: "TE",
		team: "CHI",
		tier: 1,
		note: "Could become one of the best tight ends",
	},
	{
		name: "James Cook III",
		position: "RB",
		team: "BUF",
		tier: 2,
		note: "Runs in a strong offense and should score often",
	},
	{
		name: "Derrick Henry",
		position: "RB",
		team: "BAL",
		tier: 2,
		note: "Scores many touchdowns, which matters a lot in your league",
		target: true,
	},
	{
		name: "De'Von Achane",
		position: "RB",
		team: "MIA",
		tier: 2,
		note: "Can score a lot of points in any week",
	},
	{
		name: "Saquon Barkley",
		position: "RB",
		team: "PHI",
		tier: 2,
		note: "Can break long plays and score often",
	},
	{
		name: "Chase Brown",
		position: "RB",
		team: "CIN",
		tier: 2,
		note: "Should get plenty of work in a strong offense",
	},
	{
		name: "CeeDee Lamb",
		position: "WR",
		team: "DAL",
		tier: 2,
		note: "Still good enough to be your best wide receiver",
	},
	{
		name: "Justin Jefferson",
		position: "WR",
		team: "MIN",
		tier: 2,
		note: "An excellent player if he is available in Round 2",
	},
	{
		name: "Drake London",
		position: "WR",
		team: "ATL",
		tier: 2,
		note: "His team should throw to him often, including near the goal line",
	},
	{
		name: "A.J. Brown",
		position: "WR",
		team: "NE",
		tier: 2,
		note: "Big plays and touchdowns make him a good fit for your scoring",
	},
	{
		name: "Nico Collins",
		position: "WR",
		team: "HOU",
		tier: 2,
		note: "Could finish as one of fantasy's best wide receivers",
	},
	{
		name: "George Pickens",
		position: "WR",
		team: "DAL",
		tier: 2,
		note: "Makes big plays and fits your scoring well",
	},
	{
		name: "Joe Burrow",
		position: "QB",
		team: "CIN",
		tier: 2,
		note: "Throws to great players in a strong offense",
	},
	{
		name: "Jalen Hurts",
		position: "QB",
		team: "PHI",
		tier: 2,
		note: "Scores extra points by running for touchdowns",
	},
	{
		name: "Jayden Daniels",
		position: "QB",
		team: "WAS",
		tier: 2,
		note: "Can score points by both passing and running",
	},
	{
		name: "Tucker Kraft",
		position: "TE",
		team: "GB",
		tier: 2,
		note: "A good starting tight end if the top choices are gone",
	},
	{
		name: "Tyler Warren",
		position: "TE",
		team: "IND",
		tier: 2,
		note: "A young tight end who could improve quickly",
	},
	{
		name: "George Kittle",
		position: "TE",
		team: "SF",
		tier: 2,
		note: "His touchdown ability fits your scoring well",
	},
	{
		name: "Sam LaPorta",
		position: "TE",
		team: "DET",
		tier: 2,
		note: "Plays in a good offense and may score often near the goal line",
	},
	{
		name: "Kenneth Walker III",
		position: "RB",
		team: "KC",
		tier: 3,
		note: "Can break long runs and fits your scoring well",
	},
	{
		name: "Kyren Williams",
		position: "RB",
		team: "LAR",
		tier: 3,
		note: "His team gives him good chances to score",
	},
	{
		name: "Ashton Jeanty",
		position: "RB",
		team: "LV",
		tier: 3,
		note: "Very talented, but check his health before draft night",
	},
	{
		name: "Chris Olave",
		position: "WR",
		team: "NO",
		tier: 3,
		note: "A good first or second wide receiver for your team",
	},
	{
		name: "Malik Nabers",
		position: "WR",
		team: "NYG",
		tier: 3,
		note: "Very talented, but check his health before drafting him",
	},
	{
		name: "Rashee Rice",
		position: "WR",
		team: "KC",
		tier: 3,
		note: "Plays in an offense that should score often",
	},
	{
		name: "DeVonta Smith",
		position: "WR",
		team: "PHI",
		tier: 3,
		note: "A dependable second wide receiver who can have big weeks",
	},
	{
		name: "Zay Flowers",
		position: "WR",
		team: "BAL",
		tier: 3,
		note: "Makes big plays, though catches alone do not score in your league",
	},
	{
		name: "Tee Higgins",
		position: "WR",
		team: "CIN",
		tier: 3,
		note: "Has a strong chance to score many touchdowns",
	},
	{
		name: "Emeka Egbuka",
		position: "WR",
		team: "TB",
		tier: 3,
		note: "A young wide receiver who should keep improving",
	},
	{
		name: "Tetairoa McMillan",
		position: "WR",
		team: "CAR",
		tier: 3,
		note: "The best Panther to target; take him near this spot on the board",
		panther: true,
		target: true,
	},
	{
		name: "Patrick Mahomes",
		position: "QB",
		team: "KC",
		tier: 3,
		note: "A good choice if other teams let him fall to a later round",
	},
	{
		name: "Bo Nix",
		position: "QB",
		team: "DEN",
		tier: 3,
		note: "A good option for your starting quarterback in a later round",
	},
	{
		name: "Caleb Williams",
		position: "QB",
		team: "CHI",
		tier: 3,
		note: "Could be a good starting quarterback if you wait on the position",
	},
	{
		name: "Travis Kelce",
		position: "TE",
		team: "KC",
		tier: 3,
		note: "Take him only if he lasts longer than expected",
	},
	{
		name: "Dalton Kincaid",
		position: "TE",
		team: "BUF",
		tier: 3,
		note: "A later pick who could improve",
	},
	{
		name: "Mark Andrews",
		position: "TE",
		team: "BAL",
		tier: 3,
		note: "His chance to score touchdowns fits your league well",
	},
	{
		name: "Josh Jacobs",
		position: "RB",
		team: "GB",
		tier: 4,
		note: "A riskier choice, so wait until the later rounds",
	},
	{
		name: "Chuba Hubbard",
		position: "RB",
		team: "CAR",
		tier: 4,
		note: "A useful backup running back if he is still available later",
		panther: true,
	},
	{
		name: "Ladd McConkey",
		position: "WR",
		team: "LAC",
		tier: 4,
		note: "A good second wide receiver for your team",
	},
	{
		name: "Jaylen Waddle",
		position: "WR",
		team: "DEN",
		tier: 4,
		note: "His speed gives him a chance for long plays",
	},
	{
		name: "Stefon Diggs",
		position: "WR",
		team: "WAS",
		tier: 4,
		note: "An experienced player who may be overlooked in later rounds",
		sleeper: true,
	},
	{
		name: "Josh Downs",
		position: "WR",
		team: "IND",
		tier: 4,
		note: "Catches plenty of short passes, which is useful in a full PPR league",
		sleeper: true,
	},
	{
		name: "Chris Rodriguez Jr.",
		position: "RB",
		team: "JAX",
		tier: 4,
		note: "Could get carries near the goal line and score touchdowns",
		sleeper: true,
	},
	{
		name: "Jalen Coker",
		position: "WR",
		team: "CAR",
		tier: 4,
		note: "A Panthers receiver who could catch more passes this season",
		panther: true,
		sleeper: true,
	},
	{
		name: "Denzel Boston",
		position: "WR",
		team: "CLE",
		tier: 4,
		note: "A rookie who could become one of Cleveland's main receivers",
		sleeper: true,
	},
	{
		name: "Baker Mayfield",
		position: "QB",
		team: "TB",
		tier: 4,
		note: "A solid quarterback you can take in a later round",
	},
	{
		name: "Jonathon Brooks",
		position: "RB",
		team: "CAR",
		tier: 5,
		note: "A late Panthers pick who could earn a larger role",
		panther: true,
		sleeper: true,
	},
	{
		name: "Jeremiyah Love",
		position: "RB",
		team: "ARI",
		tier: 5,
		note: "A rookie with potential; check his health and role before drafting",
		sleeper: true,
	},
	{
		name: "Jadarian Price",
		position: "RB",
		team: "SEA",
		tier: 5,
		note: "A risky rookie who could become useful later",
		sleeper: true,
	},
	{
		name: "Marshawn Lloyd",
		position: "RB",
		team: "GB",
		tier: 5,
		note: "A late pick who becomes useful if he gets more playing time",
		sleeper: true,
	},
	{
		name: "Jonah Coleman",
		position: "RB",
		team: "WAS",
		tier: 5,
		note: "A final-round backup who may earn a larger role",
		sleeper: true,
	},
	{
		name: "De'Zhaun Stribling",
		position: "WR",
		team: "SF",
		tier: 5,
		note: "A rookie who could earn a larger role",
		sleeper: true,
	},
	{
		name: "Jalen McMillan",
		position: "WR",
		team: "TB",
		tier: 5,
		note: "A late pick who could improve during the season",
		sleeper: true,
	},
	{
		name: "Xavier Legette",
		position: "WR",
		team: "CAR",
		tier: 5,
		note: "Only consider him in one of the final rounds",
		panther: true,
	},
	{
		name: "Chris Brazzell",
		position: "WR",
		team: "CAR",
		tier: 5,
		note: "A rookie Panther to keep on your bench as a long-term bet",
		panther: true,
		sleeper: true,
	},
	{
		name: "Bryce Young",
		position: "QB",
		team: "CAR",
		tier: 5,
		note: "Only use him as a backup quarterback, not your main starter",
		panther: true,
		sleeper: true,
	},
	{
		name: "Darren Waller",
		position: "TE",
		team: "CAR",
		tier: 5,
		note: "Only consider him in one of the final rounds",
		panther: true,
		sleeper: true,
	},
	{
		name: "Houston Texans",
		position: "D/ST",
		team: "HOU",
		tier: 5,
		note: "ESPN's top-ranked defense for 2026; take it in the second-to-last round",
	},
	{
		name: "Denver Broncos",
		position: "D/ST",
		team: "DEN",
		tier: 5,
		note: "A strong defense to take in the second-to-last round",
	},
	{
		name: "Pittsburgh Steelers",
		position: "D/ST",
		team: "PIT",
		tier: 5,
		note: "A good choice if Houston and Denver are already gone",
	},
	{
		name: "Seattle Seahawks",
		position: "D/ST",
		team: "SEA",
		tier: 5,
		note: "A good late alternative; wait until the second-to-last round",
	},
	{
		name: "Los Angeles Rams",
		position: "D/ST",
		team: "LAR",
		tier: 5,
		note: "Another good late option if the top defenses are gone",
	},
	{
		name: "Brandon Aubrey",
		position: "K",
		team: "DAL",
		tier: 5,
		note: "The top kicker; take him in the final round",
	},
	{
		name: "Cameron Dicker",
		position: "K",
		team: "LAC",
		tier: 5,
		note: "A very accurate kicker to take in the final round",
	},
	{
		name: "Jason Myers",
		position: "K",
		team: "SEA",
		tier: 5,
		note: "A good final-round choice if Aubrey and Dicker are gone",
	},
	{
		name: "Ka'imi Fairbairn",
		position: "K",
		team: "HOU",
		tier: 5,
		note: "A reliable final-round option",
	},
	{
		name: "Harrison Mevis",
		position: "K",
		team: "LAR",
		tier: 5,
		note: "Another good kicker to consider in the final round",
	},
	{
		name: "Ryan Fitzgerald",
		position: "K",
		team: "CAR",
		tier: 5,
		note: "The Panthers kicker; take him only in the final round",
		panther: true,
	},
	{
		name: "Drew Stevens",
		position: "K",
		team: "WAS",
		tier: 5,
		note: "Washington's rookie kicker; take him only in the final round",
	},
] satisfies readonly FantasyPlayer[];

const lastSeasonAverages: Readonly<Record<string, number | undefined>> = {
	"Jahmyr Gibbs": 71.9,
	"Bijan Robinson": 86.9,
	"Jonathan Taylor": 93.2,
	"Christian McCaffrey": 70.7,
	"Ja'Marr Chase": 88.2,
	"Puka Nacua": 107.2,
	"Jaxon Smith-Njigba": 105.5,
	"Amon-Ra St. Brown": 82.4,
	"Josh Allen": 229.2,
	"Lamar Jackson": 196.1,
	"Drake Maye": 258.5,
	"Brock Bowers": 56.7,
	"Trey McBride": 72.9,
	"Colston Loveland": 44.6,
	"James Cook III": 95.4,
	"Derrick Henry": 93.8,
	"De'Von Achane": 84.4,
	"Saquon Barkley": 71.2,
	"Chase Brown": 59.9,
	"CeeDee Lamb": 82.8,
	"Justin Jefferson": 61.6,
	"Drake London": 76.6,
	"A.J. Brown": 66.9,
	"Nico Collins": 74.5,
	"George Pickens": 84.1,
	"Joe Burrow": 226.1,
	"Jalen Hurts": 201.5,
	"Jayden Daniels": 180.3,
	"Tucker Kraft": 61.1,
	"Tyler Warren": 48.1,
	"George Kittle": 57.1,
	"Sam LaPorta": 54.3,
	"Kenneth Walker III": 60.4,
	"Kyren Williams": 73.6,
	"Ashton Jeanty": 57.4,
	"Chris Olave": 72.7,
	"Malik Nabers": 67.8,
	"Rashee Rice": 71.4,
	"DeVonta Smith": 59.3,
	"Zay Flowers": 71.2,
	"Tee Higgins": 56.4,
	"Emeka Egbuka": 55.2,
	"Tetairoa McMillan": 59.6,
	"Patrick Mahomes": 256.2,
	"Bo Nix": 231.2,
	"Caleb Williams": 231.9,
	"Travis Kelce": 50.1,
	"Dalton Kincaid": 47.6,
	"Mark Andrews": 24.8,
	"Josh Jacobs": 61.9,
	"Chuba Hubbard": 34.1,
	"Ladd McConkey": 49.3,
	"Jaylen Waddle": 56.9,
	"Stefon Diggs": 59.6,
	"Josh Downs": 35.4,
	"Chris Rodriguez Jr.": 41.7,
	"Jalen Coker": 35.8,
	"Baker Mayfield": 217.2,
	"Jalen McMillan": 44.5,
	"Xavier Legette": 24.2,
	"Bryce Young": 188.2,
	"Darren Waller": 31.4,
	"Houston Texans": 2.8,
	"Denver Broncos": 4.0,
	"Pittsburgh Steelers": 2.8,
	"Seattle Seahawks": 2.8,
	"Los Angeles Rams": 2.8,
	"Brandon Aubrey": 2.1,
	"Cameron Dicker": 2.2,
	"Jason Myers": 2.4,
	"Ka'imi Fairbairn": 2.9,
	"Harrison Mevis": 1.3,
	"Ryan Fitzgerald": 1.4,
};
