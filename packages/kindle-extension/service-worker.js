const notebookUrl = "https://read.amazon.com/notebook";
const alarmName = "daily-kindle-sync";

async function startSync() {
	const saved = await chrome.storage.local.get(["appUrl", "token", "syncTabId"]);
	if (!saved.appUrl || !saved.token) throw new Error("Open Kindle setup to connect the extension.");
	if (saved.syncTabId && await chrome.tabs.get(saved.syncTabId).catch(() => null)) return;
	const tab = await chrome.tabs.create({ url: notebookUrl, active: false });
	await chrome.storage.local.set({ syncTabId: tab.id, lastError: "" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	(async () => {
		if (message?.type === "configure") {
			await chrome.storage.local.set({ appUrl: new URL(message.appUrl).origin, token: message.token });
			await chrome.alarms.create(alarmName, { periodInMinutes: 24 * 60 });
			await startSync();
			return { ok: true };
		}
		if (message?.type === "kindle-import") {
			const saved = await chrome.storage.local.get(["appUrl", "token", "syncTabId"]);
			if (sender.tab?.id !== saved.syncTabId) throw new Error("Unexpected Kindle tab.");
			const response = await fetch(`${saved.appUrl}/api/kindle/import`, { method: "POST", headers: { Authorization: `Bearer ${saved.token}`, "Content-Type": "application/json" }, body: JSON.stringify(message.payload) });
			const result = await response.json();
			if (!response.ok) throw new Error(result.error || "The app rejected the sync.");
			await chrome.tabs.remove(sender.tab.id).catch(() => {});
			await chrome.storage.local.set({ syncTabId: null, lastSync: Date.now(), lastError: "" });
			return { ok: true };
		}
		return null;
	})().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : "Extension error." }));
	return true;
});
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === alarmName) void startSync().catch(() => {}); });
chrome.tabs.onUpdated.addListener(async (id, change) => { if (change.status !== "complete") return; const { syncTabId } = await chrome.storage.local.get("syncTabId"); if (id === syncTabId) void chrome.tabs.sendMessage(id, { type: "scrape-kindle" }); });
