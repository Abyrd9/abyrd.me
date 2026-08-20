import tailwind from "bun-plugin-tailwind";
import htmlInjector from "./src/plugins/html-injector";

const outdir = process.argv[2] ?? "./dist";

const build = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir,
	naming: {
		asset: "assets/[name]-[hash].[ext]",
		chunk: "assets/[name]-[hash].[ext]",
	},
	plugins: [tailwind, htmlInjector],
	target: "bun",
});

if (!build.success) {
	for (const log of build.logs) console.error(log);

	process.exitCode = 1;
}
