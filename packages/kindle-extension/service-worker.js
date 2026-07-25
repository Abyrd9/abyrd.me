const notebookUrl = "https://read.amazon.com/notebook";
const alarmName = "daily-kindle-sync";
const appPagePatterns = [
	"https://app.abyrd.me/*",
	"https://andrews-mac-mini-1.tail121ec5.ts.net/*",
];

const isAmazonSignIn = (url) => /signin|ap\/signin|ap\/cvf/i.test(url || "");

async function getSyncStatus() {
	const saved = await chrome.storage.local.get([
		"appUrl",
		"token",
		"syncStatus",
	]);
	if (!saved.appUrl || !saved.token) {
		return {
			state: "not-connected",
			message: "Extension detected. Connect it to this app to begin.",
		};
	}
	return (
		saved.syncStatus ?? {
			state: "ready",
			message: "Extension connected. Ready to sync.",
		}
	);
}

async function updateSyncStatus(status) {
	const next = { ...status, updatedAt: Date.now() };
	await chrome.storage.local.set({ syncStatus: next });
	const tabs = await chrome.tabs.query({ url: appPagePatterns });
	await Promise.all(
		tabs.map((tab) =>
			chrome.tabs
				.sendMessage(tab.id, { type: "kindle-sync-status", status: next })
				.catch(() => undefined),
		),
	);
	return next;
}

async function startSync({ force = false } = {}) {
	const saved = await chrome.storage.local.get([
		"appUrl",
		"token",
		"syncTabId",
	]);
	if (!saved.appUrl || !saved.token) {
		const status = await updateSyncStatus({
			state: "not-connected",
			message: "Connect the extension from the Kindle setup page first.",
		});
		throw new Error(status.message);
	}

	const currentTab = saved.syncTabId
		? await chrome.tabs.get(saved.syncTabId).catch(() => null)
		: null;
	if (currentTab && !force) {
		return updateSyncStatus({
			state: "syncing",
			message: "Kindle sync is already running…",
		});
	}

	const tab = currentTab
		? await chrome.tabs.update(currentTab.id, {
				url: notebookUrl,
				active: false,
			})
		: await chrome.tabs.create({ url: notebookUrl, active: false });
	await chrome.storage.local.set({ syncTabId: tab.id, lastError: "" });
	return updateSyncStatus({
		state: "syncing",
		message: "Opening Kindle Notebook…",
	});
}

async function rejectSync(error, sender) {
	const message =
		error instanceof Error ? error.message : "Kindle sync failed.";
	const state = /sign in to amazon/i.test(message)
		? "needs-amazon-sign-in"
		: /invalid sync token|reconnect/i.test(message)
			? "needs-reconnect"
			: "failed";
	if (sender.tab?.id && state !== "needs-amazon-sign-in") {
		await chrome.storage.local.set({ syncTabId: null });
	}
	const status = await updateSyncStatus({ state, message });
	return { ok: false, error: message, status };
}

async function importKindlePayload(payload, sender) {
	const saved = await chrome.storage.local.get([
		"appUrl",
		"token",
		"syncTabId",
	]);
	if (sender.tab?.id !== saved.syncTabId)
		throw new Error("Unexpected Kindle tab.");

	await updateSyncStatus({
		state: "syncing",
		message: "Saving your highlights to the app…",
	});
	const response = await fetch(`${saved.appUrl}/api/kindle/import`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${saved.token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
	const result = await response.json().catch(() => ({}));
	if (!response.ok)
		throw new Error(result.error || "The app rejected the sync.");

	await chrome.tabs.remove(sender.tab.id).catch(() => undefined);
	await chrome.storage.local.set({
		syncTabId: null,
		lastSync: Date.now(),
		lastError: "",
	});
	const status = await updateSyncStatus({
		state: "complete",
		bookCount: result.bookCount ?? 0,
		annotationCount: result.annotationCount ?? 0,
		message: "Kindle sync complete.",
	});
	return { ok: true, result, status };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		if (message?.type === "get-sync-status") {
			return { ok: true, status: await getSyncStatus() };
		}
		if (message?.type === "configure") {
			await chrome.storage.local.set({
				appUrl: new URL(message.appUrl).origin,
				token: message.token,
			});
			await chrome.alarms.create(alarmName, { periodInMinutes: 24 * 60 });
			return { ok: true, status: await startSync({ force: true }) };
		}
		if (message?.type === "sync-now") {
			return { ok: true, status: await startSync({ force: true }) };
		}
		if (message?.type === "kindle-progress") {
			const { syncTabId } = await chrome.storage.local.get("syncTabId");
			if (sender.tab?.id !== syncTabId)
				throw new Error("Unexpected Kindle tab.");
			return {
				ok: true,
				status: await updateSyncStatus({
					state: "syncing",
					message: message.message || "Reading your Kindle library…",
				}),
			};
		}
		if (message?.type === "kindle-import") {
			return await importKindlePayload(message.payload, sender);
		}
		if (message?.type === "kindle-error") {
			const { syncTabId } = await chrome.storage.local.get("syncTabId");
			if (sender.tab?.id !== syncTabId)
				throw new Error("Unexpected Kindle tab.");
			return await rejectSync(new Error(message.error), sender);
		}
		return null;
	})()
		.then(sendResponse)
		.catch((error) => rejectSync(error, sender).then(sendResponse));
	return true;
});

chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === alarmName) void startSync().catch(() => undefined);
});

chrome.tabs.onUpdated.addListener(async (id, change) => {
	const { syncTabId } = await chrome.storage.local.get("syncTabId");
	if (id !== syncTabId) return;
	if (isAmazonSignIn(change.url)) {
		void rejectSync(
			new Error(
				"Sign in to Amazon in Kindle Notebook. Sync will resume automatically.",
			),
			{ tab: { id } },
		);
		return;
	}
	if (change.status !== "complete") return;
	const tab = await chrome.tabs.get(id).catch(() => null);
	if (isAmazonSignIn(tab?.url)) {
		void rejectSync(
			new Error(
				"Sign in to Amazon in Kindle Notebook. Sync will resume automatically.",
			),
			{ tab: { id } },
		);
		return;
	}
	void chrome.tabs
		.sendMessage(id, { type: "scrape-kindle" })
		.catch(() => undefined);
});
