import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	component: Home,
});

function Home() {
	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<div className="max-w-3xl">
				<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
					Personal app
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
					Choose what you want to work on.
				</h1>
				<p className="mt-4 leading-7 text-slate-600 sm:text-lg sm:leading-8">
					Study interview fundamentals or return to the highlights you saved
					from your Kindle.
				</p>
			</div>
			<div className="mt-8 grid gap-4 sm:grid-cols-2">
				<AppCard
					description="Review system-design terms, architecture patterns, and algorithm solutions."
					label="Study"
					to="/quiz"
					title="Interview practice"
				/>
				<AppCard
					description="Search Kindle highlights, keep your notes, and archive the ones you do not need."
					label="Kindle"
					to="/kindle"
					title="Your reading library"
				/>
			</div>
		</section>
	);
}

function AppCard({
	description,
	label,
	title,
	to,
}: {
	readonly description: string;
	readonly label: string;
	readonly title: string;
	readonly to: "/kindle" | "/quiz";
}) {
	return (
		<Link
			className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:p-6"
			to={to}
		>
			<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
				{label}
			</p>
			<h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">
				{title}
			</h2>
			<p className="mt-3 leading-7 text-slate-600">{description}</p>
			<span className="mt-5 inline-flex text-sm font-medium text-slate-950 group-hover:underline">
				Open {label}
			</span>
		</Link>
	);
}
