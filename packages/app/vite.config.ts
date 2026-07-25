import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	server: {
		allowedHosts: ["andrews-mac-mini-1.tail121ec5.ts.net"],
	},
	plugins: [
		nitro({
			plugins: ["./src/server/database/nitro-plugin.ts"],
			rollupConfig: { external: [/^@sentry\//] },
			serverDir: "./server",
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact(),
	],
});

export default config;
