import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	component: Home,
});

function Home() {
	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<h1 className="text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl">
				Your tools.
			</h1>
			<p className="mt-4 text-slate-600">
				A place for the things you want to keep and work on.
			</p>
			<div className="mt-10 border-t border-slate-200">
				<AppCard
					description="Search Kindle highlights, keep your notes, and archive the ones you do not need."
					label="Kindle"
					to="/kindle"
				/>
				<AppCard
					description="Save memorable lines with optional attribution, a web reference, and your own note."
					label="Quotes"
					to="/quotes"
				/>
				<AppCard
					description="Write books, essays, and posts on quiet, book-sized pages."
					label="Writing"
					to="/writing"
				/>
				<AppCard
					description="Read one short story, one essay, and one poem each day."
					label="Bradbury Challenge"
					to="/bradbury"
				/>
				<AppCard
					description="Save words and learn them through example sentences."
					label="Dictionary"
					to="/dictionary"
				/>
				<AppCard
					description="Keep Rook’s linocut avatar, handles, ink palette, bios, and social asset placeholders in one press dossier."
					label="Media"
					to="/media"
				/>
				<AppCard
					description="Review system-design terms, architecture patterns, and algorithm patterns."
					label="Study"
					to="/quiz"
				/>
			</div>
		</section>
	);
}

function AppCard({
	description,
	label,
	to,
}: {
	readonly description: string;
	readonly label: string;
	readonly to:
		| "/bradbury"
		| "/dictionary"
		| "/kindle"
		| "/media"
		| "/quiz"
		| "/quotes"
		| "/writing";
}) {
	return (
		<Link
			className="group flex items-start justify-between gap-6 border-b border-slate-200 py-5 no-underline"
			to={to}
		>
			<div>
				<h2 className="text-lg font-medium text-slate-950 group-hover:underline">
					{label}
				</h2>
				<p className="mt-1 leading-6 text-slate-600">{description}</p>
			</div>
			<span
				aria-hidden="true"
				className="pt-1 text-slate-500 transition-transform group-hover:translate-x-1"
			>
				→
			</span>
		</Link>
	);
}
