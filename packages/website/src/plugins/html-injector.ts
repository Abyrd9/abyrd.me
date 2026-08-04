import type { BunPlugin } from "bun";
import "../shared/footer.html?raw";
import "../shared/nav-bar.html?raw";

/**
 * Plugin that injects shared nav/footer into HTML files at bundle time
 */
const htmlInjectorPlugin: BunPlugin = {
	name: "html-injector",

	setup(build) {
		build.onLoad({ filter: /\.(html)$/ }, async (args) => {
			if (args.path.includes("/shared/")) return;

			const srcMarker = "/src/";
			const srcIndex = args.path.indexOf(srcMarker);
			const relativePath = args.path.slice(srcIndex + srcMarker.length);
			const depth = (relativePath.match(/\//g) || []).length;
			const prefix = depth === 0 ? "./" : "../".repeat(depth);

			const contents = await Bun.file(args.path).text();
			const [navHtml, footerHtml] = await Promise.all([
				Bun.file(`${import.meta.dir}/../shared/nav-bar.html`).text(),
				Bun.file(`${import.meta.dir}/../shared/footer.html`).text(),
			]);

			let nav = navHtml;
			nav = nav.replace(/\.\/assets\//g, `${prefix}assets/`);

			const footer = footerHtml.replace(
				'id="copyright-year"></div>',
				`id="copyright-year">© ${new Date().getFullYear()}</div>`,
			);

			const modified = contents
				.replace('<div id="nav-bar"></div>', `<div id="nav-bar">${nav}</div>`)
				.replace('<div id="footer"></div>', `<div id="footer">${footer}</div>`);

			return {
				contents: modified,
				loader: "html",
			};
		});
	},
};

export default htmlInjectorPlugin;
