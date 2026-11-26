import PDFDocument from "pdfkit";

const C = {
	red: "#A41821",
	green: "#017C4D",
	orange: "#FE7914",
	ink: "#1F2937",
	muted: "#64748B",
	line: "#E2E8F0",
	head: "#1F3A5F",
	card: "#F8FAFC",
	white: "#FFFFFF",
};

const pdfBuffer = (doc) =>
	new Promise((resolve, reject) => {
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		doc.end();
	});

const footer = (doc, page, pages) => {
	const y = doc.page.height - 28;
	doc
		.font("Helvetica")
		.fontSize(7)
		.fillColor(C.muted)
		.text(
			`Aires Business Intelligence Platform | Carrefour & Queens Supermarket Ethiopia | ${doc.info.Subject || ""}`,
			36,
			y,
			{ width: doc.page.width - 120, lineBreak: false },
		);
	doc.text(`Page ${page} of ${pages}`, doc.page.width - 100, y, { width: 64, align: "right" });
};

export const buildIntelligencePdf = (model) => {
	const doc = new PDFDocument({
		size: "A4",
		layout: "landscape",
		margins: { top: 28, bottom: 36, left: 28, right: 28 },
		info: {
			Title: model.title,
			Subject: `Audit Date: ${model.auditDate}`,
			Author: "Aires Business Intelligence",
		},
	});

	const width = doc.page.width - 56;
	doc.rect(0, 0, doc.page.width, 8).fill(C.red);
	doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(13).text(model.title, 28, 18, { width });
	doc
		.font("Helvetica")
		.fontSize(8)
		.fillColor(C.muted)
		.text(
			`${model.periodName}  ·  Audit date ${model.auditDate}  ·  Auditors: ${model.auditors.join(", ") || "—"}`,
			28,
			36,
			{ width },
		);

	const cardW = (width - 18) / 4;
	model.cards.forEach((card, index) => {
		const x = 28 + index * (cardW + 6);
		doc.roundedRect(x, 54, cardW, 62, 6).fillAndStroke(C.card, C.line);
		doc.fillColor(C.red).font("Helvetica-Bold").fontSize(6.5).text(card.label, x + 8, 60, { width: cardW - 16 });
		doc.fillColor(C.ink).fontSize(11).text(card.value, x + 8, 72, { width: cardW - 16 });
		doc.fillColor(C.muted).font("Helvetica").fontSize(6.5).text(card.text, x + 8, 88, { width: cardW - 16, height: 24 });
	});

	const storeCount = Math.max(model.stores.length, 1);
	const fixed = [28, 118, 42, 62, 110, 78, 52];
	const fixedSum = fixed.reduce((sum, n) => sum + n, 0);
	const storeW = Math.max(48, (width - fixedSum) / storeCount);
	const columns = [
		{ key: "no", title: "No", width: fixed[0], align: "center" },
		{ key: "name", title: "Item", width: fixed[1] },
		{ key: "unit", title: "Unit", width: fixed[2] },
		{ key: "queens", title: "Queens", width: fixed[3], align: "right" },
		...model.stores.map((store) => ({
			key: store.id,
			title: store.name,
			width: storeW,
			align: "right",
		})),
		{ key: "stock", title: "Stock / substitute", width: fixed[4] },
		{ key: "lowest", title: "Lowest", width: fixed[5] },
		{ key: "gap", title: "vs Queens", width: fixed[6], align: "right" },
	];

	let y = 126;
	let category = "";
	const drawHeader = () => {
		doc.rect(28, y, width, 18).fill(C.head);
		let x = 28;
		doc.fillColor(C.white).font("Helvetica-Bold").fontSize(6);
		columns.forEach((column) => {
			doc.text(column.title, x + 3, y + 5, { width: column.width - 6, align: column.align || "left", lineBreak: false });
			x += column.width;
		});
		y += 18;
	};
	drawHeader();

	const rowHeight = 16;
	rows: for (const row of model.rows) {
		if (y > doc.page.height - 52) {
			doc.addPage({ size: "A4", layout: "landscape", margins: { top: 28, bottom: 36, left: 28, right: 28 } });
			y = 28;
			drawHeader();
		}
		if (row.category !== category) {
			category = row.category;
			doc.rect(28, y, width, 14).fill("#F1F5F9");
			doc.fillColor(C.orange).font("Helvetica-Bold").fontSize(7).text(category.toUpperCase(), 34, y + 3);
			y += 14;
		}
		doc.rect(28, y, width, rowHeight).stroke(C.line);
		let x = 28;
		const values = {
			no: String(row.no),
			name: row.name,
			unit: row.unit,
			queens: row.queens,
			stock: row.stock,
			lowest: row.lowest,
			gap: row.gap,
		};
		row.cells.forEach((cell) => {
			values[cell.storeId] = cell.label;
		});
		doc.fillColor(C.ink).font("Helvetica").fontSize(6.5);
		columns.forEach((column) => {
			doc.text(String(values[column.key] ?? "—"), x + 3, y + 4, {
				width: column.width - 6,
				height: rowHeight - 4,
				align: column.align || "left",
				ellipsis: true,
			});
			x += column.width;
		});
		y += rowHeight;
	}

	doc.addPage({ size: "A4", layout: "landscape", margins: { top: 36, bottom: 40, left: 36, right: 36 } });
	const body = doc.page.width - 72;
	doc.fillColor(C.ink).font("Helvetica-Bold").fontSize(13).text(
		"OPERATIONAL MARKET INTELLIGENCE, RECOMMENDATIONS & FIELD EVIDENCE LOG",
		36,
		32,
		{ width: body },
	);
	doc.moveDown(0.4).font("Helvetica").fontSize(8).fillColor(C.muted).text(
		"Notes supplied by the person generating this report. Figures on the previous pages come from the survey captures.",
		{ width: body },
	);

	const section = (title, text) => {
		doc.moveDown(0.7).fillColor(C.red).font("Helvetica-Bold").fontSize(10).text(title, { width: body });
		doc.moveDown(0.25).fillColor(C.ink).font("Helvetica").fontSize(9).text(text || "—", { width: body });
	};

	section("Strategic advisory", model.notes.advisory);
	section("Key market observations", model.notes.observations);
	section("Mystery shopping and receipt notes", model.notes.purchases);
	section(
		"Field evidence log",
		model.notes.evidence.length
			? model.notes.evidence
					.map(
						(row, index) =>
							`${index + 1}. ${row.location || "Location not named"}\nGPS / time: ${row.gps || "—"}\nAudio: ${row.audio || "—"}\nProof: ${row.proof || "—"}`,
					)
					.join("\n\n")
			: "—",
	);

	const range = doc.bufferedPageRange();
	for (let i = range.start; i < range.start + range.count; i += 1) {
		doc.switchToPage(i);
		footer(doc, i - range.start + 1, range.count);
	}

	return pdfBuffer(doc);
};
