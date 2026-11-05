import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "sqlite",
	schema: "./src/server/database/schema.ts",
	out: "./drizzle",
	dbCredentials: { url: process.env.APP_DATABASE_PATH ?? "./data/app.sqlite" },
});
