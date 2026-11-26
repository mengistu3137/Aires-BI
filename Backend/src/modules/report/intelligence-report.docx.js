import {
	AlignmentType,
	Document,
	HeadingLevel,
	Packer,
	PageNumber,
	PageOrientation,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType,
	Header,
	Footer,
	BorderStyle,
	ShadingType,
} from "docx";

const cell = (text, { bold = false, fill, align, width } = {}) =>
	new TableCell({
		width: width ? { size: width, type: WidthType.DXA } : undefined,
		shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
		margins: { top: 40, bottom: 40, left: 60, right: 60 },
		children: [
			new Paragraph({
				alignment: align || AlignmentType.LEFT,
				children: [
					new TextRun({
						text: String(text ?? "—"),
						bold,
						font: "Calibri",
						size: 16,
						color: fill === "1F3A5F" ? "FFFFFF" : "1F2937",
					}),
				],
			}),
		],
	});

const heading = (text) =>
	new Paragraph({
		heading: HeadingLevel.HEADING_1,
		spacing: { after: 160 },
		children: [new TextRun({ text, bold: true, font: "Calibri", color: "A41821", size: 28 })],
	});

const body = (text) =>
	new Paragraph({
		spacing: { after: 160 },
		children: [new TextRun({ text: text || "—", font: "Calibri", size: 20 })],
	});

export const buildIntelligenceDocx = async (model) => {
	const headers = ["No", "Item", "Unit", "Queens", ...model.stores.map((store) => store.name), "Stock / substitute", "Lowest", "vs Queens"];
	const headerRow = new TableRow({
		tableHeader: true,
		children: headers.map((title) => cell(title, { bold: true, fill: "1F3A5F" })),
	});

	let category = "";
	const dataRows = [];
	for (const row of model.rows) {
		if (row.category !== category) {
			category = row.category;
			dataRows.push(
				new TableRow({
					children: [
						cell(category.toUpperCase(), { bold: true, fill: "F1F5F9" }),
						...headers.slice(1).map(() => cell("", { fill: "F1F5F9" })),
					],
				}),
			);
		}
		const values = [
			row.no,
			row.name,
			row.unit,
			row.queens,
			...row.cells.map((item) => item.label),
			row.stock,
			row.lowest,
			row.gap,
		];
		dataRows.push(new TableRow({ children: values.map((value) => cell(value)) }));
	}

	const doc = new Document({
		sections: [
			{
				properties: {
					page: {
						size: {
							orientation: PageOrientation.LANDSCAPE,
							width: 16838,
							height: 11906,
						},
						margin: { top: 720, bottom: 720, left: 720, right: 720 },
					},
				},
				headers: {
					default: new Header({
						children: [
							new Paragraph({
								border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "A41821" } },
								children: [
									new TextRun({ text: model.title, bold: true, font: "Calibri", size: 28, color: "1F2937" }),
								],
							}),
							new Paragraph({
								children: [
									new TextRun({
										text: `${model.periodName}   ·   Audit date ${model.auditDate}   ·   Auditors: ${model.auditors.join(", ") || "—"}`,
										font: "Calibri",
										size: 16,
										color: "64748B",
									}),
								],
							}),
						],
					}),
				},
				footers: {
					default: new Footer({
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: "Aires Business Intelligence Platform | Carrefour & Queens Supermarket Ethiopia    Page ",
										font: "Calibri",
										size: 14,
										color: "64748B",
									}),
									new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 14, color: "64748B" }),
									new TextRun({ text: " of ", font: "Calibri", size: 14, color: "64748B" }),
									new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Calibri", size: 14, color: "64748B" }),
								],
							}),
						],
					}),
				},
				children: [
					...model.cards.map(
						(card) =>
							new Paragraph({
								spacing: { after: 80 },
								children: [
									new TextRun({ text: `${card.label}: ${card.value}. `, bold: true, font: "Calibri", size: 18, color: "A41821" }),
									new TextRun({ text: card.text, font: "Calibri", size: 18 }),
								],
							}),
					),
					new Paragraph({ spacing: { before: 200, after: 80 } }),
					new Table({
						width: { size: 100, type: WidthType.PERCENTAGE },
						rows: [headerRow, ...dataRows],
					}),
					new Paragraph({ pageBreakBefore: true }),
					heading("Operational market intelligence, recommendations & field evidence log"),
					new Paragraph({
						spacing: { after: 200 },
						children: [
							new TextRun({
								text: "These notes were entered before the report was generated. Edit this Word file if the wording needs to change.",
								italics: true,
								font: "Calibri",
								size: 18,
								color: "64748B",
							}),
						],
					}),
					heading("Strategic advisory"),
					body(model.notes.advisory),
					heading("Key market observations"),
					body(model.notes.observations),
					heading("Mystery shopping and receipt notes"),
					body(model.notes.purchases),
					heading("Field evidence log"),
					...(model.notes.evidence.length
						? model.notes.evidence.flatMap((row, index) => [
								new Paragraph({
									spacing: { before: 120 },
									children: [
										new TextRun({
											text: `${index + 1}. ${row.location || "Location not named"}`,
											bold: true,
											font: "Calibri",
											size: 20,
										}),
									],
								}),
								body(`GPS / time: ${row.gps || "—"}`),
								body(`Audio: ${row.audio || "—"}`),
								body(`Proof: ${row.proof || "—"}`),
							])
						: [body("—")]),
				],
			},
		],
	});

	return Packer.toBuffer(doc);
};
