import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadKindleSetup } from "#/server/kindle-functions";

export const Route = createFileRoute("/_authenticated/kindle/setup")({
	component: KindleSetup,
});

function KindleSetup() {
	const [token, setToken] = useState<string | null>(null);
	useEffect(() => {
		void loadKindleSetup().then(({ syncToken }) => setToken(syncToken));
	}, []);
	return (
		<section className="flex flex-1 flex-col py-8 sm:py-14">
			<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
				Kindle library
			</p>
			<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
				Set up Kindle sync.
			</h1>
			<ol className="mt-8 grid max-w-2xl gap-5 leading-7 text-slate-700">
				<li>
					<strong>1. Download the extension.</strong>
					<br />
					<a className="text-slate-950 underline" href="/kindle-extension.zip">
						Download Kindle extension
					</a>
				</li>
				<li>
					<strong>2. Load it in Chrome.</strong>
					<br />
					Open <code>chrome://extensions</code>, turn on Developer mode, and
					choose Load unpacked after unzipping it.
				</li>
				<li>
					<strong>3. Connect it here.</strong>
					<br />
					Keep this page open. The extension will connect, then open Kindle
					Notebook to import your highlights.
				</li>
			</ol>
			{token ? (
				<button
					className="mt-8 max-w-xs rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950"
					data-sync-token={token}
					disabled
					id="connect-kindle-extension"
					type="button"
				>
					Waiting for Kindle extension
				</button>
			) : (
				<p className="mt-8 text-slate-600">Preparing your connection…</p>
			)}
			<p className="mt-3 text-sm text-slate-600" id="kindle-extension-status">
				Load the extension in Chrome, then return here. This page will confirm
				when it detects the extension.
			</p>
		</section>
	);
}
