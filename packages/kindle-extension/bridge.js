const extensionVersion = chrome.runtime.getManifest().version;

function updateSetupStatus() {
	const status = document.querySelector("#kindle-extension-status");
	if (status instanceof HTMLElement) {
		status.textContent = `Extension detected (v${extensionVersion}). Preparing connection…`;
	}
}

function connectSetupPage() {
	const button = document.querySelector("#connect-kindle-extension");
	const status = document.querySelector("#kindle-extension-status");

	if (
		!(button instanceof HTMLButtonElement) ||
		!(status instanceof HTMLElement)
	) {
		return false;
	}

	if (button.dataset.kindleExtensionReady === "true") return true;

	const token = button.dataset.syncToken;
	if (!token) return false;

	button.dataset.kindleExtensionReady = "true";
	button.removeAttribute("data-sync-token");
	button.disabled = false;
	button.textContent = "Connect Kindle extension";
	status.textContent = `Extension detected (v${extensionVersion}). Connect when you are ready.`;
	button.addEventListener("click", async () => {
		button.disabled = true;
		status.textContent = "Opening Kindle Notebook…";
		const result = await chrome.runtime.sendMessage({
			type: "configure",
			appUrl: location.origin,
			token,
		});
		status.textContent = result?.ok
			? "Sync started. Return to your library in a minute."
			: result?.error || "The extension could not start.";
		button.disabled = !result?.ok;
	});
	return true;
}

updateSetupStatus();

if (!connectSetupPage()) {
	const observer = new MutationObserver(() => {
		updateSetupStatus();
		if (connectSetupPage()) observer.disconnect();
	});
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
	});
}
