// frontend/src/features/products/utils/parseItemMaster.js
import * as XLSX from "xlsx";

const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const normKey = (v) => norm(v).toLowerCase();

/**
 * SUPPORTED LAYOUTS
 *  A) "New Scaled Products" layout - one sheet per tier, tier comes from the SHEET NAME:
 *       "Daily Fresh 20"                  -> DAILY      (any sheet name containing "fresh" or "daily")
 *       "Ultra Sensitive (100 Articles)"  -> WEEKLY
 *       "Sensitive (500 Articles)"        -> MONTHLY
 *       "Non-Sensitive (Remaining)"       -> BI_YEARLY
 *     Title/banner rows above the header are fine; the header row is auto-detected.
 *  B) Legacy single "Item Master" sheet with a "Final Tier" column (tier read per row).
 *
 * Sheets with no "Item Code" + "Article Name" header (e.g. "Read Me",
 * "Duplicate Names Merged") are ignored automatically.
 *
 * DUPLICATE ITEM CODES:
 *   • SAME sheet, same code, different products   -> later rows get a unique suffix ("20_2", "20_3")
 *                                                     and are ALL imported. See `renamedDuplicates`.
 *   • DIFFERENT sheets, same code                 -> by default BOTH are imported (no data loss),
 *                                                     tracked in `crossSheetDuplicates`. Set
 *                                                     options.scopeIdsBySheet = true to prefix ids
 *                                                     with the sheet key ("FRESH-20", "WEEKLY-20")
 *                                                     so the database sees fully unique ids.
 *
 * NOTE: nothing is ever dropped because of a duplicate code. The only rows that are
 * skipped are rows that are genuinely invalid (missing code OR missing name), or rows
 * whose tier cannot be determined (those throw, since silently importing them would be
 * worse).
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

// Short prefix used when options.scopeIdsBySheet = true.
const FREQ_PREFIX = {
	DAILY: "FRESH",
	WEEKLY: "ULTRA",
	MONTHLY: "SENS",
	BI_YEARLY: "NONSENS",
};

// Header names differ between sheets ("Item Code" vs "Item Code (SKU / Barcode)",
// "Article Name" vs "Product Name"), so columns are matched by alias, not exact text.
const isCodeHeader = (k) =>
	k.startsWith("item code") || ["barcode", "sku", "code", "item id", "id"].includes(k);
const isNameHeader = (k) =>
	["article name", "product name", "item name", "name", "description"].includes(k);
const isCategoryHeader = (k) => ["category (family)", "category"].includes(k);

const findHeaderRow = (ws) => {
	const rows = XLSX.utils.sheet_to_json(ws, {
		header: 1,
		defval: "",
		blankrows: true, // keep blank rows so index i == the `range` offset used below
	});
	for (let i = 0; i < Math.min(rows.length, 20); i++) {
		const keys = rows[i].map(normKey);
		const codeKey = keys.find(isCodeHeader);
		const nameKey = keys.find(isNameHeader);
		if (codeKey && nameKey) {
			return { index: i, codeKey, nameKey, categoryKey: keys.find(isCategoryHeader) };
		}
	}
	return null;
};

// Numbers only. Excel error cells (#REF!, #N/A ...) and text become 0.
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

/**
 * @param {ArrayBuffer|Uint8Array} buffer  xlsx file contents
 * @param {Object} [options]
 * @param {boolean} [options.scopeIdsBySheet=false]
 *   When true, every item id is prefixed with its tier ("FRESH-20", "ULTRA-20", ...).
 *   Use this if the source sheets reuse the same codes across tiers and you want
 *   fully collision-free ids in the database.
 */
export const parseItemMasterWorkbook = (buffer, options = {}) => {
	const { scopeIdsBySheet = false } = options;
	const wb = XLSX.read(buffer, { type: "array" });

	const seenInFile = new Map();      // finalId -> sheet name that claimed it
	const items = [];
	const sheets = [];
	const frequencyCounts = { DAILY: 0, WEEKLY: 0, MONTHLY: 0, BI_YEARLY: 0 };

	// Reused same-sheet codes that were made unique (all rows kept).
	// Shape: { originalId, newId, name, sheet }
	const renamedDuplicates = [];

	// Same code appearing on multiple sheets. With scopeIdsBySheet=false these are
	// imported under the same id (which WILL collide downstream); with
	// scopeIdsBySheet=true they are naturally distinct ("FRESH-20" vs "ULTRA-20").
	// Shape: { id, name, sheets: [string] }
	const crossSheetDuplicates = [];

	let invalid = 0;
	let unknownTier = 0;
	let pricedItems = 0;

	// The fresh (DAILY) sheet is explicit and most specific, so it is processed first
	// (stable ordering only - no longer causes data loss).
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
					`Sheet "${sheetName}" looks like a tier sheet but has no item-code and product-name header row ` +
					`(accepted: "Item Code" / "Item Code (SKU / Barcode)" / Barcode / SKU and "Article Name" / "Product Name"). Nothing was imported.`,
				);
			}
			continue; // Read Me, Duplicate Names Merged, Dashboard, ...
		}

		const rawRows = XLSX.utils.sheet_to_json(ws, {
			defval: "",
			range: header.index,
		});
		// normalise header names (headers contain line breaks, e.g. "Our Current\nPrice")
		const rows = rawRows.map((r) =>
			Object.fromEntries(Object.entries(r).map(([k, v]) => [normKey(k), v])),
		);

		const sheetInfo = { name: sheetName, frequency: sheetFrequency, rows: 0 };

		for (const row of rows) {
			const rawId = norm(row[header.codeKey]);
			const name = norm(row[header.nameKey]);
			if (!rawId && !name) continue; // fully blank spacer row
			if (!rawId || !name) {
				invalid++;
				continue;
			}

			// Per-row "Final Tier" (legacy layout) wins; otherwise the sheet name decides.
			const frequency =
				tierToFrequency(row["final tier"] || row["tier"]) || sheetFrequency;
			if (!frequency) {
				unknownTier++;
				continue;
			}

			// Optional per-sheet prefix to avoid cross-tier collisions outright.
			const prefix = scopeIdsBySheet ? `${FREQ_PREFIX[frequency] || frequency}-` : "";
			const baseId = `${prefix}${rawId}`;

			// ---- Duplicate handling (per sheet, nothing dropped for duplicates) ----
			let id = baseId;
			if (seenInFile.get(id) === sheetName) {
				// Reused same-sheet code -> keep first as-is, suffix the rest.
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
					name,
					sheet: sheetName,
				});
				console.warn(
					`[parseItemMaster] Item Code "${rawId}" reused on "${sheetName}" — imported "${name}" as "${id}" (nothing dropped).`,
				);
			} else if (seenInFile.has(id)) {
				// Same code claimed by an earlier sheet. We still import this row —
				// only record the collision so the caller knows to scope ids if needed.
				const owner = seenInFile.get(id);
				const entry = crossSheetDuplicates.find((c) => c.id === id);
				if (entry) {
					if (!entry.sheets.includes(sheetName)) entry.sheets.push(sheetName);
					entry.names.push(name);
				} else {
					crossSheetDuplicates.push({
						id,
						name,
						names: [name],
						sheets: [owner, sheetName],
					});
				}
				// fall through — we still push the row, using the SAME id
			}
			// -----------------------------------------------------------------------

			seenInFile.set(id, sheetName);

			// Price: explicit price column if filled in, else average realised price
			// (Value Sold / Qty Sold) when those columns hold real numbers. Otherwise 0
			// and the backend creates NO price row (it never stores a 0 benchmark).
			const explicitPrice = firstPositive(row, PRICE_KEYS);
			const qty = num(row["qty sold (1yr)"]);
			const value = num(row["value sold birr (1yr)"]);
			const derivedPrice = qty > 0 ? Math.round((value / qty) * 100) / 100 : 0;
			const price = explicitPrice || derivedPrice;
			if (price > 0) pricedItems++;

			items.push({
				id,
				name,
				barcode: id,
				sku: id,
				category: norm(row[header.categoryKey]) || "General",
				frequency,
				unit: norm(row["unit"]) || "pcs",
				initialQueensPrice: price,
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

	// Never fall back silently: a sheet we cannot classify would otherwise be imported
	// with the wrong survey frequency.
	if (unknownTier > 0) {
		const unnamed = sheets
			.filter((s) => !s.frequency)
			.map((s) => `"${s.name}"`)
			.join(", ");
		throw new Error(
			`${unknownTier} rows have no tier. Name the sheet Ultra Sensitive / Sensitive / ` +
			`Non-Sensitive${unnamed ? ` (unrecognised: ${unnamed})` : ""} or add a "Final Tier" column. ` +
			`Nothing was imported.`,
		);
	}

	// ---- Diagnostics so nothing is silent --------------------------------
	if (renamedDuplicates.length) {
		console.warn(
			`[parseItemMaster] ${renamedDuplicates.length} reused same-sheet code(s) renamed (rows kept):`,
		);
		for (const r of renamedDuplicates) {
			console.warn(`  - "${r.originalId}" on "${r.sheet}" -> "${r.newId}" (${r.name})`);
		}
	}
	if (crossSheetDuplicates.length) {
		console.warn(
			`[parseItemMaster] ${crossSheetDuplicates.length} code(s) appear on multiple sheets ` +
			`(all imported${scopeIdsBySheet ? ", ids prefixed per sheet" : ", ids collide - set scopeIdsBySheet=true to disambiguate"}):`,
		);
		for (const c of crossSheetDuplicates) {
			console.warn(
				`  - "${c.id}" on [${c.sheets.join(", ")}] for products: ${c.names.join(", ")}`,
			);
		}
	}
	console.info(
		`[parseItemMaster] Imported per frequency:`,
		frequencyCounts,
		`| total items: ${items.length} | invalid rows skipped: ${invalid}`,
	);
	// ----------------------------------------------------------------------

	return {
		sheetNames: sheets.map((s) => s.name),
		sheets: sheets.map((s) => ({
			...s,
			tier: s.frequency ? FREQ_LABEL[s.frequency] : "per-row Final Tier",
		})),
		items,
		invalid,
		// Kept for backwards-compatibility: previously `duplicateInFile` / `conflicts`
		// counted rows that were DROPPED for cross-sheet collisions. Now nothing is
		// dropped, so these describe code reuse instead.
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
		// Same-sheet reused codes that were made unique (all rows kept).
		renamedDuplicates,
		// Same code on multiple sheets (all rows kept; ids identical unless scoped).
		crossSheetDuplicates,
	};
};