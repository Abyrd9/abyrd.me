const extensionVersion = chrome.runtime.getManifest().version;

function messageFor(status) {
	if (!status) return "Extension detected. Preparing connection…";
	if (status.state === "not-connected")
		return "Extension detected. Connect it to this app to begin.";
	if (status.state === "ready") return "Extension connected. Ready to sync.";
	if (status.state === "syncing")
		return status.message || "Reading your Kindle library…";
	if (status.state === "complete") {
		const books = status.bookCount ?? 0;
		const annotations = status.annotationCount ?? 0;
		return `Sync complete. Imported ${books} ${books === 1 ? "book" : "books"} and ${annotations} ${annotations === 1 ? "highlight" : "highlights"}.`;
	}
	if (status.state === "needs-amazon-sign-in")
		return "Sign in to Amazon in Kindle Notebook. Sync will resume automatically.";
	if (status.state === "needs-reconnect")
		return "The extension needs to reconnect to this app.";
	return status.message || "The extension could not sync. Try again.";
}

function setStatusText(selector, status) {
	const element = document.querySelector(selector);
	if (element instanceof HTMLElement) element.textContent = messageFor(status);
}

function setButton(button, status, defaultLabel) {
	button.dataset.kindleSyncState = status?.state || "";
	button.disabled = false;
	if (status?.state === "syncing") {
		button.disabled = true;
		button.textContent = "Syncing Kindle…";
		return;
	}
	if (status?.state === "needs-reconnect") {
		button.textContent = "Reconnect Kindle extension";
		return;
	}
	button.textContent = defaultLabel;
}

function renderSetupStatus(status) {
	setStatusText("#kindle-extension-status", status);
	const button = document.querySelector("#connect-kindle-extension");
	if (button instanceof HTMLButtonElement)
		setButton(button, status, "Connect Kindle extension");
}

function renderLibraryStatus(status) {
	setStatusText("#kindle-sync-status", status);
	const button = document.querySelector("#sync-kindle-now");
	if (!(button instanceof HTMLButtonElement)) return;
	setButton(button, status, "Sync now");
	const completedAt = String(status?.updatedAt);
	if (
		status?.state === "complete" &&
		sessionStorage.getItem("kindle-last-refreshed-sync") !== completedAt
	) {
		sessionStorage.setItem("kindle-last-refreshed-sync", completedAt);
		window.setTimeout(() => window.location.reload(), 800);
	}
}

function refreshStatus(render) {
	void chrome.runtime
		.sendMessage({ type: "get-sync-status" })
		.then((result) => render(result?.status))
		.catch(() => undefined);
}

function connectSetupPage() {
	const button = document.querySelector("#connect-kindle-extension");
	if (!(button instanceof HTMLButtonElement)) return false;
	if (button.dataset.kindleExtensionReady === "true") return true;

	const token = button.dataset.syncToken;
	if (!token) return false;

	button.dataset.kindleExtensionReady = "true";
	button.removeAttribute("data-sync-token");
	button.disabled = false;
	button.addEventListener("click", async () => {
		button.disabled = true;
		renderSetupStatus({ state: "syncing", message: "Connecting extension…" });
		const result = await chrome.runtime.sendMessage({
			type: "configure",
			appUrl: location.origin,
			token,
		});
		renderSetupStatus(
			result?.status ?? {
				state: "failed",
				message: result?.error || "The extension could not start.",
			},
		);
	});
	renderSetupStatus({
		state: "ready",
		message: `Extension detected (v${extensionVersion}). Checking connection…`,
	});
	refreshStatus(renderSetupStatus);
	return true;
}

function connectLibraryPage() {
	const button = document.querySelector("#sync-kindle-now");
	if (!(button instanceof HTMLButtonElement)) return false;
	if (button.dataset.kindleExtensionReady === "true") return true;

	button.dataset.kindleExtensionReady = "true";
	button.disabled = false;
	button.addEventListener("click", async () => {
		if (button.dataset.kindleSyncState === "needs-reconnect") {
			window.location.assign("/kindle/setup");
			return;
		}
		button.disabled = true;
		renderLibraryStatus({
			state: "syncing",
			message: "Opening Kindle Notebook…",
		});
		const result = await chrome.runtime.sendMessage({ type: "sync-now" });
		renderLibraryStatus(
			result?.status ?? {
				state: "failed",
				message: result?.error || "The extension could not start.",
			},
		);
	});
	refreshStatus(renderLibraryStatus);
	return true;
}

function connectWhenAvailable(connect) {
	if (connect()) return;
	const observer = new MutationObserver(() => {
		if (connect()) observer.disconnect();
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
}

chrome.runtime.onMessage.addListener((message) => {
	if (message?.type !== "kindle-sync-status") return;
	renderSetupStatus(message.status);
	renderLibraryStatus(message.status);
});

connectWhenAvailable(connectSetupPage);
connectWhenAvailable(connectLibraryPage);
