import PDFDocument from "pdfkit";
import {
  CURRENCY,
  formatDate,
  formatDateTime,
  formatPrice,
  columnHeaderLabel,
} from "./report.utils.js";

const C = {
  primary: "#1F3A5F",
  text: "#1F2937",
  muted: "#6B7280",
  border: "#D1D5DB",
  zebra: "#F5F7FA",
  band: "#E3EAF3",
  card: "#F3F6FA",
  white: "#FFFFFF",
  green: "#2E7D32",
  red: "#B42318",
  amber: "#B54708",
  queens: "#E8F0FA",
};

const PAD = 4;
const MAX_COLUMNS_PER_PAGE = 7;

const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom;
const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

// ------------------------------------------------------------------
// Generic table renderer (auto page-break, repeating header, bands)
// ------------------------------------------------------------------

const fontFor = (cell) =>
  cell && cell.bold
    ? "Helvetica-Bold"
    : cell && cell.italic
      ? "Helvetica-Oblique"
      : "Helvetica";

const asCell = (cell) =>
  cell !== null && typeof cell === "object" ? cell : { text: cell };

/**
 * columns: [{ label, width, align }]
 * rows:    [{ band: "Category" } | { cells: [string | {text,color,bold,italic,fill}] }]
 */
const drawTable = (doc, { columns, rows, y, fontSize = 8 }) => {
  const x0 = doc.page.margins.left;
  const totalW = columns.reduce((sum, c) => sum + c.width, 0);

  const measure = (text, width, font) => {
    doc.font(font).fontSize(fontSize);
    return doc.heightOfString(String(text ?? ""), { width });
  };

  const headerHeight = () =>
    Math.max(
      ...columns.map((c) =>
        measure(c.label, c.width - PAD * 2, "Helvetica-Bold"),
      ),
    ) + 10;

  const drawHeader = (yy) => {
    const h = headerHeight();
    doc.save().rect(x0, yy, totalW, h).fill(C.primary).restore();
    doc.font("Helvetica-Bold").fontSize(fontSize).fillColor(C.white);
    let x = x0;
    for (const col of columns) {
      doc.text(col.label, x + PAD, yy + 5, {
        width: col.width - PAD * 2,
        align: col.align || "left",
      });
      x += col.width;
    }
    return yy + h;
  };

  const newPage = () => {
    doc.addPage();
    return doc.page.margins.top;
  };

  let cursor = y;
  if (cursor + headerHeight() + 26 > bottomLimit(doc)) cursor = newPage();
  cursor = drawHeader(cursor);

  let zebra = false;

  for (const row of rows) {
    if (row.band) {
      const bandH = 20;
      // keep the band together with at least one data row
      if (cursor + bandH + 22 > bottomLimit(doc)) {
        cursor = drawHeader(newPage());
      }
      doc.save().rect(x0, cursor, totalW, bandH).fill(C.band).restore();
      doc
        .font("Helvetica-Bold")
        .fontSize(fontSize + 1)
        .fillColor(C.primary)
        .text(row.band, x0 + PAD, cursor + 6, {
          width: totalW - PAD * 2,
          lineBreak: false,
        });
      cursor += bandH;
      zebra = false;
      continue;
    }

    const cells = row.cells.map(asCell);
    const heights = cells.map((cell, i) =>
      measure(cell.text, columns[i].width - PAD * 2, fontFor(cell)),
    );
    const rowH = Math.max(18, Math.max(...heights) + 8);

    if (cursor + rowH > bottomLimit(doc)) {
      cursor = drawHeader(newPage());
      zebra = false;
    }

    if (zebra) {
      doc.save().rect(x0, cursor, totalW, rowH).fill(C.zebra).restore();
    }
    zebra = !zebra;

    let x = x0;
    cells.forEach((cell, i) => {
      const col = columns[i];
      if (cell.fill) {
        doc.save().rect(x, cursor, col.width, rowH).fill(cell.fill).restore();
      }
      doc
        .font(fontFor(cell))
        .fontSize(fontSize)
        .fillColor(cell.color || C.text)
        .text(String(cell.text ?? ""), x + PAD, cursor + 4, {
          width: col.width - PAD * 2,
          align: col.align || "left",
        });
      x += col.width;
    });

    // grid lines
    doc.save().lineWidth(0.5).strokeColor(C.border);
    doc
      .moveTo(x0, cursor + rowH)
      .lineTo(x0 + totalW, cursor + rowH)
      .stroke();
    let vx = x0;
    for (const col of columns) {
      doc
        .moveTo(vx, cursor)
        .lineTo(vx, cursor + rowH)
        .stroke();
      vx += col.width;
    }
    doc
      .moveTo(vx, cursor)
      .lineTo(vx, cursor + rowH)
      .stroke();
    doc.restore();

    cursor += rowH;
  }

  return cursor;
};

const drawHeading = (doc, text, y) => {
  if (y + 70 > bottomLimit(doc)) {
    doc.addPage();
    y = doc.page.margins.top;
  }
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(C.primary)
    .text(text, doc.page.margins.left, y, { lineBreak: false });
  return y + 18;
};

const drawNote = (doc, text, y) => {
  const width = contentWidth(doc);
  doc.font("Helvetica").fontSize(8).fillColor(C.muted);
  doc.text(text, doc.page.margins.left, y, { width });
  return y + doc.heightOfString(text, { width }) + 8;
};

// ------------------------------------------------------------------
// Compact title block (top of the first page)
// ------------------------------------------------------------------

const drawHeader = (doc, model) => {
  const { period, store, scope, sections } = model;
  const x0 = doc.page.margins.left;
  const W = contentWidth(doc);
  let y = doc.page.margins.top;

  doc.save().rect(x0, y, W, 46).fill(C.primary).restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(C.white)
    .text("Competitor Price Audit Report", x0 + 14, y + 8, {
      width: W - 28,
      lineBreak: false,
    });
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#D6E2F0")
    .text(
      `${period.name}  |  ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
      x0 + 14,
      y + 28,
      { width: W - 28, lineBreak: false },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(C.white)
    .text(sections.map((s) => s.label).join(" + "), x0 + 14, y + 10, {
      width: W - 28,
      align: "right",
      lineBreak: false,
    });
  y += 54;

  const scopeText =
    scope === "STORE"
      ? `${store.name}${store.competitorName ? ` - ${store.competitorName}` : ""}`
      : "All competitors";
  y = drawNote(
    doc,
    `Scope: ${scopeText}   |   Generated: ${formatDateTime(model.generatedAt)}   |   By: ${model.generatedBy || "System"}`,
    y,
  );
  return y;
};

// ------------------------------------------------------------------
// Price comparison matrix (products x competitors)
// ------------------------------------------------------------------

const matrixCell = (record, column) => {
  if (record === undefined) return { text: "" };
  if (record === null) return { text: "Missing", color: C.muted, italic: true };

  if (column.kind === "QUEENS") {
    return {
      text: formatPrice(record.price),
      bold: true,
      color: C.primary,
      fill: C.queens,
    };
  }

  if (record.availability === "AVAILABLE") {
    return { text: formatPrice(record.price) };
  }
  if (record.availability === "OUT_OF_STOCK") {
    return { text: "Out of stock", color: C.red };
  }
  return { text: "Not found", color: C.amber };
};

const drawMatrixSection = (doc, section, startY = null) => {
  const W = contentWidth(doc);
  const { columns, categories } = section;

  const chunks = [];
  for (let i = 0; i < columns.length; i += MAX_COLUMNS_PER_PAGE) {
    chunks.push(columns.slice(i, i + MAX_COLUMNS_PER_PAGE));
  }

  chunks.forEach((chunk, chunkIndex) => {
    let y;
    if (chunkIndex === 0 && startY !== null) {
      y = startY; // first table continues right under the title block
    } else {
      doc.addPage();
      y = doc.page.margins.top;
    }

    const base = `${section.label} - Price Comparison by Category`;
    const title =
      chunks.length > 1
        ? `${base} (part ${chunkIndex + 1} of ${chunks.length})`
        : base;
    y = drawHeading(doc, title, y);

    const hasQueens = columns.some((c) => c.kind === "QUEENS");
    y = drawNote(
      doc,
      `Prices in ${CURRENCY}. Green = lowest competitor price in the row. ` +
        (hasQueens
          ? "Queens Price = current price from the price list. "
          : "") +
        `"Missing" = assigned but not recorded. Blank = no data.`,
      y,
    );

    const noW = 26;
    const codeW = 86;
    const colW = Math.min(
      110,
      Math.max(70, (W - noW - codeW - 200) / chunk.length),
    );
    const nameW = W - noW - codeW - colW * chunk.length;

    const tableColumns = [
      { label: "No.", width: noW, align: "center" },
      { label: "Item Code", width: codeW },
      { label: "Article Name", width: nameW },
      ...chunk.map((c) => ({
        label: columnHeaderLabel(c),
        width: colW,
        align: "center",
      })),
    ];

    const rows = [];
    let counter = 0;
    for (const category of categories) {
      rows.push({ band: category.name });
      for (const product of category.products) {
        counter += 1;

        const prices = chunk
          .filter((c) => c.kind === "COMPETITOR")
          .map((c) => product.cells[c.key])
          .filter(
            (r) => r && r.availability === "AVAILABLE" && r.price !== null,
          )
          .map((r) => r.price);
        const lowest = prices.length > 1 ? Math.min(...prices) : null;

        const cells = chunk.map((c) => {
          const record = product.cells[c.key];
          const cell = matrixCell(record, c);
          if (
            c.kind === "COMPETITOR" &&
            lowest !== null &&
            record &&
            record.availability === "AVAILABLE" &&
            record.price === lowest
          ) {
            return { ...cell, bold: true, color: C.green };
          }
          return cell;
        });

        rows.push({
          cells: [
            { text: String(counter), color: C.muted },
            product.code,
            product.name,
            ...cells,
          ],
        });
      }
    }

    drawTable(doc, { columns: tableColumns, rows, y });
  });
};

// ------------------------------------------------------------------
// Footer on every page
// ------------------------------------------------------------------

const drawFooters = (doc, model) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const { left, right, bottom } = doc.page.margins;
    const width = doc.page.width - left - right;
    const y = doc.page.height - bottom + 16;

    // avoid pdfkit auto-adding a page when writing inside the bottom margin
    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc.save().lineWidth(0.5).strokeColor(C.border);
    doc
      .moveTo(left, y - 6)
      .lineTo(left + width, y - 6)
      .stroke();
    doc.restore();

    doc.font("Helvetica").fontSize(8).fillColor(C.muted);
    doc.text(
      `Competitor Price Audit Report - ${model.period.name}${model.store ? ` - ${model.store.name}` : ""}`,
      left,
      y,
      { width: width * 0.6, align: "left", lineBreak: false },
    );
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, left, y, {
      width,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = originalBottom;
  }
};

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

export const buildObservationReportPdf = (model) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margins: { top: 40, bottom: 44, left: 36, right: 36 },
        bufferPages: true,
        info: {
          Title: `Competitor Price Audit Report - ${model.period.name}`,
          Subject: `${model.sections.map((s) => s.label).join(" + ")}${
            model.store ? ` - ${model.store.name}` : ""
          }`,
          Creator: "Price Intelligence",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const startY = drawHeader(doc, model);

      model.sections.forEach((section, index) => {
        drawMatrixSection(doc, section, index === 0 ? startY : null);
      });

      drawFooters(doc, model);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
