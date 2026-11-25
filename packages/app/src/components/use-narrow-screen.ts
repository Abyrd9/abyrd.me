import { useEffect, useState } from "react";

/** Whether the screen is phone-sized, following rotation and resizing. */
export const useNarrowScreen = () => {
	const [narrow, setNarrow] = useState(false);
	useEffect(() => {
		const query = window.matchMedia("(max-width: 639px)");
		const update = () => setNarrow(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);
	return narrow;
};
