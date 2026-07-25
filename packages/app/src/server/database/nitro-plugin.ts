import { Effect } from "effect";
import { definePlugin } from "nitro";
import { initializeDatabase } from "./service";

export default definePlugin(async () => {
	await Effect.runPromise(initializeDatabase.pipe(Effect.orDie));
});
