import { useCallback, useState } from "react";

const STORAGE_KEY = "aires-page-filters";

const readAll = () => {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
};

export const readPageFilter = (page, field, fallback) => {
	const pageState = readAll()[page];
	if (!pageState || !Object.prototype.hasOwnProperty.call(pageState, field)) {
		return fallback;
	}
	return pageState[field];
};

export const writePageFilter = (page, field, value) => {
	try {
		const all = readAll();
		all[page] = { ...(all[page] || {}), [field]: value };
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(all));
	} catch {
		// Private mode or a full storage quota should not block the screen.
	}
};

/**
 * Remembers one filter tab for a page during this browser session.
 * Each page has its own key, so changing a tab on Products does not
 * change the tab on Queens Prices.
 */
export const usePageFilter = (page, field, fallback) => {
	const [value, setValue] = useState(() => readPageFilter(page, field, fallback));

	const setPersisted = useCallback(
		(next) => {
			setValue((prev) => {
				const resolved = typeof next === "function" ? next(prev) : next;
				writePageFilter(page, field, resolved);
				return resolved;
			});
		},
		[page, field],
	);

	return [value, setPersisted];
};
