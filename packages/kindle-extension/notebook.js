const notebookUrl = "https://read.amazon.com/notebook";
const value = (element) => element instanceof HTMLInputElement ? element.value.trim() : element?.getAttribute("value")?.trim() || "";

async function fetchDocument(url) {
	const response = await fetch(url, { credentials: "include" });
	if (!response.ok || !response.url.startsWith(notebookUrl)) throw new Error("Sign into Amazon and try again.");
	return new DOMParser().parseFromString(await response.text(), "text/html");
}

function readAnnotations(document) {
	return Array.from(document.querySelectorAll("#kp-notebook-annotations > .a-row.a-spacing-base")).map((row) => ({
		location: value(row.querySelector("input[id^='kp-annotation-location']")),
		highlight: row.querySelector("#highlight")?.textContent?.trim() || "",
		note: row.querySelector("#note")?.textContent?.trim() || "",
	})).filter((annotation) => annotation.highlight || annotation.note);
}

async function scrape() {
	const books = Array.from(document.querySelectorAll(".kp-notebook-library-each-book")).map((card) => ({ asin: card.id, title: card.querySelector("h2.kp-notebook-searchable")?.textContent?.trim() || "", author: (card.querySelector("p.kp-notebook-searchable")?.textContent?.trim() || "").replace(/^By:\s*/, ""), lastAnnotatedAt: "" })).filter((book) => book.asin && book.title);
	for (const book of books) book.annotations = readAnnotations(await fetchDocument(`${notebookUrl}?asin=${encodeURIComponent(book.asin)}`));
	const result = await chrome.runtime.sendMessage({ type: "kindle-import", payload: { books, errors: [] } });
	if (!result?.ok) throw new Error(result?.error || "Import failed.");
}
chrome.runtime.onMessage.addListener((message) => { if (message?.type === "scrape-kindle") void scrape().catch((error) => chrome.runtime.sendMessage({ type: "kindle-error", error: error.message })); });
