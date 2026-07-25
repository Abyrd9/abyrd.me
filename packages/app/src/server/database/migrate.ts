import { Effect } from "effect";
import { initializeDatabase } from "./service";

await Effect.runPromise(initializeDatabase.pipe(Effect.orDie));
