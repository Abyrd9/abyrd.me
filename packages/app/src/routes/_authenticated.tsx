import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Button } from "#/components/primitives/button";
import { ThemeToggle } from "#/components/theme-toggle";
import { getSession, signOut } from "#/server/auth-functions";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();

		if (!session.isSignedIn) {
			throw redirect({
				to: "/sign-in",
				search: { redirect: location.href },
			});
		}
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const router = useRouter();

	async function handleSignOut() {
		await signOut();
		await router.navigate({ to: "/sign-in" });
	}

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-4 py-5 sm:px-10 sm:py-8">
			<header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center justify-between gap-4 sm:justify-start sm:gap-6">
					<Link className="font-semibold tracking-tight text-slate-950" to="/">
						Andrew Byrd
					</Link>
					<nav
						aria-label="Private app"
						className="flex items-center gap-4 text-sm"
					>
						<Link
							activeProps={{ className: "font-semibold text-slate-950" }}
							className="text-slate-600 transition hover:text-slate-950"
							to="/"
						>
							Home
						</Link>
						<Link
							activeProps={{ className: "font-semibold text-slate-950" }}
							className="text-slate-600 transition hover:text-slate-950"
							to="/quiz"
						>
							Study
						</Link>
					</nav>
				</div>
				<div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
					<ThemeToggle />
					<Button className="w-full sm:w-auto" onClick={handleSignOut}>
						Sign out
					</Button>
				</div>
			</header>

			<Outlet />
		</main>
	);
}
