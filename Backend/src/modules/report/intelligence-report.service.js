import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { groq, getActiveGroqModel } from "../../config/groq.js";
import { GROQ_API_KEY } from "../../config/env.js";
import { formatProductName } from "./report.utils.js";
import { buildIntelligencePdf } from "./intelligence-report.pdf.js";
import { buildIntelligenceDocx } from "./intelligence-report.docx.js";

const money = (value) => {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
	return Math.round(Number(value) * 100) / 100;
};

const formatMoney = (value) => {
	const n = money(value);
	if (n === null) return "—";
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const priceCell = (observation) => {
	if (!observation) return "—";
	if (observation.availability === "OUT_OF_STOCK") return "Out of Stock";
	if (observation.availability === "NOT_FOUND") return "N/F";
	const erer = money(observation.ererPrice);
	const valencia = money(observation.valenciaPrice);
	const plain = (value) => (Number.isInteger(value) ? String(value) : String(value));
	if (erer !== null && valencia !== null) return `${plain(erer)}Erer/ ${plain(valencia)}Valencia`;
	if (erer !== null) return `${plain(erer)}Erer`;
	if (valencia !== null) return `${plain(valencia)}Valencia`;
	const price = money(observation.price);
	if (price === null) return "N/A";
	return formatMoney(price);
};

const noteFor = (observation) => {
	if (!observation) return "";
	const parts = [];
	if (observation.substituteProduct) parts.push(`Sub: ${observation.substituteProduct}`);
	if (observation.notes) parts.push(observation.notes);
	if (observation.availability === "OUT_OF_STOCK") parts.push("Out of stock");
	if (observation.availability === "NOT_FOUND" && !observation.substituteProduct) {
		parts.push("Not found");
	}
	return parts.join("; ");
};

const numericPrice = (observation) => {
	if (!observation || observation.availability !== "AVAILABLE") return null;
	const values = [observation.price, observation.ererPrice, observation.valenciaPrice]
		.map(money)
		.filter((value) => value !== null && value > 0);
	if (!values.length) return null;
	return Math.min(...values);
};

const inAddis = (date, options) =>
	new Date(date).toLocaleDateString("en-GB", { timeZone: "Africa/Addis_Ababa", ...options });

const formatAuditDate = (date) =>
	inAddis(date, { day: "numeric", month: "long", year: "numeric" });

const formatAuditDateShort = (date) =>
	inAddis(date, { day: "2-digit", month: "2-digit", year: "numeric" });

const formatAuditDateCompact = (date) =>
	new Date(date).toLocaleDateString("en-US", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Addis_Ababa",
	});

const draftCards = async (facts) => {
	const fallback = {
		benchmark: `${facts.withBenchmark} / ${facts.skuCount} SKUs have a Queens benchmark price.`,
		street: facts.gapLabel,
		stock: facts.gapCount
			? `${facts.gapCount} availability gap${facts.gapCount === 1 ? "" : "s"} across the audited stores.`
			: "No stock-out or not-found gaps in the captured prices.",
		verification: `${facts.observationCount} price captures from ${facts.auditorCount} field auditor${facts.auditorCount === 1 ? "" : "s"}.`,
	};

	if (!GROQ_API_KEY) return fallback;

	try {
		const model = await getActiveGroqModel("fast");
		const completion = await groq.chat.completions.create({
			model,
			temperature: 0.2,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						"You write four short retail-audit headlines for a Queens Supermarket competitor dashboard. Return JSON with keys benchmark, street, stock, verification. Each value is one sentence, under 28 words, using the numbers given. Do not invent stores, prices, or people.",
				},
				{ role: "user", content: JSON.stringify(facts) },
			],
		});
		const parsed = JSON.parse(completion.choices[0].message.content || "{}");
		return {
			benchmark: parsed.benchmark || fallback.benchmark,
			street: parsed.street || fallback.street,
			stock: parsed.stock || fallback.stock,
			verification: parsed.verification || fallback.verification,
		};
	} catch (error) {
		console.error("[Groq AI] Intelligence report cards failed:", error.message);
		return fallback;
	}
};

const cleanNotes = (notes = {}) => ({
	advisory: String(notes.advisory || "").trim(),
	observations: String(notes.observations || "").trim(),
	purchases: String(notes.purchases || "").trim(),
	evidence: Array.isArray(notes.evidence)
		? notes.evidence
				.map((row) => ({
					location: String(row?.location || "").trim(),
					gps: String(row?.gps || "").trim(),
					audio: String(row?.audio || "").trim(),
					proof: String(row?.proof || "").trim(),
				}))
				.filter((row) => row.location || row.gps || row.audio || row.proof)
		: [],
});

export const buildIntelligenceReport = async ({ surveyPeriodId, notes, includeCards = true }) => {
	if (!surveyPeriodId) {
		throw new ApiError(400, "Choose a survey period before generating the report.");
	}

	const period = await prisma.surveyPeriod.findUnique({
		where: { id: surveyPeriodId },
		include: {
			audits: {
				include: {
					store: { include: { competitor: true } },
					auditor: { select: { name: true } },
					observations: {
						include: {
							product: {
								select: {
									id: true,
									name: true,
									category: true,
									unit: true,
									frequency: true,
									sortOrder: true,
								},
							},
						},
					},
				},
			},
		},
	});

	if (!period) throw new ApiError(404, "Survey period not found.");

	const stores = [];
	const storeSeen = new Set();
	const auditors = new Set();
	const latest = new Map();
	const products = new Map();

	for (const audit of period.audits) {
		if (audit.auditor?.name) auditors.add(audit.auditor.name);
		if (audit.store && !storeSeen.has(audit.store.id)) {
			storeSeen.add(audit.store.id);
			stores.push({
				id: audit.store.id,
				name: audit.store.name,
				competitor: audit.store.competitor?.name || "",
			});
		}
		for (const observation of audit.observations) {
			if (!observation.product) continue;
			products.set(observation.product.id, observation.product);
			const key = `${observation.productId}|${audit.storeId}`;
			const prev = latest.get(key);
			if (!prev || new Date(observation.capturedAt) > new Date(prev.capturedAt)) {
				latest.set(key, observation);
			}
		}
	}

	if (products.size === 0) {
		throw new ApiError(
			400,
			"This survey period has no price captures yet. Complete a visit before generating the report.",
		);
	}

	const productIds = [...products.keys()];
	const benchmarks = await prisma.queensPrice.findMany({
		where: { productId: { in: productIds } },
		orderBy: { effectiveFrom: "desc" },
	});
	const benchmarkByProduct = new Map();
	for (const row of benchmarks) {
		if (!benchmarkByProduct.has(row.productId)) benchmarkByProduct.set(row.productId, row);
	}

	const rows = [...products.values()]
		.sort((a, b) => {
			const seq = (a.sortOrder > 0 ? a.sortOrder : 999999) - (b.sortOrder > 0 ? b.sortOrder : 999999);
			if (seq !== 0) return seq;
			return String(a.category || "").localeCompare(String(b.category || ""))
				|| String(a.name).localeCompare(String(b.name));
		})
		.map((product, index) => {
			const queens = money(benchmarkByProduct.get(product.id)?.price);
			const cells = stores.map((store) => {
				const observation = latest.get(`${product.id}|${store.id}`) || null;
				return {
					storeId: store.id,
					label: priceCell(observation),
					price: numericPrice(observation),
					note: noteFor(observation),
				};
			});
			const candidates = [
				...(queens !== null ? [{ name: "Queens", price: queens }] : []),
				...cells
					.filter((cell) => cell.price !== null)
					.map((cell) => ({
						name: stores.find((store) => store.id === cell.storeId)?.name || "Market",
						price: cell.price,
					})),
			];
			const lowest = candidates.reduce(
				(best, item) => (best === null || item.price < best.price ? item : best),
				null,
			);
			const gap =
				lowest && queens
					? Math.round(((lowest.price - queens) / queens) * 1000) / 10
					: null;
			return {
				no: index + 1,
				name: formatProductName(product.name),
				category: product.category || "General",
				unit: product.unit || "pcs",
				queens: queens === null ? "—" : formatMoney(queens),
				queensValue: queens,
				cells,
				stock: cells.map((cell) => cell.note).filter(Boolean).join(" | ") || "—",
				lowest: lowest ? `${formatMoney(lowest.price)} (${lowest.name})` : "—",
				gap: gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap.toFixed(1)}%`,
				gapValue: gap,
			};
		});

	const gaps = rows.map((row) => row.gapValue).filter((value) => typeof value === "number");
	const negative = gaps.filter((value) => value < 0);
	const gapCount = rows.filter((row) =>
		row.cells.some((cell) => cell.label === "Out of Stock" || cell.label === "N/F"),
	).length;
	const withBenchmark = rows.filter((row) => row.queensValue !== null).length;
	const gapRange = negative.length
		? `${Math.max(...negative).toFixed(1)}% to ${Math.min(...negative).toFixed(1)}%`
		: "—";
	const gapLabel = negative.length
		? `Street prices run ${gapRange} versus the Queens benchmark.`
		: "No competitor price is below the Queens benchmark in this period.";

	const cards = includeCards
		? await draftCards({
			period: period.name,
			skuCount: rows.length,
			withBenchmark,
			storeNames: stores.map((store) => store.name),
			gapLabel,
			gapCount,
			observationCount: [...latest.values()].length,
			auditorCount: auditors.size,
			auditors: [...auditors],
		})
		: {
			benchmark: `${withBenchmark} / ${rows.length} SKUs have a Queens benchmark price.`,
			street: gapLabel,
			stock: gapCount
				? `${gapCount} availability gap${gapCount === 1 ? "" : "s"} across the audited stores.`
				: "No stock-out or not-found gaps in the captured prices.",
			verification: `${[...latest.values()].length} price captures.`,
		};

	const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))];
	return {
		title: "COMPETITOR PRICE INTELLIGENCE & BENCHMARK DASHBOARD",
		subtitle: `Carrefour Ethiopia / Queens Supermarket Benchmark vs. ${stores.map((store) => store.name).join(", ") || "competitor stores"} | ${period.name}`,
		periodName: period.name,
		auditDate: formatAuditDate(period.startDate),
		auditDateShort: formatAuditDateShort(period.startDate),
		auditDateCompact: formatAuditDateCompact(period.startDate),
		platform: "Aires Business Intelligence Platform (#Arise BI)",
		scope: `${rows.length} Core SKUs (${categories.slice(0, 6).join(", ") || "Fresh"})`,
		stores,
		auditors: [...auditors],
		rows,
		cards: [
			{ label: "QUEENS / CARREFOUR BENCHMARK", value: `${withBenchmark} / ${rows.length} SKUs`, text: cards.benchmark },
			{ label: "STREET MARKET ADVANTAGE", value: gapRange, text: cards.street },
			{ label: "STOCK-OUT & BRAND ALERTS", value: `${gapCount} Key Gap${gapCount === 1 ? "" : "s"}`, text: cards.stock },
			{ label: "FIELD VERIFICATION PROOF", value: "100% Audited", text: cards.verification },
		],
		notes: cleanNotes(notes),
	};
};

export const generateIntelligenceReportFile = async ({ surveyPeriodId, notes, format }) => {
	const model = await buildIntelligenceReport({ surveyPeriodId, notes });
	const slug = String(model.periodName || "survey")
		.replace(/[^a-z0-9]+/gi, "_")
		.replace(/^_|_$/g, "")
		.slice(0, 60);
	const date = new Date().toISOString().slice(0, 10);

	if (format === "docx") {
		const buffer = await buildIntelligenceDocx(model);
		return {
			buffer,
			filename: `Competitor_Price_Intelligence_${slug}_${date}.docx`,
			contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		};
	}

	const buffer = await buildIntelligencePdf(model);
	return {
		buffer,
		filename: `Competitor_Price_Intelligence_${slug}_${date}.pdf`,
		contentType: "application/pdf",
	};
};

const fallbackNarrative = (model) => {
	const below = model.rows.filter((row) => typeof row.gapValue === "number" && row.gapValue < 0);
	const gaps = model.rows.filter((row) =>
		row.cells.some((cell) => cell.label === "Out of Stock" || cell.label === "N/F" || cell.note),
	);
	const widest = [...below].sort((a, b) => a.gapValue - b.gapValue).slice(0, 4);
	const advisory = widest.length
		? `**STRATEGIC ADVISORY ON THE DAILY PRICING WINDOW:** Review ${widest.map((row) => `**${row.name} (${row.gap})**`).join(", ")} before the next price window. These are the widest gaps versus the **Queens** benchmark in **${model.periodName}**.`
		: `**STRATEGIC ADVISORY ON THE DAILY PRICING WINDOW:** No captured competitor price is below the **Queens** benchmark in **${model.periodName}**. Keep the current benchmarks and confirm the next field visit.`;
	const observationLines = [
		below.length
			? `**Benchmark comparison:** **${below.length}** items have a competitor price below the Queens benchmark at the cheapest audited store.`
			: "**Benchmark comparison:** No captured competitor price is below the Queens benchmark.",
		gaps.length
			? `**Product availability and substitutions:** ${gaps.slice(0, 6).map((row) => `**${row.name}** — ${row.stock === "—" ? row.cells.map((cell) => cell.note).filter(Boolean).join("; ") : row.stock}`).join(". ")}.`
			: "**Product availability:** No stock-out, not-found, or substitute notes were captured.",
	];
	return {
		advisory,
		observations: observationLines.join("\n"),
		purchases: "**Mystery-shopping purchases:** No mystery-shopping purchases, weights, or receipt totals were recorded on these price captures. Add what was bought during the visit.",
	};
};

export const draftIntelligenceNotes = async ({ surveyPeriodId }) => {
	const model = await buildIntelligenceReport({ surveyPeriodId, notes: {}, includeCards: false });
	const fallback = fallbackNarrative(model);
	if (!GROQ_API_KEY) return fallback;

	const notable = model.rows.filter((row) => {
		const orange = /\borange\b/i.test(row.name);
		const gap = typeof row.gapValue === "number" && Math.abs(row.gapValue) >= 5;
		const stock = row.cells.some((cell) => cell.label === "Out of Stock" || cell.label === "N/F" || cell.note);
		return orange || gap || stock;
	});
	const ranked = [...notable].sort(
		(a, b) => Math.abs(b.gapValue || 0) - Math.abs(a.gapValue || 0),
	).slice(0, 18);
	const facts = {
		period: model.periodName,
		stores: model.stores.map((store) => store.name),
		auditors: model.auditors,
		skuCount: model.rows.length,
		rows: ranked.map((row) => ({
			item: row.name,
			unit: row.unit,
			queens: row.queens,
			lowest: row.lowest,
			gap: row.gap,
			notes: row.cells
				.map((cell) => [model.stores.find((store) => store.id === cell.storeId)?.name, cell.label, cell.note].filter(Boolean).join(" "))
				.filter((line) => /Out of Stock|N\/F|Erer|Valencia|Sub:/.test(line))
				.slice(0, 4),
		})),
	};

	try {
		const modelName = await getActiveGroqModel("fast");
		const completion = await groq.chat.completions.create({
			model: modelName,
			temperature: 0.2,
			response_format: { type: "json_object" },
			messages: [
				{
					role: "system",
					content:
						"You draft the last page of a Queens Supermarket competitor report from captured survey data only. Return JSON with keys advisory, observations, purchases. Use **double asterisks** for bold, the same way the printed report does. advisory is one paragraph that starts with a bold capital lead ending in a colon, such as **STRATEGIC ADVISORY ON THE DAILY PRICING WINDOW:**, then the recommendation. Bold the important times, store names, and figures inside the paragraph. observations is 3 to 5 bullets separated by a newline. Each bullet starts with a bold label and a colon, then the finding, for example **Value added tax:** Street prices are **VAT-exempt** while **Queens / Carrefour** prices are **VAT-inclusive**. Cover stock-outs, substitutions, orange Erer and Valencia when present, and where Queens is higher or lower. purchases is 2 to 4 bullets in that same pattern, one per market or receipt. If purchases, weights, or receipts were not recorded, use one bullet that says so and leaves room for the field team to add them. Do not invent prices, stores, receipts, weights, or people.",
				},
				{ role: "user", content: JSON.stringify(facts) },
			],
		});
		const parsed = JSON.parse(completion.choices[0].message.content || "{}");
		return {
			advisory: String(parsed.advisory || fallback.advisory).trim(),
			observations: String(parsed.observations || fallback.observations).trim(),
			purchases: String(parsed.purchases || fallback.purchases).trim(),
		};
	} catch (error) {
		console.error("[Groq AI] Intelligence note draft failed:", error.message);
		return fallback;
	}
};
