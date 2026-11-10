// frontend/src/features/products/utils/parseItemMaster.js
import * as XLSX from "xlsx";
import { formatProductName } from "@/utils/formatters.js";

const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const normKey = (v) => norm(v).toLowerCase();

/**
 * Maps tab/sheet names or per-row tier values to the 4 strict tracking frequencies:
 *  - "Daily fresh Corner"             -> DAILY      (Items 1 to 20)
 *  - "Ultra Sensitive (100 Articles)" -> WEEKLY     (Items 1 to 100)
 *  - "Sensitive (500 Articles)"       -> MONTHLY    (Items 1 to 500)
 *  - "Non-Sensitive (Remaining)"      -> BI_YEARLY  (Items 1 to 2804+)
 */
const tierToFrequency = (text) => {
	const t = normKey(text);
	if (!t) return null;
	if (t.includes("fresh") || t.includes("daily")) return "DAILY";
	if (t.includes("non")) return "BI_YEARLY"; // check BEFORE "sensitive"
	if (t.includes("ultra")) return "WEEKLY";
	if (t.includes("sensitive")) return "MONTHLY";
	return null;
};

const FREQ_LABEL = {
	DAILY: "Daily Fresh",
	WEEKLY: "Ultra Sensitive",
	MONTHLY: "Sensitive",
	BI_YEARLY: "Non-Sensitive",
};

const FREQ_PREFIX = {
	DAILY: "FRESH",
	WEEKLY: "ULTRA",
	MONTHLY: "SENS",
	BI_YEARLY: "NONSENS",
};

const isCodeHeader = (k) =>
	k.startsWith("item code") || ["barcode", "sku", "code", "item id", "id"].includes(k);

const isNameHeader = (k) =>
	["article name", "product name", "item name", "name", "description"].includes(k);

const isCategoryHeader = (k) => ["category (family)", "category"].includes(k);

// Matches the newly added "SortedBy" column header
const isSortHeader = (k) =>
	[
		"sortedby",
		"sorted by",
		"sortby",
		"sort by",
		"sortorder",
		"sort order",
		"sequence",
		"no.",
		"no",
		"#",
	].includes(k);

const findHeaderRow = (ws) => {
	const rows = XLSX.utils.sheet_to_json(ws, {
		header: 1,
		defval: "",
		blankrows: true,
	});
	for (let i = 0; i < Math.min(rows.length, 25); i++) {
		const keys = rows[i].map(normKey);
		const codeKey = keys.find(isCodeHeader);
		const nameKey = keys.find(isNameHeader);
		if (codeKey && nameKey) {
			return {
				index: i,
				codeKey,
				nameKey,
				categoryKey: keys.find(isCategoryHeader),
				sortKey: keys.find(isSortHeader), // Captures "SortedBy" column in Column A
			};
		}
	}
	return null;
};

// Evaluates raw numbers and formula evaluation outputs cleanly
const num = (v) => {
	if (typeof v === "number") return Number.isFinite(v) ? v : 0;
	const s = String(v ?? "").replace(/,/g, "").trim();
	if (!s || s.startsWith("#")) return 0;
	const n = parseFloat(s);
	return Number.isFinite(n) ? n : 0;
};

const firstPositive = (row, keys) => {
	for (const k of keys) {
		const n = num(row[k]);
		if (n > 0) return n;
	}
	return 0;
};

const PRICE_KEYS = [
	"queens price",
	"queens benchmark price",
	"our current price",
	"benchmark price",
	"price",
];

export const parseItemMasterWorkbook = (buffer, options = {}) => {
	const { scopeIdsBySheet = false } = options;
	const wb = XLSX.read(buffer, { type: "array" });

	const seenInFile = new Map();
	const items = [];
	const sheets = [];
	const frequencyCounts = { DAILY: 0, WEEKLY: 0, MONTHLY: 0, BI_YEARLY: 0 };

	const renamedDuplicates = [];
	const crossSheetDuplicates = [];

	let invalid = 0;
	let unknownTier = 0;
	let pricedItems = 0;

	// Ingestion order of priority
	const PRIORITY = { DAILY: 0, WEEKLY: 1, MONTHLY: 2, BI_YEARLY: 3 };
	const orderedSheetNames = [...wb.SheetNames].sort(
		(a, b) =>
			(PRIORITY[tierToFrequency(a)] ?? 9) - (PRIORITY[tierToFrequency(b)] ?? 9),
	);

	for (const sheetName of orderedSheetNames) {
		const ws = wb.Sheets[sheetName];
		const header = findHeaderRow(ws);
		const sheetFrequency = tierToFrequency(sheetName);
		if (!header) {
			if (sheetFrequency) {
				throw new Error(
					`Sheet "${sheetName}" looks like a tier sheet but has no item-code and product-name header row. Nothing was imported.`,
				);
			}
			continue;
		}

		const rawRows = XLSX.utils.sheet_to_json(ws, {
			defval: "",
			range: header.index,
		});

		const rows = rawRows.map((r) =>
			Object.fromEntries(Object.entries(r).map(([k, v]) => [normKey(k), v])),
		);

		const sheetInfo = { name: sheetName, frequency: sheetFrequency, rows: 0 };
		let fallbackTrackSequence = 0;

		for (const row of rows) {
			const rawId = norm(row[header.codeKey]);
			const rawName = norm(row[header.nameKey]);
			if (!rawId && !rawName) continue;
			if (!rawId || !rawName) {
				invalid++;
				continue;
			}

			const frequency =
				tierToFrequency(row["final tier"] || row["tier"]) || sheetFrequency;
			if (!frequency) {
				unknownTier++;
				continue;
			}

			fallbackTrackSequence += 1;

			// Priority: Read explicit "SortedBy" column if present; otherwise use sheet row counter
			const explicitSortOrder = header.sortKey ? num(row[header.sortKey]) : 0;
			const sortOrder = explicitSortOrder > 0 ? explicitSortOrder : fallbackTrackSequence;

			const prefix = scopeIdsBySheet ? `${FREQ_PREFIX[frequency] || frequency}-` : "";
			const baseId = `${prefix}${rawId}`;

			let id = baseId;
			if (seenInFile.get(id) === sheetName) {
				let n = 2;
				let candidate = `${baseId}_${n}`;
				while (seenInFile.has(candidate)) {
					n++;
					candidate = `${baseId}_${n}`;
				}
				id = candidate;
				renamedDuplicates.push({
					originalId: rawId,
					newId: id,
					name: rawName,
					sheet: sheetName,
				});
			} else if (seenInFile.has(id)) {
				const owner = seenInFile.get(id);
				const entry = crossSheetDuplicates.find((c) => c.id === id);
				if (entry) {
					if (!entry.sheets.includes(sheetName)) entry.sheets.push(sheetName);
					entry.names.push(rawName);
				} else {
					crossSheetDuplicates.push({
						id,
						name: rawName,
						names: [rawName],
						sheets: [owner, sheetName],
					});
				}
			}

			seenInFile.set(id, sheetName);

			const explicitPrice = firstPositive(row, PRICE_KEYS);
			const qty = num(row["qty sold (1yr)"]);
			const value = num(row["value sold birr (1yr)"]);
			const derivedPrice = qty > 0 ? Math.round((value / qty) * 100) / 100 : 0;
			const price = explicitPrice || derivedPrice;
			if (price > 0) pricedItems++;

			// Format into standardized Title Case
			const titleCasedName = formatProductName(rawName);

			items.push({
				id,
				name: titleCasedName,
				rawName,
				barcode: id,
				sku: id,
				category: norm(row[header.categoryKey]) || "General",
				frequency,
				unit: norm(row["unit"]) || "pcs",
				initialQueensPrice: price,
				// Persist authoritative SortedBy sequence
				sortOrder,
				priceSource: explicitPrice
					? "Item Master Import (price column)"
					: "Item Master Import (avg sales price = value / qty, 1yr)",
			});
			frequencyCounts[frequency]++;
			sheetInfo.rows++;
		}

		sheets.push(sheetInfo);
	}

	if (!sheets.length) {
		throw new Error(
			"No sheet with 'Item Code' and 'Article Name' columns was found.",
		);
	}

	if (unknownTier > 0) {
		const unnamed = sheets
			.filter((s) => !s.frequency)
			.map((s) => `"${s.name}"`)
			.join(", ");
		throw new Error(
			`${unknownTier} rows have no tier. Check sheet names or add a "Final Tier" column.`,
		);
	}

	return {
		sheetNames: sheets.map((s) => s.name),
		sheets: sheets.map((s) => ({
			...s,
			tier: s.frequency ? FREQ_LABEL[s.frequency] : "per-row Final Tier",
		})),
		items,
		invalid,
		duplicateInFile: crossSheetDuplicates.length,
		conflicts: crossSheetDuplicates.flatMap((c) =>
			c.sheets.slice(1).map((s) => ({
				id: c.id,
				name: c.names[c.sheets.indexOf(s) - 1] ?? c.name,
				keptIn: c.sheets[0],
				droppedFrom: s,
			})),
		),
		frequencyCounts,
		pricedItems,
		renamedDuplicates,
		crossSheetDuplicates,
	};
};