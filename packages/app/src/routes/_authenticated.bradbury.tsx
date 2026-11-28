import { createFileRoute } from "@tanstack/react-router";
import { getBradburyReadings } from "#/server/bradbury/bradbury-functions";

const Bradbury = () => {
	const { date, readings } = Route.useLoaderData();
	const label = new Intl.DateTimeFormat("en-US", {
		timeZone: "UTC",
		dateStyle: "full",
	}).format(new Date(`${date}T00:00:00Z`));

	return (
		<section className="w-full max-w-2xl py-8 sm:py-14">
			<header>
				<h1 className="text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
					Bradbury Challenge
				</h1>
				<p className="mt-4 text-slate-600">
					One short story, one essay, and one poem. All free to read.
				</p>
			</header>

			<h2 className="mt-10 text-sm font-medium text-slate-700">
				<time dateTime={date}>{label}</time>
			</h2>
			<ul className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
				{readings.map(({ kind, title, author, url }) => (
					<li key={kind}>
						<a
							className="group flex items-center justify-between gap-4 py-4 no-underline focus-visible:outline-2 focus-visible:outline-offset-2"
							href={url}
						>
							<span>
								<span className="block text-sm text-slate-600">{kind}</span>
								<span className="mt-1 block text-lg font-medium text-slate-950 group-hover:underline">
									{title}
								</span>
								<span className="mt-1 block text-sm text-slate-600">
									{author} · Wikisource
								</span>
							</span>
							<span aria-hidden="true" className="text-slate-600">
								↗
							</span>
						</a>
					</li>
				))}
			</ul>
		</section>
	);
};

export const Route = createFileRoute("/_authenticated/bradbury")({
	head: () => ({ meta: [{ title: "Bradbury Challenge · abyrd.me" }] }),
	loader: () => getBradburyReadings(),
	component: Bradbury,
});
