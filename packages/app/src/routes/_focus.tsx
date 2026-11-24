import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "#/server/auth-functions";

// Signed-in pages that take over the whole screen, without the app nav.
export const Route = createFileRoute("/_focus")({
	beforeLoad: async ({ location }) => {
		const session = await getSession();
		if (!session.isSignedIn)
			throw redirect({ to: "/sign-in", search: { redirect: location.href } });
	},
	component: Outlet,
});
