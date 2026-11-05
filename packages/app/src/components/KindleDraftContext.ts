import { createContext } from "react";

export const KindleDraftContext = createContext<{
	current: Set<string>;
} | null>(null);
