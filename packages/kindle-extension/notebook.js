const notebookUrl = "https://read.amazon.com/notebook";

class AmazonSignInError extends Error {}

const value = (element) =>
	element instanceof HTMLInputElement
		? element.value.trim()
		: element?.getAttribute("value")?.trim() || "";

function needsAmazonSignIn(url = location.href) {
	return /signin|ap\/signin|ap\/cvf/i.test(url);
}

function waitForNotebook(timeout = 15_000) {
	if (needsAmazonSignIn()) return Promise.reject(new AmazonSignInError());
	if (document.querySelector(".kp-notebook-library-each-book"))
		return Promise.resolve();
	return new Promise((resolve, reject) => {
		const observer = new MutationObserver(() => {
			if (needsAmazonSignIn()) {
				observer.disconnect();
				reject(new AmazonSignInError());
				return;
			}
			if (!document.querySelector(".kp-notebook-library-each-book")) return;
			observer.disconnect();
			resolve();
		});
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
		window.setTimeout(() => {
			observer.disconnect();
			reject(new Error("Kindle Notebook did not load. Try Sync now again."));
		}, timeout);
	});
}

async function fetchDocument(url) {
	const response = await fetch(url, { credentials: "include" });
	if (!response.ok || needsAmazonSignIn(response.url)) {
		throw new AmazonSignInError();
	}
	return new DOMParser().parseFromString(await response.text(), "text/html");
}

function readAnnotations(document) {
	return Array.from(
		document.querySelectorAll(
			"#kp-notebook-annotations > .a-row.a-spacing-base",
		),
	)
		.map((row) => ({
			location: value(row.querySelector("input[id^='kp-annotation-location']")),
			highlight: row.querySelector("#highlight")?.textContent?.trim() || "",
			note: row.querySelector("#note")?.textContent?.trim() || "",
		}))
		.filter((annotation) => annotation.highlight || annotation.note);
}

async function scrape() {
	await waitForNotebook();
	await chrome.runtime.sendMessage({
		type: "kindle-progress",
		message: "Reading your Kindle library…",
	});
	const books = Array.from(
		document.querySelectorAll(".kp-notebook-library-each-book"),
	)
		.map((card) => ({
			asin: card.id,
			title:
				card.querySelector("h2.kp-notebook-searchable")?.textContent?.trim() ||
				"",
			author: (
				card.querySelector("p.kp-notebook-searchable")?.textContent?.trim() ||
				""
			).replace(/^By:\s*/, ""),
			lastAnnotatedAt: "",
		}))
		.filter((book) => book.asin && book.title);

	for (const [index, book] of books.entries()) {
		await chrome.runtime.sendMessage({
			type: "kindle-progress",
			message: `Reading book ${index + 1} of ${books.length}…`,
		});
		book.annotations = readAnnotations(
			await fetchDocument(
				`${notebookUrl}?asin=${encodeURIComponent(book.asin)}`,
			),
		);
	}

	await chrome.runtime.sendMessage({
		type: "kindle-progress",
		message: "Saving your highlights to the app…",
	});
	const result = await chrome.runtime.sendMessage({
		type: "kindle-import",
		payload: { books, errors: [] },
	});
	if (!result?.ok) throw new Error(result?.error || "Import failed.");
}

chrome.runtime.onMessage.addListener((message) => {
	if (message?.type !== "scrape-kindle") return;
	void scrape().catch((error) =>
		chrome.runtime.sendMessage({
			type: "kindle-error",
			error:
				error instanceof AmazonSignInError
					? "Sign in to Amazon in Kindle Notebook, then click Sync now."
					: error instanceof Error
						? error.message
						: "Kindle sync failed.",
		}),
	);
});
