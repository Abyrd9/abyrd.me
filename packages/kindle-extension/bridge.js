const button = document.querySelector("#connect-kindle-extension");
const status = document.querySelector("#kindle-extension-status");

if (button instanceof HTMLButtonElement && status instanceof HTMLElement) {
	const token = button.dataset.syncToken;
	button.removeAttribute("data-sync-token");
	button.disabled = false;
	button.addEventListener("click", async () => {
		button.disabled = true;
		status.textContent = "Opening Kindle Notebook…";
		const result = await chrome.runtime.sendMessage({ type: "configure", appUrl: location.origin, token });
		status.textContent = result?.ok ? "Sync started. Return to your library in a minute." : result?.error || "The extension could not start.";
		button.disabled = !result?.ok;
	});
}
