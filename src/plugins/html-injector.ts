import type { BunPlugin } from "bun";
import "../shared/footer.html?raw";
import "../shared/nav-bar.html?raw";

/**
 * Plugin that injects shared nav/footer into HTML files at bundle time
 */
const playgroundPlugin: BunPlugin = {
	name: "html-injector",

	setup(build) {
		console.log("\n🔌 [PLUGIN] HTML Injector loaded");

		// ─────────────────────────────────────────────────────────
		// onLoad - Inject nav/footer into HTML files
		// ─────────────────────────────────────────────────────────
		build.onLoad({ filter: /\.(html)$/ }, async (args) => {
			// Skip the shared fragments themselves
			if (args.path.includes("/shared/")) {
				return;
			}

			console.log("📦 [onLoad] Processing HTML:", args.path);

			// Calculate relative path prefix based on file depth
			// e.g., src/index.html → "./"
			// e.g., src/posts/hello.html → "../"
			const srcMarker = "/src/";
			const srcIndex = args.path.indexOf(srcMarker);
			const relativePath = args.path.slice(srcIndex + srcMarker.length);
			const depth = (relativePath.match(/\//g) || []).length;
			const prefix = depth === 0 ? "./" : "../".repeat(depth);

			console.log(
				`   → File: ${relativePath}, depth: ${depth}, prefix: "${prefix}"`,
			);

			// Read the original HTML
			const contents = await Bun.file(args.path).text();
			const [navHtml, footerHtml] = await Promise.all([
				Bun.file(`${import.meta.dir}/../shared/nav-bar.html`).text(),
				Bun.file(`${import.meta.dir}/../shared/footer.html`).text(),
			]);

			// Get the shared fragments and adjust paths
			let nav = navHtml;
			nav = nav.replace(/\.\/assets\//g, `${prefix}assets/`);

			const footer = footerHtml.replace(
				'id="copyright-year"></div>',
				`id="copyright-year">© ${new Date().getFullYear()}</div>`,
			);

			// INJECT! Replace placeholders with actual HTML
			const modified = contents
				.replace('<div id="nav-bar"></div>', `<div id="nav-bar">${nav}</div>`)
				.replace('<div id="footer"></div>', `<div id="footer">${footer}</div>`);

			console.log("   ✅ Injected nav + footer");

			return {
				contents: modified,
				loader: "html",
			};
		});
	},
};

// Export as default for bunfig.toml
export default playgroundPlugin;
