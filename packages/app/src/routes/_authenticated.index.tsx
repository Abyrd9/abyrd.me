import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
	component: Home,
});

function Home() {
	return (
		<section className="flex flex-1 items-center py-16 sm:py-24">
			<div className="max-w-2xl">
				<p className="text-sm font-medium text-slate-500">Personal app</p>
				<h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
					Interview practice, in one private place.
				</h1>
				<p className="mt-5 text-lg leading-8 text-slate-600">
					Work through daily questions and short courses. Write your answer,
					then compare it with a clear guide.
				</p>
				<Link
					className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950"
					to="/quiz"
				>
					Start studying
				</Link>
			</div>
		</section>
	);
}
