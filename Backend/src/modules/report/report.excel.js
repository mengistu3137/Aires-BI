import ExcelJS from "exceljs";
import {
  CURRENCY,
  AVAILABILITY_LABELS,
  REVIEW_LABELS,
  formatDate,
  formatDateTime,
  formatPrice,
  columnHeaderLabel,
} from "./report.utils.js";

// ------------------------------------------------------------------
// Styling constants (ARGB, same palette as the PDF report)
// ------------------------------------------------------------------

const C = {
  primary: "FF1F3A5F",
  text: "FF1F2937",
  muted: "FF6B7280",
  border: "FFD1D5DB",
  zebra: "FFF5F7FA",
  band: "FFE3EAF3",
  card: "FFF3F6FA",
  white: "FFFFFFFF",
  green: "FF2E7D32",
  red: "FFB42318",
  amber: "FFB54708",
  subtitle: "FFD6E2F0",
  queens: "FFE8F0FA",
  lowest: "FFE8F5E9",
};

const FONT = "Calibri";
const PRICE_FORMAT = "#,##0.00";
const PCT_FORMAT = "0.0%";

const thinBorder = {
  top: { style: "thin", color: { argb: C.border } },
  left: { style: "thin", color: { argb: C.border } },
  bottom: { style: "thin", color: { argb: C.border } },
  right: { style: "thin", color: { argb: C.border } },
};

const fill = (argb) => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

const font = (opts = {}) => ({
  name: FONT,
  size: 10,
  color: { argb: C.text },
  ...opts,
});

// Excel sheet names: max 31 chars, no : \ / ? * [ ]
const safeSheetName = (name) =>
  String(name)
    .replace(/[:\\/?*[\]]/g, " ")
    .slice(0, 31);

// ------------------------------------------------------------------
// Generic helpers
// ------------------------------------------------------------------

const colLetter = (index) => {
  // 1 -> A, 27 -> AA
  let n = index;
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const setPageSetup = (sheet, { landscape = true } = {}) => {
  sheet.pageSetup = {
    paperSize: 9, // A4
    orientation: landscape ? "landscape" : "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.4,
      right: 0.4,
      top: 0.5,
      bottom: 0.5,
      header: 0.3,
      footer: 0.3,
    },
  };
  sheet.headerFooter = {
    oddFooter: "&L&8Competitor Price Audit Report&R&8Page &P of &N",
  };
};

/** Full-width title bar (row `rowNumber`, merged across `colCount` columns). */
const addTitleBar = (sheet, rowNumber, colCount, title, subtitle, tag) => {
  const lastCol = colLetter(colCount);

  sheet.mergeCells(`A${rowNumber}:${lastCol}${rowNumber}`);
  const titleCell = sheet.getCell(`A${rowNumber}`);
  titleCell.value = title;
  titleCell.font = font({ size: 18, bold: true, color: { argb: C.white } });
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(rowNumber).height = 30;

  sheet.mergeCells(`A${rowNumber + 1}:${lastCol}${rowNumber + 1}`);
  const subCell = sheet.getCell(`A${rowNumber + 1}`);
  subCell.value = subtitle;
  subCell.font = font({ size: 10, color: { argb: C.subtitle } });
  subCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(rowNumber + 1).height = 20;

  for (let r = rowNumber; r <= rowNumber + 1; r += 1) {
    for (let c = 1; c <= colCount; c += 1) {
      sheet.getRow(r).getCell(c).fill = fill(C.primary);
    }
  }

  if (tag && colCount >= 4) {
    // Subtitle keeps the left part of the row, the tag goes in the last two columns
    sheet.unMergeCells(`A${rowNumber + 1}:${lastCol}${rowNumber + 1}`);
    sheet.mergeCells(
      `A${rowNumber + 1}:${colLetter(colCount - 2)}${rowNumber + 1}`,
    );
    sheet.mergeCells(
      `${colLetter(colCount - 1)}${rowNumber + 1}:${lastCol}${rowNumber + 1}`,
    );
    const left = sheet.getCell(`A${rowNumber + 1}`);
    left.value = subtitle;
    left.font = font({ size: 10, color: { argb: C.subtitle } });
    left.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    left.fill = fill(C.primary);

    const right = sheet.getCell(`${colLetter(colCount - 1)}${rowNumber + 1}`);
    right.value = tag;
    right.font = font({ size: 9, bold: true, color: { argb: C.white } });
    right.alignment = { vertical: "middle", horizontal: "right", indent: 1 };
    right.fill = fill(C.primary);
  }
};

const addSectionHeading = (sheet, rowNumber, text) => {
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.font = font({ size: 12, bold: true, color: { argb: C.primary } });
  cell.alignment = { vertical: "middle" };
  sheet.getRow(rowNumber).height = 20;
};

const addNote = (sheet, rowNumber, colCount, text, height = 30) => {
  sheet.mergeCells(`A${rowNumber}:${colLetter(colCount)}${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.font = font({ size: 9, color: { argb: C.muted } });
  cell.alignment = { vertical: "top", wrapText: true };
  sheet.getRow(rowNumber).height = height;
};

const styleHeaderRow = (row, colCount, aligns = []) => {
  row.height = 32;
  for (let c = 1; c <= colCount; c += 1) {
    const cell = row.getCell(c);
    cell.font = font({ bold: true, color: { argb: C.white } });
    cell.fill = fill(C.primary);
    cell.border = thinBorder;
    cell.alignment = {
      vertical: "middle",
      horizontal: aligns[c - 1] || "left",
      wrapText: true,
    };
  }
};

const styleBandRow = (sheet, rowNumber, colCount, text) => {
  sheet.mergeCells(`A${rowNumber}:${colLetter(colCount)}${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.font = font({ size: 11, bold: true, color: { argb: C.primary } });
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(rowNumber).height = 20;
  for (let c = 1; c <= colCount; c += 1) {
    const rc = sheet.getRow(rowNumber).getCell(c);
    rc.fill = fill(C.band);
    rc.border = thinBorder;
  }
};

const styleDataCell = (
  cell,
  { align = "left", zebra = false, wrap = true } = {},
) => {
  cell.font = font();
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: align, wrapText: wrap };
  if (zebra) cell.fill = fill(C.zebra);
};

const availabilityColor = (availability) => {
  if (availability === "AVAILABLE") return C.green;
  if (availability === "OUT_OF_STOCK") return C.red;
  return C.amber;
};

// ------------------------------------------------------------------
// Sheet 1: Summary (info + one block per report type)
// ------------------------------------------------------------------

const SUMMARY_COLS = 9;
const NUMERIC_ALIGNS = [
  "left",
  "right",
  "right",
  "right",
  "right",
  "right",
  "right",
  "right",
  "right",
];

const writeKpis = (sheet, r, t) => {
  const kpis = [
    { label: "Items to price", value: t.items },
    { label: "Recorded", value: t.recorded },
    { label: "Available", value: t.available, color: C.green },
    { label: "Out of stock", value: t.outOfStock, color: C.red },
    { label: "Not found", value: t.notFound, color: C.amber },
    { label: "Missing", value: t.missing, color: C.muted },
    { label: "Coverage", value: t.coveragePct / 100, pct: true },
  ];

  // KPI cards occupy columns B..H; column A holds a row caption
  const caption = sheet.getCell(`A${r}`);
  caption.value = "KEY FIGURES";
  caption.font = font({ size: 8, bold: true, color: { argb: C.muted } });
  caption.alignment = { vertical: "middle" };

  kpis.forEach((kpi, i) => {
    const col = i + 2;
    const valueCell = sheet.getRow(r).getCell(col);
    valueCell.value = kpi.value;
    if (kpi.pct) valueCell.numFmt = PCT_FORMAT;
    valueCell.font = font({
      size: 16,
      bold: true,
      color: { argb: kpi.color || C.primary },
    });
    valueCell.alignment = { vertical: "middle", horizontal: "center" };
    valueCell.fill = fill(C.card);

    const labelCell = sheet.getRow(r + 1).getCell(col);
    labelCell.value = kpi.label;
    labelCell.font = font({ size: 8, color: { argb: C.muted } });
    labelCell.alignment = { vertical: "middle", horizontal: "center" };
    labelCell.fill = fill(C.card);
  });
  sheet.getRow(r).height = 28;
  sheet.getRow(r + 1).height = 16;
  return r + 3;
};

const writeMergedText = (sheet, r, text, height) => {
  sheet.mergeCells(`A${r}:I${r}`);
  const cell = sheet.getCell(`A${r}`);
  cell.value = text;
  cell.font = font({ size: 9, color: { argb: C.muted } });
  cell.alignment = { wrapText: true, vertical: "top" };
  sheet.getRow(r).height = height;
  return r + 1;
};

const writeSummaryTable = (sheet, r, { headers, rows, totalRow }) => {
  styleHeaderRow(sheet.getRow(r), headers.length, NUMERIC_ALIGNS);
  headers.forEach((h, i) => {
    sheet.getRow(r).getCell(i + 1).value = h;
  });
  r += 1;

  const writeRow = (values, { bold = false, zebra = false, band = false }) => {
    const row = sheet.getRow(r);
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value;
      styleDataCell(cell, {
        align: NUMERIC_ALIGNS[i] || "right",
        zebra,
        wrap: false,
      });
      if (bold) cell.font = font({ bold: true });
      if (band) cell.fill = fill(C.band);
      if (i === values.length - 1 && typeof value === "number") {
        cell.numFmt = PCT_FORMAT;
      }
    });
    row.height = 18;
    r += 1;
  };

  rows.forEach((values, i) => writeRow(values, { zebra: i % 2 === 1 }));
  if (totalRow) writeRow(totalRow, { bold: true, band: true });
  return r;
};

const buildSummarySheet = (workbook, model) => {
  const { period, store, scope, sections } = model;

  const sheet = workbook.addWorksheet("Summary", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: C.primary } },
  });

  sheet.columns = [
    { width: 34 },
    { width: 18 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
  ];

  let r = 1;
  addTitleBar(
    sheet,
    r,
    SUMMARY_COLS,
    "Competitor Price Audit Report",
    `${period.name}  |  ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
    scope === "STORE" ? "STORE REPORT" : "BY COMPETITOR",
  );
  r += 3;

  // Info block (label / value pairs)
  const info = [
    ["Survey period", `${period.name} (${period.status})`],
    [
      "Scope",
      scope === "STORE"
        ? `${store.name}${store.competitorName ? ` - ${store.competitorName}` : ""}`
        : "All competitors",
    ],
    ["Report", sections.map((s) => s.label).join(" + ")],
    ["Generated", formatDateTime(model.generatedAt)],
    ["Generated by", model.generatedBy || "System"],
  ];
  for (const [label, value] of info) {
    const labelCell = sheet.getCell(`A${r}`);
    labelCell.value = label.toUpperCase();
    labelCell.font = font({ size: 8, bold: true, color: { argb: C.muted } });
    labelCell.alignment = { vertical: "middle" };

    sheet.mergeCells(`B${r}:E${r}`);
    const valueCell = sheet.getCell(`B${r}`);
    valueCell.value = value;
    valueCell.font = font({ size: 10 });
    valueCell.alignment = { vertical: "middle", horizontal: "left" };
    sheet.getRow(r).height = 18;
    r += 1;
  }
  r += 1;

  addNote(
    sheet,
    r,
    SUMMARY_COLS,
    "Rejected observations and cancelled audits are excluded. Each competitor column combines all of its stores: " +
      "when a product has several observations, the AVAILABLE one is reported (then approved, then most recent). " +
      "Queens Price is the current price from the Queens price list.",
    30,
  );
  r += 2;

  for (const section of sections) {
    const { summary } = section;
    const t = summary.totals;

    styleBandRow(
      sheet,
      r,
      SUMMARY_COLS,
      `${section.label} - ${section.description}`,
    );
    r += 2;

    r = writeKpis(sheet, r, t);

    const rev = summary.review;
    let facts =
      `Competitors: ${t.competitors}   |   Stores covered: ${t.stores}   |   Products: ${t.products}   |   ` +
      `Duplicate observations resolved: ${t.duplicatesResolved}   |   ` +
      `Review status - Approved: ${rev.APPROVED}, Pending: ${rev.PENDING}, Needs review: ${rev.NEEDS_REVIEW}`;
    if (summary.queens) {
      facts += `   |   Queens Price found for ${summary.queens.priced} of ${summary.queens.products} products`;
    }
    r = writeMergedText(sheet, r, facts, 28);

    if (summary.priceRange) {
      const { lowest, highest } = summary.priceRange;
      r = writeMergedText(
        sheet,
        r,
        `Lowest competitor price: ${lowest.product} (${lowest.competitor}) - ${formatPrice(lowest.price)} ${CURRENCY}   |   ` +
          `Highest competitor price: ${highest.product} (${highest.competitor}) - ${formatPrice(highest.price)} ${CURRENCY}`,
        18,
      );
    }
    r += 1;

    // ---- Summary by category ----
    addSectionHeading(sheet, r, "Summary by Category");
    r += 1;
    r = writeSummaryTable(sheet, r, {
      headers: [
        "Category",
        "Products",
        "Items",
        "Recorded",
        "Available",
        "Out of stock",
        "Not found",
        "Missing",
        "Coverage",
      ],
      rows: summary.byCategory.map((c) => [
        c.category,
        c.products,
        c.items,
        c.recorded,
        c.available,
        c.outOfStock,
        c.notFound,
        c.missing,
        c.coveragePct / 100,
      ]),
      totalRow: [
        "Total",
        t.products,
        t.items,
        t.recorded,
        t.available,
        t.outOfStock,
        t.notFound,
        t.missing,
        t.coveragePct / 100,
      ],
    });

    // ---- Summary by competitor (no data -> blank) ----
    r += 2;
    addSectionHeading(sheet, r, "Summary by Competitor");
    r += 1;
    r = writeSummaryTable(sheet, r, {
      headers: [
        "Competitor",
        "Stores",
        "Items",
        "Recorded",
        "Available",
        "Out of stock",
        "Not found",
        "Missing",
        "Coverage",
      ],
      rows: summary.byCompetitor.map((c) =>
        c.items === 0
          ? [c.competitor, "", "", "", "", "", "", "", ""]
          : [
              c.competitor,
              c.stores,
              c.items,
              c.recorded,
              c.available,
              c.outOfStock,
              c.notFound,
              c.missing,
              c.coveragePct / 100,
            ],
      ),
    });

    r += 3;
  }

  setPageSetup(sheet, { landscape: true });
  return sheet;
};

// ------------------------------------------------------------------
// Sheet per report type: price comparison matrix (products x competitors)
// ------------------------------------------------------------------

/** Writes one matrix cell. Returns true when the cell got its own fill. */
const writeMatrixCell = (cell, record, column, isLowest) => {
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.font = font();

  if (record === undefined) {
    cell.value = null; // no data -> blank
    return false;
  }
  if (record === null) {
    cell.value = "Missing";
    cell.font = font({ italic: true, color: { argb: C.muted } });
    return false;
  }

  if (column.kind === "QUEENS") {
    cell.value = record.price;
    cell.numFmt = PRICE_FORMAT;
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.font = font({ bold: true, color: { argb: C.primary } });
    cell.fill = fill(C.queens);
    return true;
  }

  if (record.availability === "AVAILABLE") {
    if (record.price === null) {
      cell.value = AVAILABILITY_LABELS.AVAILABLE;
      cell.font = font({ color: { argb: C.green } });
      return false;
    }
    cell.value = record.price;
    cell.numFmt = PRICE_FORMAT;
    cell.alignment = { vertical: "middle", horizontal: "right" };
    if (isLowest) {
      cell.font = font({ bold: true, color: { argb: C.green } });
      cell.fill = fill(C.lowest);
      return true;
    }
    return false;
  }
  if (record.availability === "OUT_OF_STOCK") {
    cell.value = AVAILABILITY_LABELS.OUT_OF_STOCK;
    cell.font = font({ color: { argb: C.red } });
    return false;
  }
  cell.value = AVAILABILITY_LABELS.NOT_FOUND;
  cell.font = font({ color: { argb: C.amber } });
  return false;
};

const buildMatrixSheet = (workbook, model, section) => {
  const { columns, categories } = section;
  const { period } = model;
  const FIXED = 4; // No., Item Code, Article Name, Unit
  const colCount = FIXED + columns.length;
  const barCols = Math.max(colCount, 5);

  const sheet = workbook.addWorksheet(
    safeSheetName(`${section.label} Prices`),
    {
      views: [{ showGridLines: false }],
      properties: { tabColor: { argb: C.green } },
    },
  );

  sheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 42 },
    { width: 10 },
    ...columns.map(() => ({ width: 20 })),
  ];

  addTitleBar(
    sheet,
    1,
    barCols,
    `${section.label} - Price Comparison by Category`,
    `${period.name}  |  Prices in ${CURRENCY}`,
    null,
  );

  const hasQueens = columns.some((c) => c.kind === "QUEENS");
  addNote(
    sheet,
    3,
    barCols,
    `Prices in ${CURRENCY}. Green = lowest competitor price in the row. ` +
      (hasQueens ? "Queens Price = current price from the price list. " : "") +
      `"Missing" = assigned but not recorded. Blank = no data.`,
    18,
  );

  const HEADER_ROW = 5;
  const headerRow = sheet.getRow(HEADER_ROW);
  const headers = [
    "No.",
    "Item Code",
    "Article Name",
    "Unit",
    ...columns.map((c) => columnHeaderLabel(c)),
  ];
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  styleHeaderRow(
    headerRow,
    colCount,
    headers.map((_, i) => (i === 0 || i >= FIXED ? "center" : "left")),
  );
  headerRow.height = 44;

  let r = HEADER_ROW + 1;
  let counter = 0;

  for (const category of categories) {
    styleBandRow(sheet, r, colCount, category.name);
    r += 1;

    let zebra = false;
    for (const product of category.products) {
      counter += 1;

      const prices = columns
        .filter((c) => c.kind === "COMPETITOR")
        .map((c) => product.cells[c.key])
        .filter(
          (rec) =>
            rec && rec.availability === "AVAILABLE" && rec.price !== null,
        )
        .map((rec) => rec.price);
      const lowest = prices.length > 1 ? Math.min(...prices) : null;

      const row = sheet.getRow(r);

      const noCell = row.getCell(1);
      noCell.value = counter;
      styleDataCell(noCell, { align: "center", zebra });
      noCell.font = font({ color: { argb: C.muted } });

      const codeCell = row.getCell(2);
      codeCell.value = product.code;
      styleDataCell(codeCell, { zebra });

      const nameCell = row.getCell(3);
      nameCell.value = product.name;
      styleDataCell(nameCell, { zebra });

      const unitCell = row.getCell(4);
      unitCell.value = product.unit;
      styleDataCell(unitCell, { align: "center", zebra });

      columns.forEach((column, i) => {
        const cell = row.getCell(FIXED + i + 1);
        const record = product.cells[column.key];
        const isLowest =
          column.kind === "COMPETITOR" &&
          lowest !== null &&
          record &&
          record.availability === "AVAILABLE" &&
          record.price === lowest;
        const filled = writeMatrixCell(cell, record, column, isLowest);
        if (zebra && !filled) cell.fill = fill(C.zebra);
      });

      row.height = 18;
      zebra = !zebra;
      r += 1;
    }
  }

  sheet.views = [
    {
      showGridLines: false,
      state: "frozen",
      xSplit: 3,
      ySplit: HEADER_ROW,
    },
  ];
  setPageSetup(sheet, { landscape: true });
  sheet.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  return sheet;
};

// ------------------------------------------------------------------
// Last sheet: flat observation details (filterable)
// ------------------------------------------------------------------

const buildDetailsSheet = (workbook, model) => {
  const sheet = workbook.addWorksheet("Observation Details", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: C.muted } },
  });

  const columns = [
    { header: "Report", key: "report", width: 16, align: "left" },
    { header: "Competitor", key: "competitor", width: 20, align: "left" },
    { header: "Store", key: "store", width: 28, align: "left" },
    { header: "City", key: "city", width: 16, align: "left" },
    { header: "Area", key: "area", width: 16, align: "left" },
    { header: "Category", key: "category", width: 22, align: "left" },
    { header: "Item Code", key: "code", width: 18, align: "left" },
    { header: "Article Name", key: "name", width: 40, align: "left" },
    { header: "Availability", key: "availability", width: 15, align: "left" },
    { header: `Price (${CURRENCY})`, key: "price", width: 14, align: "right" },
    { header: "Package size", key: "packageSize", width: 14, align: "left" },
    { header: "Unit", key: "unit", width: 12, align: "left" },
    { header: "Review status", key: "review", width: 15, align: "left" },
    { header: "Captured at", key: "capturedAt", width: 20, align: "left" },
    { header: "Auditor", key: "auditor", width: 20, align: "left" },
    {
      header: "Other observations",
      key: "alternatives",
      width: 12,
      align: "right",
    },
    { header: "Notes", key: "notes", width: 36, align: "left" },
  ];
  const priceCol = columns.findIndex((c) => c.key === "price") + 1;
  const availCol = columns.findIndex((c) => c.key === "availability") + 1;

  sheet.columns = columns.map((c) => ({ key: c.key, width: c.width }));

  const headerRow = sheet.getRow(1);
  columns.forEach((c, i) => {
    headerRow.getCell(i + 1).value = c.header;
  });
  styleHeaderRow(
    headerRow,
    columns.length,
    columns.map((c) => c.align),
  );

  const emptyData = (section, column, product, category) => ({
    report: section.label,
    competitor: column.label,
    store: "",
    city: "",
    area: "",
    category: category.name,
    code: product.code,
    name: product.name,
    availability: "",
    price: null,
    packageSize: "",
    unit: product.unit,
    review: "",
    capturedAt: "",
    auditor: "",
    alternatives: null,
    notes: "",
  });

  let rowIndex = 2;
  for (const section of model.sections) {
    for (const category of section.categories) {
      for (const product of category.products) {
        for (const column of section.columns) {
          const record = product.cells[column.key];
          if (record === undefined) continue;

          const base = emptyData(section, column, product, category);
          let data;
          let availabilityKey = null;

          if (record === null) {
            data = { ...base, availability: "Not recorded" };
          } else if (column.kind === "QUEENS") {
            data = {
              ...base,
              store: "Queens price list",
              availability: AVAILABILITY_LABELS.AVAILABLE,
              price: record.price,
              capturedAt: formatDateTime(record.effectiveFrom),
              notes:
                `Current price, effective from ${formatDate(record.effectiveFrom)}` +
                (record.source ? ` (${record.source})` : ""),
            };
            availabilityKey = "AVAILABLE";
          } else {
            data = {
              ...base,
              store: record.storeName,
              city: record.city ?? "",
              area: record.area ?? "",
              availability:
                AVAILABILITY_LABELS[record.availability] || record.availability,
              price: record.availability === "AVAILABLE" ? record.price : null,
              packageSize: record.packageSize ?? "",
              unit: record.observedUnit || product.unit,
              review: REVIEW_LABELS[record.reviewStatus] || record.reviewStatus,
              capturedAt: formatDateTime(record.capturedAt),
              auditor: record.auditorName,
              alternatives: record.alternativesCount,
              notes: record.notes || "",
            };
            availabilityKey = record.availability;
          }

          const row = sheet.getRow(rowIndex);
          const zebra = rowIndex % 2 === 1;

          columns.forEach((c, i) => {
            const cell = row.getCell(i + 1);
            cell.value = data[c.key];
            styleDataCell(cell, {
              align: c.align,
              zebra,
              wrap: c.key === "notes",
            });
          });

          row.getCell(priceCol).numFmt = PRICE_FORMAT;

          const availCell = row.getCell(availCol);
          if (availabilityKey === null) {
            availCell.font = font({ italic: true, color: { argb: C.muted } });
          } else {
            availCell.font = font({
              bold: true,
              color: { argb: availabilityColor(availabilityKey) },
            });
          }

          rowIndex += 1;
        }
      }
    }
  }

  sheet.views = [{ state: "frozen", ySplit: 1, showGridLines: true }];
  if (rowIndex > 2) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rowIndex - 1, column: columns.length },
    };
  }
  setPageSetup(sheet, { landscape: true });
  sheet.pageSetup.printTitlesRow = "1:1";
  return sheet;
};

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

/**
 * Builds the Excel report from the shared report model.
 * Sheets: Summary, one price-comparison sheet per report type, Observation Details.
 * Returns a Node Buffer containing the .xlsx file.
 */
export const buildObservationReportExcel = async (model) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = model.generatedBy || "Price Audit System";
  workbook.lastModifiedBy = model.generatedBy || "Price Audit System";
  workbook.created = new Date(model.generatedAt);
  workbook.modified = new Date(model.generatedAt);
  workbook.title = `Competitor Price Audit Report - ${model.period.name}`;
  workbook.subject = safeSheetName(model.period.name);

  buildSummarySheet(workbook, model);

  for (const section of model.sections) {
    buildMatrixSheet(workbook, model, section);
  }

  buildDetailsSheet(workbook, model);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
};
