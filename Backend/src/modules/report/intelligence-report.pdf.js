import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { bulletLines, formatAdvisory, parseMarkup, plainText } from "./intelligence-report.markup.js";

const fontsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fonts");

const C = {
	navy: "#0F172A",
	ink: "#1E293B",
	slate: "#475569",
	label: "#64748B",
	muted: "#94A3B8",
	line: "#CBD5E1",
	soft: "#E2E8F0",
	zebra: "#F8FAFC",
	white: "#FFFFFF",
	green: "#10B981",
	greenHead: "#047857",
	greenInk: "#065F46",
	mint: "#ECFDF5",
	blue: "#0284C7",
	amber: "#F59E0B",
	amberWash: "#FFFBEB",
	indigo: "#6366F1",
	yellow: "#FEF08A",
	red: "#DC2626",
	good: "#059669",
	subtitle: "#CBD5E1",
};

const pdfBuffer = (doc) =>
	new Promise((resolve, reject) => {
		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);
		doc.end();
	});

const isQuiet = (value) => /^(Out of Stock|Not Avail\.|N\/F|N\/A|—|-)$/i.test(String(value || "").trim());

const gapColor = (value) => {
	const text = String(value || "");
	if (text.startsWith("-") && text !== "—") return C.red;
	return C.good;
};

const columnsFor = (stores, width) => {
	const count = Math.max(stores.length, 1);
	const no = 22;
	const unit = 40;
	const queens = 72;
	const lowest = 82;
	const gap = 54;
	let stock = 86;
	let item = 110;
	const fixed = () => no + item + unit + queens + stock + lowest + gap;
	let storeW = (width - fixed()) / count;
	while (storeW < 34 && (item > 74 || stock > 68)) {
		if (item > 74) item -= 4;
		else stock -= 4;
		storeW = (width - fixed()) / count;
	}
	storeW = Math.max(26, (width - fixed()) / count);
	const columns = [
		{ key: "no", title: "No", width: no, align: "center" },
		{ key: "name", title: "Item Name", width: item, align: "left" },
		{ key: "unit", title: "Unit", width: unit, align: "center" },
		{ key: "queens", title: "Queens /\nCarrefour\nBenchmark\n(ETB)", width: queens, align: "center", queens: true },
		...stores.map((store) => ({
			key: store.id,
			title: `${store.name}\n(ETB)`,
			width: storeW,
			align: "center",
		})),
		{ key: "stock", title: "Stock / Substitute\nObservations", width: stock, align: "left" },
		{ key: "lowest", title: "Lowest Market\nPrice (ETB)", width: lowest, align: "center" },
		{ key: "gap", title: "Best vs.\nQueens", width: gap, align: "center" },
	];
	const name = columns.find((column) => column.key === "name");
	let extra = width - columns.reduce((sum, column) => sum + column.width, 0);
	if (name.width + extra < 64) {
		const storeColumns = columns.filter((column) => column.key !== "no" && column.key !== "name" && column.key !== "unit" && column.key !== "queens" && column.key !== "stock" && column.key !== "lowest" && column.key !== "gap");
		const take = (64 - (name.width + extra)) / Math.max(storeColumns.length, 1);
		storeColumns.forEach((column) => {
			column.width = Math.max(18, column.width - take);
		});
		extra = width - columns.reduce((sum, column) => sum + column.width, 0);
	}
	name.width += extra;
	return columns;
};

export const buildIntelligencePdf = (model) => {
	const doc = new PDFDocument({
		size: "A4",
		layout: "landscape",
		margins: { top: 34, bottom: 28, left: 34, right: 34 },
		bufferPages: true,
		info: {
			Title: model.title,
			Subject: `Audit Date: ${model.auditDate}`,
			Author: "Aires Business Intelligence",
		},
	});
	doc.registerFont("DejaVu", path.join(fontsDir, "DejaVuSans.ttf"));
	doc.registerFont("DejaVu-Bold", path.join(fontsDir, "DejaVuSans-Bold.ttf"));
	doc.registerFont("DejaVu-Oblique", path.join(fontsDir, "DejaVuSans-Oblique.ttf"));
	doc.registerFont("DejaVu-Mono", path.join(fontsDir, "DejaVuSansMono.ttf"));

	const left = 34;
	const width = doc.page.width - 68;
	const columns = columnsFor(model.stores, width);
	const bottom = () => doc.page.height - 32;
	const gridColor = "#CBD5E1";
	const gridWeight = 0.75;

	const drawGrid = (y, height, cols) => {
		const right = left + width;
		doc.save();
		doc.strokeColor(gridColor).lineWidth(gridWeight).lineJoin("miter").lineCap("butt");
		doc.moveTo(left, y).lineTo(right, y).stroke();
		doc.moveTo(left, y + height).lineTo(right, y + height).stroke();
		let x = left;
		doc.moveTo(x, y).lineTo(x, y + height).stroke();
		cols.forEach((column) => {
			x += column.width;
			doc.moveTo(x, y).lineTo(x, y + height).stroke();
		});
		if (x < right - 0.2) doc.moveTo(right, y).lineTo(right, y + height).stroke();
		doc.restore();
	};

	const banner = (title, subtitle, height = 58) => {
		doc.roundedRect(left, 28, width, height, 4).fill(C.navy);
		doc.rect(left, 28 + height - 3, width, 3).fill(C.green);
		doc.fillColor(C.white).font("DejaVu-Bold").fontSize(14).text(title, left + 14, 36, {
			width: width - 28,
			height: 18,
			lineBreak: false,
			ellipsis: true,
		});
		doc.fillColor(C.subtitle).font("DejaVu").fontSize(8).text(subtitle, left + 14, 54, {
			width: width - 28,
			height: height - 30,
			ellipsis: true,
		});
		return 28 + height + 8;
	};

	const meta = (y) => {
		const pairs = [
			["Audit Date:", `${model.auditDate}\n(${model.auditDateShort || ""})`],
			["Platform:", model.platform || "Aires Business Intelligence Platform (#Arise BI)"],
			["Target Scope:", model.scope || ""],
			["Field Auditors:", model.auditors.join(", ") || "—"],
			["Competitor Analyst:", "—"],
			["IT & Software:", "Aires BI"],
		];
		const labelW = 108;
		const colW = width / 3;
		const rowH = 32;
		pairs.forEach((pair, index) => {
			const col = index % 3;
			const row = Math.floor(index / 3);
			const x = left + col * colW;
			const yy = y + row * rowH;
			doc.rect(x, yy, labelW, rowH).fill(C.soft);
			doc.rect(x + labelW, yy, colW - labelW, rowH).fill(C.white);
			doc.strokeColor("#CBD5E1").lineWidth(0.75).rect(x, yy, colW, rowH).stroke();
			doc.fillColor(C.navy).font("DejaVu-Bold").fontSize(7.5).text(pair[0], x + 6, yy + 11, {
				width: labelW - 10,
				lineBreak: false,
			});
			doc.fillColor(C.ink).font("DejaVu").fontSize(7.5).text(pair[1], x + labelW + 6, yy + 6, {
				width: colW - labelW - 12,
				height: rowH - 8,
			});
		});
		return y + rowH * 2 + 8;
	};

	const cards = (y) => {
		const gap = 8;
		const cardW = (width - gap * 3) / 4;
		const cardH = 82;
		const accents = [C.green, C.blue, C.amber, C.indigo];
		model.cards.forEach((card, index) => {
			const x = left + index * (cardW + gap);
			doc.roundedRect(x, y, cardW, cardH, 3).fillAndStroke(C.white, C.line);
			doc.rect(x, y, cardW, 3).fill(accents[index] || C.green);
			doc.fillColor(C.label).font("DejaVu-Bold").fontSize(6.5).text(card.label, x + 8, y + 8, {
				width: cardW - 16,
				lineBreak: false,
			});
			doc.fillColor(C.navy).font("DejaVu-Bold").fontSize(11).text(card.value, x + 8, y + 20, {
				width: cardW - 16,
				lineBreak: false,
			});
			doc.fillColor(C.slate).font("DejaVu").fontSize(6.6).text(card.text, x + 8, y + 36, {
				width: cardW - 16,
				height: 42,
				ellipsis: true,
			});
		});
		return y + cardH + 8;
	};

	const drawTableHeader = (y) => {
		doc.font("DejaVu-Bold").fontSize(7);
		const headerH = Math.max(
			52,
			...columns.map((column) => doc.heightOfString(column.title, { width: Math.max(8, column.width - 6), align: "center" }) + 10),
		);
		let x = left;
		columns.forEach((column) => {
			doc.rect(x, y, column.width, headerH).fill(column.queens ? C.greenHead : C.navy);
			doc.font("DejaVu-Bold").fontSize(7);
			const textH = doc.heightOfString(column.title, { width: column.width - 6, align: "center" });
			doc.fillColor(C.white).text(column.title, x + 3, y + Math.max(3, (headerH - textH) / 2), {
				width: column.width - 6,
				align: "center",
			});
			x += column.width;
		});
		drawGrid(y, headerH, columns);
		return y + headerH;
	};

	const valuesOf = (row) => {
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
		return values;
	};

	const rowHeight = (row) => {
		const values = valuesOf(row);
		let height = 18;
		columns.forEach((column) => {
			const quiet = column.key !== "name" && column.key !== "no" && column.key !== "unit" && isQuiet(values[column.key]);
			doc.font(quiet ? "DejaVu-Oblique" : column.key === "name" || column.key === "queens" || column.key === "gap" ? "DejaVu-Bold" : "DejaVu");
			doc.fontSize(column.key === "stock" ? 6.2 : 7);
			const textHeight = doc.heightOfString(String(values[column.key] ?? "—"), { width: column.width - 6 });
			height = Math.max(height, textHeight + 6);
		});
		return Math.min(height, 42);
	};

	let y = banner(
		model.title,
		model.subtitle || `${model.periodName}  |  Audit date ${model.auditDate}`,
	);
	y = meta(y);
	y = cards(y);
	y = drawTableHeader(y);

	let category = "";
	let stripe = 0;
	for (const row of model.rows) {
		if (row.category !== category) {
			if (y + 18 > bottom()) {
				doc.addPage({ size: "A4", layout: "landscape", margins: { top: 34, bottom: 28, left: 34, right: 34 } });
				y = drawTableHeader(34);
			}
			category = row.category;
			doc.rect(left, y, width, 16).fill(C.yellow);
			doc.fillColor(C.navy).font("DejaVu-Bold").fontSize(7.5).text(String(category).toUpperCase(), left + 6, y + 4, {
				width: width - 12,
				lineBreak: false,
			});
			drawGrid(y, 16, [{ width }]);
			y += 16;
			stripe = 0;
		}
		const height = rowHeight(row);
		if (y + height > bottom()) {
			doc.addPage({ size: "A4", layout: "landscape", margins: { top: 34, bottom: 28, left: 34, right: 34 } });
			y = drawTableHeader(34);
		}
		const values = valuesOf(row);
		const fill = stripe % 2 === 0 ? C.zebra : C.white;
		stripe += 1;
		let x = left;
		columns.forEach((column) => {
			doc.rect(x, y, column.width, height).fill(column.key === "queens" ? C.mint : fill);
			const text = String(values[column.key] ?? "—");
			const quiet = !["name", "no", "unit", "gap"].includes(column.key) && isQuiet(text);
			let color = C.ink;
			let font = "DejaVu";
			if (column.key === "name" || column.key === "no") font = column.key === "name" ? "DejaVu-Bold" : "DejaVu";
			if (column.key === "queens") {
				font = "DejaVu-Bold";
				color = C.greenInk;
			}
			if (column.key === "gap") {
				font = "DejaVu-Bold";
				color = gapColor(text);
			}
			if (quiet) {
				font = "DejaVu-Oblique";
				color = C.muted;
			}
			if (column.key === "stock") color = C.slate;
			doc.fillColor(color).font(font).fontSize(column.key === "stock" ? 6.2 : 7).text(text, x + 3, y + 4, {
				width: column.width - 6,
				height: height - 5,
				align: column.align,
				ellipsis: true,
			});
			x += column.width;
		});
		drawGrid(y, height, columns);
		y += height;
	}

	doc.addPage({ size: "A4", layout: "landscape", margins: { top: 34, bottom: 28, left: 34, right: 34 } });
	y = banner(
		"OPERATIONAL MARKET INTELLIGENCE, RECOMMENDATIONS & FIELD EVIDENCE LOG",
		`Mystery Shopping Purchase Summary, VAT Analysis, Pricing Window Advisory & GPS/Audio Verification (${model.auditDate})`,
		50,
	);

	const drawRich = (text, x, y, maxWidth, size) => {
		const runs = parseMarkup(text);
		const source = runs.length ? runs : [{ text: "—", bold: false, italic: false }];
		let cx = x;
		let cy = y;
		const lineHeight = size + 2.6;
		source.forEach((run) => {
			const font = run.bold ? "DejaVu-Bold" : run.italic ? "DejaVu-Oblique" : "DejaVu";
			doc.font(font).fontSize(size).fillColor(C.ink);
			String(run.text).split(/(\s+)/).forEach((word) => {
				if (!word) return;
				const wordWidth = doc.widthOfString(word);
				if (word.trim() && cx > x && cx + wordWidth > x + maxWidth) {
					cx = x;
					cy += lineHeight;
				}
				doc.text(word, cx, cy, { lineBreak: false });
				cx += wordWidth;
			});
		});
		return cy + lineHeight;
	};

	const advisory = formatAdvisory(model.notes.advisory);
	doc.font("DejaVu").fontSize(8);
	const advisoryHeight = Math.min(90, Math.max(36, doc.heightOfString(plainText(advisory), { width: width - 22 }) + 14));
	doc.rect(left, y, width, advisoryHeight).fill(C.amberWash);
	doc.rect(left, y, 3.5, advisoryHeight).fill(C.amber);
	drawRich(advisory, left + 10, y + 6, width - 22, 8);
	y += advisoryHeight + 8;

	const drawNoteCard = (x, cardY, cardW, title, text) => {
		const lines = bulletLines(text);
		const textW = cardW - 36;
		doc.font("DejaVu").fontSize(8);
		const bodyHeight = (lines.length ? lines : ["—"]).reduce(
			(sum, line) => sum + Math.max(11, doc.heightOfString(plainText(line), { width: textW })) + 6,
			0,
		);
		const cardH = 34 + bodyHeight + 10;
		doc.lineWidth(0.75).strokeColor(C.line).roundedRect(x, cardY, cardW, cardH, 3).fillAndStroke(C.white, C.line);
		doc.rect(x + 8, cardY + 7, cardW - 16, 17).fill("#E2E8F0");
		doc.fillColor(C.navy).font("DejaVu-Bold").fontSize(9.5).text(title, x + 12, cardY + 10, {
			width: cardW - 24,
			lineBreak: false,
		});
		let cursor = cardY + 30;
		(lines.length ? lines : ["—"]).forEach((line) => {
			doc.fillColor(C.ink).font("DejaVu").fontSize(8).text("•", x + 10, cursor, { lineBreak: false });
			cursor = drawRich(line, x + 20, cursor, textW, 8) + 3;
		});
		return cardH;
	};

	const cardGap = 14;
	const cardW = (width - cardGap) / 2;
	const purchaseDate = model.auditDateCompact || model.auditDate;
	const leftH = drawNoteCard(left, y, cardW, "1. Key Market Observations & Tax (VAT) Dynamics", model.notes.observations);
	const rightH = drawNoteCard(
		left + cardW + cardGap,
		y,
		cardW,
		`2. Mystery Shopping Physical Purchases (${purchaseDate})`,
		model.notes.purchases,
	);
	y += Math.max(leftH, rightH) + 8;

	if (y > bottom() - 80) {
		doc.addPage({ size: "A4", layout: "landscape", margins: { top: 34, bottom: 28, left: 34, right: 34 } });
		y = 34;
	}

	const evidenceTop = y;
	const boxPad = 10;
	const innerLeft = left + boxPad;
	const innerW = width - boxPad * 2;
	doc.rect(innerLeft, y + 8, innerW, 17).fill("#E2E8F0");
	doc.fillColor(C.navy).font("DejaVu-Bold").fontSize(9.5).text(
		"3. Multi-Channel Field Audit & Tracking Evidence Log",
		innerLeft + 6,
		y + 11,
		{ width: innerW - 12, lineBreak: false },
	);
	y += 30;

	const ratios = [0.18, 0.24, 0.3, 0.28];
	const evidenceCols = ["location", "gps", "audio", "proof"].map((key, index) => ({
		key,
		title: ["Audit Location", "GPS / Timestamp Verification", "Hidden Audio Recording Log", "Visual & Financial Proof"][index],
		width: innerW * ratios[index],
	}));
	evidenceCols[evidenceCols.length - 1].width += innerW - evidenceCols.reduce((sum, column) => sum + column.width, 0);
	const evidence = model.notes.evidence.length ? model.notes.evidence : [{ location: "—", gps: "—", audio: "—", proof: "—" }];

	const rules = (rowY, rowH, cols) => {
		doc.save();
		doc.strokeColor("#CBD5E1").lineWidth(0.6);
		let cx = innerLeft;
		doc.moveTo(cx, rowY).lineTo(cx, rowY + rowH).stroke();
		cols.forEach((column) => {
			cx += column.width;
			doc.moveTo(cx, rowY).lineTo(cx, rowY + rowH).stroke();
		});
		doc.moveTo(innerLeft, rowY).lineTo(innerLeft + innerW, rowY).stroke();
		doc.moveTo(innerLeft, rowY + rowH).lineTo(innerLeft + innerW, rowY + rowH).stroke();
		doc.restore();
	};

	const headH = 20;
	let x = innerLeft;
	evidenceCols.forEach((column) => {
		doc.rect(x, y, column.width, headH).fill(C.navy);
		doc.fillColor(C.white).font("DejaVu-Bold").fontSize(7.8).text(column.title, x + 3, y + 5, {
			width: column.width - 6,
			align: "center",
			lineBreak: false,
		});
		x += column.width;
	});
	rules(y, headH, evidenceCols);
	y += headH;

	evidence.forEach((row, index) => {
		doc.font("DejaVu").fontSize(7.8);
		const height = Math.max(
			28,
			...evidenceCols.map((column) => doc.heightOfString(String(row[column.key] || "—"), { width: column.width - 8 }) + 8),
		);
		const rowFill = index % 2 === 1 ? C.zebra : C.white;
		let cx = innerLeft;
		evidenceCols.forEach((column) => {
			doc.rect(cx, y, column.width, height).fill(rowFill);
			const value = String(row[column.key] || "—");
			const parts = value.split("\n");
			if (column.key === "gps" || column.key === "audio") {
				doc.fillColor(C.ink).font("DejaVu-Mono").fontSize(7.2).text(parts[0], cx + 4, y + 4, {
					width: column.width - 8,
					height: 11,
					ellipsis: true,
				});
				if (parts.length > 1) {
					doc.font("DejaVu").fontSize(7.2).text(parts.slice(1).join(" "), cx + 4, y + 15, {
						width: column.width - 8,
						height: height - 18,
					});
				}
			} else {
				doc.fillColor(C.ink).font(column.key === "location" ? "DejaVu-Bold" : "DejaVu").fontSize(7.8).text(value, cx + 4, y + 5, {
					width: column.width - 8,
					height: height - 8,
				});
			}
			cx += column.width;
		});
		rules(y, height, evidenceCols);
		y += height;
	});

	const captions = (evidence.some((row) => row.location && row.location !== "—") ? evidence : []).slice(0, 4);
	if (captions.length) {
		const boxW = innerW / captions.length;
		const boxH = 48;
		captions.forEach((row, index) => {
			const bx = innerLeft + index * boxW;
			doc.rect(bx, y, boxW, boxH).fill("#F8FAFC");
			const gpsLine = String(row.gps || "").split("\n").filter(Boolean);
			const detail = String(row.proof || row.audio || "").split("\n")[0];
			doc.fillColor(C.ink).font("DejaVu").fontSize(8).text(row.location, bx + 4, y + 5, {
				width: boxW - 8,
				align: "center",
				lineBreak: false,
			});
			doc.fillColor("#334155").font("DejaVu-Bold").fontSize(7).text(gpsLine[0] || "—", bx + 4, y + 17, {
				width: boxW - 8,
				height: 10,
				align: "center",
				ellipsis: true,
			});
			doc.text(gpsLine[1] || detail || "—", bx + 4, y + 28, {
				width: boxW - 8,
				height: 10,
				align: "center",
				ellipsis: true,
			});
		});
		rules(y, boxH, captions.map(() => ({ width: boxW })));
		y += boxH;
	}
	doc.save();
	doc.lineWidth(0.75).strokeColor(C.line).roundedRect(left, evidenceTop, width, y - evidenceTop + 8, 3).stroke();
	doc.restore();

	const range = doc.bufferedPageRange();
	const footerDate = model.auditDateCompact || model.auditDate;
	for (let i = range.start; i < range.start + range.count; i += 1) {
		doc.switchToPage(i);
		doc.page.margins.bottom = 0;
		const fy = doc.page.height - 20;
		doc.fillColor(C.label).font("DejaVu").fontSize(7).text(
			`Aires Business Intelligence Platform | Carrefour & Queens Supermarket Ethiopia | Audit Date: ${footerDate}`,
			left,
			fy,
			{ width: width - 80, height: 12, lineBreak: false },
		);
		doc.text(`Page ${i - range.start + 1} of ${range.count}`, left + width - 80, fy, {
			width: 80,
			height: 12,
			align: "right",
			lineBreak: false,
		});
	}

	return pdfBuffer(doc);
};
