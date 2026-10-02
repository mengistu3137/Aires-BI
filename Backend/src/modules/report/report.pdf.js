import PDFDocument from "pdfkit";
import {
  CURRENCY,
  AVAILABILITY_LABELS,
  REVIEW_LABELS,
  formatDate,
  formatDateTime,
  formatPrice,
  storeHeaderLabel,
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
};

const PAD = 4;
const MAX_STORE_COLUMNS = 7;

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
// Page 1: summary
// ------------------------------------------------------------------

const drawKpiCards = (doc, y, cards) => {
  const x0 = doc.page.margins.left;
  const gap = 8;
  const w = (contentWidth(doc) - gap * (cards.length - 1)) / cards.length;
  const h = 54;

  cards.forEach((card, i) => {
    const x = x0 + i * (w + gap);
    doc.save().roundedRect(x, y, w, h, 4).fill(C.card).restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(card.color || C.primary)
      .text(String(card.value), x, y + 10, {
        width: w,
        align: "center",
        lineBreak: false,
      });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(C.muted)
      .text(card.label, x, y + 36, {
        width: w,
        align: "center",
        lineBreak: false,
      });
  });

  return y + h + 12;
};

const boldRow = (values, aligns) => ({
  cells: values.map((text) => ({ text, bold: true })),
  aligns,
});

const drawCover = (doc, model) => {
  const { period, store, summary, scope } = model;
  const t = summary.totals;
  const x0 = doc.page.margins.left;
  const W = contentWidth(doc);
  let y = doc.page.margins.top;

  // Title bar
  doc.save().rect(x0, y, W, 56).fill(C.primary).restore();
  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(C.white)
    .text("Competitor Price Audit Report", x0 + 14, y + 10, {
      width: W - 28,
      lineBreak: false,
    });
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor("#D6E2F0")
    .text(
      `${period.name}  |  ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
      x0 + 14,
      y + 36,
      { width: W - 28, lineBreak: false },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(C.white)
    .text(
      scope === "STORE" ? "STORE REPORT" : "ALL STORES - BY CATEGORY",
      x0 + 14,
      y + 14,
      { width: W - 28, align: "right", lineBreak: false },
    );
  y += 70;

  // Info row
  const info = [
    ["SURVEY PERIOD", `${period.name} (${period.status})`],
    [
      "SCOPE",
      scope === "STORE"
        ? `${store.name}${store.competitorName ? ` - ${store.competitorName}` : ""}`
        : `All stores (${t.stores})`,
    ],
    ["GENERATED", formatDateTime(model.generatedAt)],
    ["GENERATED BY", model.generatedBy || "System"],
  ];
  const colW = W / info.length;
  info.forEach(([label, value], i) => {
    const x = x0 + i * colW;
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(C.muted)
      .text(label, x, y, { width: colW - 10, lineBreak: false });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(C.text)
      .text(value, x, y + 11, { width: colW - 10, height: 26, ellipsis: true });
  });
  y += 46;

  // KPI cards
  y = drawKpiCards(doc, y, [
    { label: "Items to price", value: t.items },
    { label: "Recorded", value: t.recorded },
    { label: "Available", value: t.available, color: C.green },
    { label: "Out of stock", value: t.outOfStock, color: C.red },
    { label: "Not found", value: t.notFound, color: C.amber },
    { label: "Missing", value: t.missing, color: C.muted },
    { label: "Coverage", value: `${t.coveragePct}%` },
  ]);

  // Secondary facts
  const r = summary.review;
  const facts =
    `Stores covered: ${t.stores}   |   Products: ${t.products}   |   ` +
    `Duplicate observations resolved: ${t.duplicatesResolved}   |   ` +
    `Review status - Approved: ${r.APPROVED}, Pending: ${r.PENDING}, Needs review: ${r.NEEDS_REVIEW}`;
  y = drawNote(doc, facts, y);

  if (scope === "STORE" && summary.priceRange) {
    const { lowest, highest } = summary.priceRange;
    y = drawNote(
      doc,
      `Lowest price: ${lowest.product} - ${formatPrice(lowest.price)} ${CURRENCY}   |   ` +
        `Highest price: ${highest.product} - ${formatPrice(highest.price)} ${CURRENCY}`,
      y,
    );
  }

  y = drawNote(
    doc,
    "Rejected observations and cancelled audits are excluded. When a product has several observations " +
      "for the same store in this survey period, the AVAILABLE one is reported (then approved, then most recent).",
    y,
  );

  // By category
  y = drawHeading(doc, "Summary by Category", y + 2);
  const catColumns = [
    { label: "Category", width: 0 },
    { label: "Products", width: 60, align: "right" },
    { label: "Items", width: 56, align: "right" },
    { label: "Recorded", width: 64, align: "right" },
    { label: "Available", width: 64, align: "right" },
    { label: "Out of stock", width: 72, align: "right" },
    { label: "Not found", width: 64, align: "right" },
    { label: "Missing", width: 58, align: "right" },
    { label: "Coverage", width: 64, align: "right" },
  ];
  catColumns[0].width =
    W - catColumns.slice(1).reduce((s, c) => s + c.width, 0);

  const catRows = summary.byCategory.map((c) => ({
    cells: [
      c.category,
      c.products,
      c.items,
      c.recorded,
      c.available,
      c.outOfStock,
      c.notFound,
      c.missing,
      `${c.coveragePct}%`,
    ].map(String),
  }));
  catRows.push(
    boldRow(
      [
        "Total",
        t.products,
        t.items,
        t.recorded,
        t.available,
        t.outOfStock,
        t.notFound,
        t.missing,
        `${t.coveragePct}%`,
      ].map(String),
    ),
  );
  y = drawTable(doc, { columns: catColumns, rows: catRows, y });

  // By store (all-stores report only)
  if (scope === "ALL_STORES") {
    y = drawHeading(doc, "Summary by Store", y + 14);
    const storeColumns = [
      { label: "Store", width: 0 },
      { label: "Competitor", width: 150 },
      { label: "Items", width: 56, align: "right" },
      { label: "Recorded", width: 64, align: "right" },
      { label: "Available", width: 64, align: "right" },
      { label: "Out of stock", width: 72, align: "right" },
      { label: "Not found", width: 64, align: "right" },
      { label: "Missing", width: 58, align: "right" },
      { label: "Coverage", width: 64, align: "right" },
    ];
    storeColumns[0].width =
      W - storeColumns.slice(1).reduce((s, c) => s + c.width, 0);

    const storeRows = summary.byStore.map((s) => ({
      cells: [
        s.store,
        s.competitor,
        s.items,
        s.recorded,
        s.available,
        s.outOfStock,
        s.notFound,
        s.missing,
        `${s.coveragePct}%`,
      ].map(String),
    }));
    y = drawTable(doc, { columns: storeColumns, rows: storeRows, y });
  }

  return y;
};

// ------------------------------------------------------------------
// Data pages
// ------------------------------------------------------------------

const matrixCell = (record) => {
  if (record === undefined) return { text: "-", color: C.muted };
  if (record === null) return { text: "Missing", color: C.muted, italic: true };
  if (record.availability === "AVAILABLE") {
    return { text: formatPrice(record.price) };
  }
  if (record.availability === "OUT_OF_STOCK") {
    return { text: "Out of stock", color: C.red };
  }
  return { text: "Not found", color: C.amber };
};

/** All-stores report: matrix of products x stores, grouped by category. */
const drawMatrixSection = (doc, model) => {
  const W = contentWidth(doc);
  const { stores, categories } = model;

  const chunks = [];
  for (let i = 0; i < stores.length; i += MAX_STORE_COLUMNS) {
    chunks.push(stores.slice(i, i + MAX_STORE_COLUMNS));
  }

  chunks.forEach((chunk, chunkIndex) => {
    doc.addPage();
    let y = doc.page.margins.top;

    const title =
      chunks.length > 1
        ? `Price Comparison by Category (stores ${chunkIndex * MAX_STORE_COLUMNS + 1}-${chunkIndex * MAX_STORE_COLUMNS + chunk.length} of ${stores.length})`
        : "Price Comparison by Category";
    y = drawHeading(doc, title, y);
    y = drawNote(
      doc,
      `Prices in ${CURRENCY}. Green = lowest price in the row. "Missing" = assigned but not recorded. "-" = not on that store's checklist.`,
      y,
    );

    const noW = 26;
    const codeW = 86;
    const storeW = Math.min(
      100,
      Math.max(60, (W - noW - codeW - 200) / chunk.length),
    );
    const nameW = W - noW - codeW - storeW * chunk.length;

    const columns = [
      { label: "No.", width: noW, align: "center" },
      { label: "Item Code", width: codeW },
      { label: "Article Name", width: nameW },
      ...chunk.map((s) => ({
        label: storeHeaderLabel(s),
        width: storeW,
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
          .map((s) => product.cells[s.id])
          .filter(
            (r) => r && r.availability === "AVAILABLE" && r.price !== null,
          )
          .map((r) => r.price);
        const lowest = prices.length > 1 ? Math.min(...prices) : null;

        const cells = chunk.map((s) => {
          const record = product.cells[s.id];
          const cell = matrixCell(record);
          if (
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

    drawTable(doc, { columns, rows, y });
  });
};

/** Single-store report: one line per product, grouped by category. */
const drawStoreSection = (doc, model) => {
  const W = contentWidth(doc);
  const storeId = model.store.id;

  doc.addPage();
  let y = doc.page.margins.top;
  y = drawHeading(doc, `Price Observations - ${model.store.name}`, y);
  y = drawNote(
    doc,
    `Prices in ${CURRENCY}. "Not recorded" = assigned to this store but no observation was captured.`,
    y,
  );

  const fixed = {
    no: 26,
    code: 92,
    pack: 84,
    avail: 84,
    price: 76,
    review: 82,
    captured: 104,
  };
  const nameW = W - Object.values(fixed).reduce((sum, width) => sum + width, 0);

  const columns = [
    { label: "No.", width: fixed.no, align: "center" },
    { label: "Item Code", width: fixed.code },
    { label: "Article Name", width: nameW },
    { label: "Unit / Pack", width: fixed.pack },
    { label: "Availability", width: fixed.avail },
    { label: `Price (${CURRENCY})`, width: fixed.price, align: "right" },
    { label: "Review", width: fixed.review },
    { label: "Captured", width: fixed.captured },
  ];

  const rows = [];
  let counter = 0;
  for (const category of model.categories) {
    rows.push({ band: category.name });
    for (const product of category.products) {
      const record = product.cells[storeId];
      if (record === undefined) continue;
      counter += 1;

      if (record === null) {
        rows.push({
          cells: [
            { text: String(counter), color: C.muted },
            product.code,
            product.name,
            product.unit,
            { text: "Not recorded", color: C.muted, italic: true },
            "",
            "",
            "",
          ],
        });
        continue;
      }

      const availColor =
        record.availability === "AVAILABLE"
          ? C.green
          : record.availability === "OUT_OF_STOCK"
            ? C.red
            : C.amber;

      const pack =
        [record.packageSize, record.observedUnit || product.unit]
          .filter(Boolean)
          .join(" / ") || product.unit;

      rows.push({
        cells: [
          { text: String(counter), color: C.muted },
          product.code,
          product.name,
          pack,
          { text: AVAILABILITY_LABELS[record.availability], color: availColor },
          record.availability === "AVAILABLE"
            ? { text: formatPrice(record.price), bold: true }
            : "",
          REVIEW_LABELS[record.reviewStatus] || record.reviewStatus,
          formatDateTime(record.capturedAt),
        ],
      });
    }
  }

  drawTable(doc, { columns, rows, y });
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
          Subject: model.store
            ? `Store report: ${model.store.name}`
            : "All stores report by category",
          Creator: "Price Intelligence",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      drawCover(doc, model);

      if (model.scope === "STORE") drawStoreSection(doc, model);
      else drawMatrixSection(doc, model);

      drawFooters(doc, model);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
