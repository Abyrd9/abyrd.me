import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Button } from "#/components/primitives/button";
import { getSession, signOut } from "#/server/auth-functions";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const session = await getSession();

		if (!session.isSignedIn) throw redirect({ to: "/sign-in" });
	},
	component: Home,
});

function Home() {
	const router = useRouter();

	async function handleSignOut() {
		await signOut();
		await router.navigate({ to: "/sign-in" });
	}

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-between px-6 py-8 sm:px-10">
			<header className="flex items-center justify-between">
				<a className="font-semibold tracking-tight" href="https://abyrd.me">
					Andrew Byrd
				</a>
				<Button onClick={handleSignOut}>Sign out</Button>
			</header>

			<section className="max-w-xl py-16 sm:py-24">
				<p className="mb-3 text-sm font-medium text-slate-500">Personal app</p>
				<h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
					You’re in.
				</h1>
				<p className="mt-5 text-lg leading-8 text-slate-600">
					This is the private side of abyrd.me. New personal tools will live
					here.
				</p>
			</section>

			<footer className="text-sm text-slate-500">app.abyrd.me</footer>
		</main>
	);
}
