import { bulletLines, formatAdvisory, parseMarkup } from "./intelligence-report.markup.js";
import {
	AlignmentType,
	BorderStyle,
	Document,
	Footer,
	Header,
	HeightRule,
	Packer,
	PageNumber,
	PageOrientation,
	Paragraph,
	Table,
	TableCell,
	TableLayoutType,
	TableRow,
	TextRun,
	VerticalAlign,
	WidthType,
} from "docx";

const FONT = "DejaVu Sans";
const MONO = "DejaVu Sans Mono";

const line = (color = "CBD5E1", size = 4) => ({
	style: BorderStyle.SINGLE,
	size,
	color,
});

const borders = (color = "CBD5E1", size = 6) => ({
	top: line(color, size),
	bottom: line(color, size),
	left: line(color, size),
	right: line(color, size),
});

const tableBorders = {
	...borders("CBD5E1", 6),
	insideHorizontal: line("CBD5E1", 6),
	insideVertical: line("CBD5E1", 6),
};

const run = (text, { bold = false, color = "1E293B", size = 15, italics = false, font = FONT } = {}) =>
	new TextRun({ text: String(text ?? "—"), bold, italics, font, size, color });

const para = (text, opts = {}) =>
	new Paragraph({
		alignment: opts.align || AlignmentType.LEFT,
		spacing: { before: opts.before || 0, after: opts.after || 0 },
		children: [run(text, opts)],
	});

const cell = (text, opts = {}) =>
	new TableCell({
		width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
		columnSpan: opts.span,
		shading: opts.fill ? { type: "clear", fill: opts.fill } : undefined,
		margins: { top: opts.pad ?? 40, bottom: opts.pad ?? 40, left: 60, right: 60 },
		verticalAlign: VerticalAlign.CENTER,
		borders: opts.borders || borders(opts.border || "E2E8F0"),
		children: [
			new Paragraph({
				alignment: opts.align || AlignmentType.LEFT,
				children: [
					run(text, {
						bold: opts.bold,
						color: opts.color || (opts.fill === "0F172A" || opts.fill === "047857" || opts.fill === "1E293B" ? "FFFFFF" : "1E293B"),
						size: opts.size || 14,
						italics: opts.italics,
						font: opts.font || FONT,
					}),
				],
			}),
		],
	});

const isQuiet = (value) => /^(Out of Stock|Not Avail\.|N\/F|N\/A|—|-)$/i.test(String(value || "").trim());

const gapColor = (value) => (String(value || "").startsWith("-") && value !== "—" ? "DC2626" : "059669");

const banner = (title, subtitle) =>
	new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		rows: [
			new TableRow({
				height: { value: 900, rule: HeightRule.ATLEAST },
				children: [
					new TableCell({
						shading: { type: "clear", fill: "0F172A" },
						margins: { top: 120, bottom: 40, left: 160, right: 160 },
						borders: {
							top: line("0F172A", 4),
							left: line("0F172A", 4),
							right: line("0F172A", 4),
							bottom: line("10B981", 16),
						},
						children: [
							para(title, { bold: true, color: "FFFFFF", size: 28 }),
							para(subtitle, { color: "CBD5E1", size: 16, before: 60 }),
						],
					}),
				],
			}),
		],
	});

const metaTable = (model) => {
	const pairs = [
		["Audit Date:", `${model.auditDate} (${model.auditDateShort || ""})`],
		["Platform:", model.platform || "Aires Business Intelligence Platform (#Arise BI)"],
		["Target Scope:", model.scope || ""],
		["Field Auditors:", model.auditors.join(", ") || "—"],
		["Competitor Analyst:", "—"],
		["IT & Software:", "Aires BI"],
	];
	const rowOf = (slice) =>
		new TableRow({
			children: slice.flatMap(([label, value]) => [
				cell(label, { bold: true, fill: "E2E8F0", color: "0F172A", size: 15, width: 1600 }),
				cell(value, { fill: "FFFFFF", color: "1E293B", size: 15, width: 2800 }),
			]),
		});
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		rows: [rowOf(pairs.slice(0, 3)), rowOf(pairs.slice(3))],
	});
};

const cardRow = (cards) => {
	const accents = ["10B981", "0284C7", "F59E0B", "6366F1"];
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		rows: [
			new TableRow({
				children: cards.map(
					(card, index) =>
						new TableCell({
							width: { size: 25, type: WidthType.PERCENTAGE },
							margins: { top: 80, bottom: 80, left: 100, right: 100 },
							borders: {
								top: line(accents[index], 16),
								bottom: line("CBD5E1", 4),
								left: line("CBD5E1", 4),
								right: line("CBD5E1", 4),
							},
							children: [
								para(card.label, { bold: true, color: "64748B", size: 13 }),
								para(card.value, { bold: true, color: "0F172A", size: 22, before: 40 }),
								para(card.text, { color: "475569", size: 13, before: 40 }),
							],
						}),
				),
			}),
		],
	});
};

const priceTable = (model) => {
	const storeCount = Math.max(model.stores.length, 1);
	const total = 15700;
	const no = 480;
	const unit = 760;
	const queens = 1500;
	const lowest = 1760;
	const gap = 1180;
	const stock = 1560;
	let item = 1900;
	let storeW = Math.floor((total - (no + item + unit + queens + stock + lowest + gap)) / storeCount);
	while (storeW < 620 && item > 1300) {
		item -= 80;
		storeW = Math.floor((total - (no + item + unit + queens + stock + lowest + gap)) / storeCount);
	}
	const widths = [no, item, unit, queens, ...Array.from({ length: storeCount }, () => storeW), stock, lowest, gap];
	widths[1] += total - widths.reduce((sum, value) => sum + value, 0);
	const headers = [
		{ title: "No", queens: false },
		{ title: "Item Name", queens: false },
		{ title: "Unit", queens: false },
		{ title: "Queens / Carrefour Benchmark (ETB)", queens: true },
		...model.stores.map((store) => ({ title: `${store.name} (ETB)`, queens: false })),
		{ title: "Stock / Substitute Observations", queens: false },
		{ title: "Lowest Market Price (ETB)", queens: false },
		{ title: "Best vs. Queens", queens: false },
	];
	const headerRow = new TableRow({
		tableHeader: true,
		children: headers.map((column, index) =>
			cell(column.title, {
				bold: true,
				fill: column.queens ? "047857" : "1E293B",
				color: "FFFFFF",
				size: 12,
				width: widths[index],
				align: AlignmentType.CENTER,
			}),
		),
	});

	let category = "";
	let stripe = 0;
	const dataRows = [];
	for (const row of model.rows) {
		if (row.category !== category) {
			category = row.category;
			stripe = 0;
			dataRows.push(
				new TableRow({
					children: [
						cell(String(category).toUpperCase(), {
							bold: true,
							fill: "FEF08A",
							color: "0F172A",
							size: 14,
							span: headers.length,
						}),
					],
				}),
			);
		}
		const fill = stripe % 2 === 0 ? "F8FAFC" : "FFFFFF";
		stripe += 1;
		const values = [
			String(row.no),
			row.name,
			row.unit,
			row.queens,
			...row.cells.map((item) => item.label),
			row.stock,
			row.lowest,
			row.gap,
		];
		dataRows.push(
			new TableRow({
				children: values.map((value, index) => {
					const queens = index === 3;
					const gap = index === values.length - 1;
					const stock = index === values.length - 3;
					const quiet = !queens && !gap && index > 2 && isQuiet(value);
					return cell(value, {
						bold: queens || gap || index === 1,
						italics: quiet,
						fill: queens ? "ECFDF5" : fill,
						color: queens ? "065F46" : gap ? gapColor(value) : quiet ? "94A3B8" : stock ? "475569" : "1E293B",
						size: stock ? 12 : 14,
						width: widths[index],
						align: index === 1 || stock ? AlignmentType.LEFT : AlignmentType.CENTER,
					});
				}),
			}),
		);
	}

	return new Table({
		width: { size: total, type: WidthType.DXA },
		columnWidths: widths,
		layout: TableLayoutType.FIXED,
		borders: tableBorders,
		rows: [headerRow, ...dataRows],
	});
};

const richRuns = (text, size = 16) => {
	const runs = parseMarkup(text);
	return (runs.length ? runs : [{ text: "—", bold: false, italic: false }]).map((part) =>
		run(part.text, { bold: part.bold, italics: part.italic, size, color: "1E293B" }),
	);
};

const bulletParagraphs = (text) => {
	const lines = bulletLines(text);
	if (!lines.length) return [para("—", { size: 16 })];
	return lines.map(
		(line) =>
			new Paragraph({
				spacing: { after: 80 },
				children: [run("•  ", { size: 16, color: "1E293B" }), ...richRuns(line)],
			}),
	);
};

const noteCard = (title, text) =>
	new TableCell({
		width: { size: 50, type: WidthType.PERCENTAGE },
		margins: { top: 80, bottom: 100, left: 120, right: 120 },
		borders: borders("CBD5E1", 6),
		children: [
			para(title, { bold: true, color: "0F172A", size: 19, after: 100 }),
			...bulletParagraphs(text),
		],
	});

const evidenceTable = (model) => {
	const headers = ["Audit Location", "GPS / Timestamp Verification", "Hidden Audio Recording Log", "Visual & Financial Proof"];
	const rows = model.notes.evidence.length
		? model.notes.evidence
		: [{ location: "—", gps: "—", audio: "—", proof: "—" }];
	const captions = rows.filter((row) => row.location && row.location !== "—").slice(0, 4);
	let usedSpan = 0;
	const captionRow = captions.length
		? new TableRow({
				children: captions.map((row, index) => {
					const span = index === captions.length - 1 ? 4 - usedSpan : Math.floor(4 / captions.length);
					usedSpan += span;
					const gps = String(row.gps || "").split("\n").filter(Boolean);
					const detail = String(row.proof || row.audio || "").split("\n")[0] || "—";
					return new TableCell({
						columnSpan: span,
						shading: { type: "clear", fill: "F8FAFC" },
						margins: { top: 60, bottom: 60, left: 80, right: 80 },
						borders: borders("CBD5E1", 6),
						children: [
							para(row.location, { size: 16, align: AlignmentType.CENTER }),
							para(gps[0] || "—", { bold: true, size: 14, color: "334155", align: AlignmentType.CENTER }),
							para(gps[1] || detail, { bold: true, size: 14, color: "334155", align: AlignmentType.CENTER }),
						],
					});
				}),
			})
		: null;
	return new Table({
		width: { size: 100, type: WidthType.PERCENTAGE },
		borders: tableBorders,
		rows: [
			new TableRow({
				tableHeader: true,
				children: headers.map((title) =>
					cell(title, { bold: true, fill: "1E293B", color: "FFFFFF", size: 14, align: AlignmentType.CENTER }),
				),
			}),
			...rows.map(
				(row, index) =>
					new TableRow({
						children: [
							cell(row.location || "—", { bold: true, fill: index % 2 ? "F8FAFC" : "FFFFFF", size: 14 }),
							cell(row.gps || "—", { fill: index % 2 ? "F8FAFC" : "FFFFFF", size: 13, font: MONO }),
							cell(row.audio || "—", { fill: index % 2 ? "F8FAFC" : "FFFFFF", size: 13, font: MONO }),
							cell(row.proof || "—", { fill: index % 2 ? "F8FAFC" : "FFFFFF", size: 14 }),
						],
					}),
			),
			...(captionRow ? [captionRow] : []),
		],
	});
};

const footer = () =>
	new Footer({
		children: [
			new Paragraph({
				children: [
					run("Aires Business Intelligence Platform | Carrefour & Queens Supermarket Ethiopia    Page ", {
						size: 14,
						color: "64748B",
					}),
					new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 14, color: "64748B" }),
					run(" of ", { size: 14, color: "64748B" }),
					new TextRun({ children: [PageNumber.TOTAL_PAGES], font: FONT, size: 14, color: "64748B" }),
				],
			}),
		],
	});

export const buildIntelligenceDocx = async (model) => {
	const page = {
		size: { orientation: PageOrientation.LANDSCAPE, width: 16838, height: 11906 },
		margin: { top: 560, bottom: 640, left: 560, right: 560 },
	};
	const doc = new Document({
		sections: [
			{
				properties: { page },
				headers: { default: new Header({ children: [new Paragraph("")] }) },
				footers: { default: footer() },
				children: [
					banner(model.title, model.subtitle || `${model.periodName} | Audit date ${model.auditDate}`),
					new Paragraph({ spacing: { before: 120 } }),
					metaTable(model),
					new Paragraph({ spacing: { before: 140 } }),
					cardRow(model.cards),
					new Paragraph({ spacing: { before: 160 } }),
					priceTable(model),
				],
			},
			{
				properties: { page },
				footers: { default: footer() },
				children: [
					banner(
						"OPERATIONAL MARKET INTELLIGENCE, RECOMMENDATIONS & FIELD EVIDENCE LOG",
						`Mystery Shopping Purchase Summary, VAT Analysis, Pricing Window Advisory & GPS/Audio Verification (${model.auditDate})`,
					),
					new Paragraph({ spacing: { before: 140 } }),
					new Table({
						width: { size: 100, type: WidthType.PERCENTAGE },
						rows: [
							new TableRow({
								children: [
									new TableCell({
										shading: { type: "clear", fill: "FFFBEB" },
										margins: { top: 80, bottom: 80, left: 140, right: 140 },
										borders: {
											top: line("FDE68A", 4),
											bottom: line("FDE68A", 4),
											right: line("FDE68A", 4),
											left: line("F59E0B", 16),
										},
										children: [
											new Paragraph({
												children: richRuns(formatAdvisory(model.notes.advisory), 16),
											}),
										],
									}),
								],
							}),
						],
					}),
					new Paragraph({ spacing: { before: 160 } }),
					new Table({
						width: { size: 100, type: WidthType.PERCENTAGE },
						rows: [
							new TableRow({
								children: [
									noteCard("1. Key Market Observations & Tax (VAT) Dynamics", model.notes.observations),
									noteCard(`2. Mystery Shopping Physical Purchases (${model.auditDateCompact || model.auditDate})`, model.notes.purchases),
								],
							}),
						],
					}),
					new Paragraph({ spacing: { before: 200 } }),
					para("3. Multi-Channel Field Audit & Tracking Evidence Log", {
						bold: true,
						color: "0F172A",
						size: 20,
						after: 80,
					}),
					evidenceTable(model),
				],
			},
		],
	});

	return Packer.toBuffer(doc);
};
