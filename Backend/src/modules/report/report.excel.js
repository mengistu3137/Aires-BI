import ExcelJS from "exceljs";
import {
  CURRENCY,
  AVAILABILITY_LABELS,
  REVIEW_LABELS,
  formatDate,
  formatDateTime,
  formatPrice,
  storeHeaderLabel,
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

  if (tag) {
    // Tag text is shown in the last cell of the title row, right-aligned.
    // (Title cell is merged, so we un-merge the last column visually by
    //  placing the tag in the subtitle row instead.)
    const tagRow = sheet.getRow(rowNumber + 1);
    // Re-merge subtitle to leave the last 2 columns for the tag when possible
    if (colCount >= 4) {
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
      tagRow.height = 20;
    }
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

const packLabel = (record, product) =>
  [record.packageSize, record.observedUnit || product.unit]
    .filter(Boolean)
    .join(" / ") || product.unit;

// ------------------------------------------------------------------
// Sheet 1: Summary
// ------------------------------------------------------------------

const buildSummarySheet = (workbook, model) => {
  const { period, store, summary, scope } = model;
  const t = summary.totals;
  const COLS = 9;

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
    COLS,
    "Competitor Price Audit Report",
    `${period.name}  |  ${formatDate(period.startDate)} - ${formatDate(period.endDate)}`,
    scope === "STORE" ? "STORE REPORT" : "ALL STORES - BY CATEGORY",
  );
  r += 3;

  // Info block (label / value pairs)
  const info = [
    ["Survey period", `${period.name} (${period.status})`],
    [
      "Scope",
      scope === "STORE"
        ? `${store.name}${store.competitorName ? ` - ${store.competitorName}` : ""}`
        : `All stores (${t.stores})`,
    ],
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

  // KPI strip
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
  sheet.getCell(`A${r}`).value = "KEY FIGURES";
  sheet.getCell(`A${r}`).font = font({
    size: 8,
    bold: true,
    color: { argb: C.muted },
  });
  sheet.getCell(`A${r}`).alignment = { vertical: "middle" };
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
  r += 3;

  // Secondary facts
  const rev = summary.review;
  sheet.mergeCells(`A${r}:I${r}`);
  sheet.getCell(`A${r}`).value =
    `Stores covered: ${t.stores}   |   Products: ${t.products}   |   ` +
    `Duplicate observations resolved: ${t.duplicatesResolved}   |   ` +
    `Review status - Approved: ${rev.APPROVED}, Pending: ${rev.PENDING}, Needs review: ${rev.NEEDS_REVIEW}`;
  sheet.getCell(`A${r}`).font = font({ size: 9, color: { argb: C.muted } });
  sheet.getCell(`A${r}`).alignment = { wrapText: true, vertical: "top" };
  sheet.getRow(r).height = 28;
  r += 1;

  if (scope === "STORE" && summary.priceRange) {
    const { lowest, highest } = summary.priceRange;
    sheet.mergeCells(`A${r}:I${r}`);
    sheet.getCell(`A${r}`).value =
      `Lowest price: ${lowest.product} - ${formatPrice(lowest.price)} ${CURRENCY}   |   ` +
      `Highest price: ${highest.product} - ${formatPrice(highest.price)} ${CURRENCY}`;
    sheet.getCell(`A${r}`).font = font({ size: 9, color: { argb: C.muted } });
    sheet.getCell(`A${r}`).alignment = { wrapText: true, vertical: "top" };
    sheet.getRow(r).height = 18;
    r += 1;
  }

  addNote(
    sheet,
    r,
    COLS,
    "Rejected observations and cancelled audits are excluded. When a product has several observations " +
      "for the same store in this survey period, the AVAILABLE one is reported (then approved, then most recent).",
    30,
  );
  r += 2;

  // ---- Summary by category ----
  addSectionHeading(sheet, r, "Summary by Category");
  r += 1;

  const catHeaders = [
    "Category",
    "Products",
    "Items",
    "Recorded",
    "Available",
    "Out of stock",
    "Not found",
    "Missing",
    "Coverage",
  ];
  const numericAligns = [
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
  styleHeaderRow(sheet.getRow(r), catHeaders.length, numericAligns);
  catHeaders.forEach((h, i) => {
    sheet.getRow(r).getCell(i + 1).value = h;
  });
  r += 1;

  const writeSummaryRow = (values, { bold = false, zebra = false } = {}) => {
    const row = sheet.getRow(r);
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value;
      styleDataCell(cell, {
        align: numericAligns[i] || "right",
        zebra,
        wrap: false,
      });
      if (bold) cell.font = font({ bold: true });
      if (i === values.length - 1 && typeof value === "number") {
        cell.numFmt = PCT_FORMAT;
      }
    });
    row.height = 18;
    r += 1;
  };

  summary.byCategory.forEach((c, i) => {
    writeSummaryRow(
      [
        c.category,
        c.products,
        c.items,
        c.recorded,
        c.available,
        c.outOfStock,
        c.notFound,
        c.missing,
        c.coveragePct / 100,
      ],
      { zebra: i % 2 === 1 },
    );
  });
  writeSummaryRow(
    [
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
    { bold: true },
  );
  // Total row highlight
  for (let c = 1; c <= catHeaders.length; c += 1) {
    sheet.getRow(r - 1).getCell(c).fill = fill(C.band);
  }

  // ---- Summary by store (all-stores report only) ----
  if (scope === "ALL_STORES") {
    r += 2;
    addSectionHeading(sheet, r, "Summary by Store");
    r += 1;

    const storeHeaders = [
      "Store",
      "Competitor",
      "Items",
      "Recorded",
      "Available",
      "Out of stock",
      "Not found",
      "Missing",
      "Coverage",
    ];
    const storeAligns = [
      "left",
      "left",
      "right",
      "right",
      "right",
      "right",
      "right",
      "right",
      "right",
    ];
    styleHeaderRow(sheet.getRow(r), storeHeaders.length, storeAligns);
    storeHeaders.forEach((h, i) => {
      sheet.getRow(r).getCell(i + 1).value = h;
    });
    r += 1;

    summary.byStore.forEach((s, i) => {
      const row = sheet.getRow(r);
      const values = [
        s.store,
        s.competitor,
        s.items,
        s.recorded,
        s.available,
        s.outOfStock,
        s.notFound,
        s.missing,
        s.coveragePct / 100,
      ];
      values.forEach((value, idx) => {
        const cell = row.getCell(idx + 1);
        cell.value = value;
        styleDataCell(cell, {
          align: storeAligns[idx],
          zebra: i % 2 === 1,
          wrap: false,
        });
        if (idx === values.length - 1) cell.numFmt = PCT_FORMAT;
      });
      row.height = 18;
      r += 1;
    });
  }

  setPageSetup(sheet, { landscape: true });
  return sheet;
};

// ------------------------------------------------------------------
// Sheet 2a: Price comparison matrix (all-stores report)
// ------------------------------------------------------------------

const writeMatrixCell = (cell, record, isLowest) => {
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  if (record === undefined) {
    cell.value = "-";
    cell.font = font({ color: { argb: C.muted } });
    return;
  }
  if (record === null) {
    cell.value = "Missing";
    cell.font = font({ italic: true, color: { argb: C.muted } });
    return;
  }
  if (record.availability === "AVAILABLE") {
    if (record.price === null) {
      cell.value = AVAILABILITY_LABELS.AVAILABLE;
      cell.font = font({ color: { argb: C.green } });
      return;
    }
    cell.value = record.price;
    cell.numFmt = PRICE_FORMAT;
    cell.alignment = { vertical: "middle", horizontal: "right" };
    cell.font = isLowest
      ? font({ bold: true, color: { argb: C.green } })
      : font();
    if (isLowest) cell.fill = fill("FFE8F5E9");
    return;
  }
  if (record.availability === "OUT_OF_STOCK") {
    cell.value = AVAILABILITY_LABELS.OUT_OF_STOCK;
    cell.font = font({ color: { argb: C.red } });
    return;
  }
  cell.value = AVAILABILITY_LABELS.NOT_FOUND;
  cell.font = font({ color: { argb: C.amber } });
};

const buildMatrixSheet = (workbook, model) => {
  const { stores, categories, period } = model;
  const FIXED = 4; // No., Item Code, Article Name, Unit
  const colCount = FIXED + stores.length;

  const sheet = workbook.addWorksheet("Price Comparison", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: C.green } },
  });

  sheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 42 },
    { width: 10 },
    ...stores.map(() => ({ width: 18 })),
  ];

  addTitleBar(
    sheet,
    1,
    Math.max(colCount, 5),
    "Price Comparison by Category",
    `${period.name}  |  Prices in ${CURRENCY}`,
    null,
  );

  addNote(
    sheet,
    3,
    Math.max(colCount, 5),
    `Prices in ${CURRENCY}. Green = lowest price in the row. "Missing" = assigned but not recorded. "-" = not on that store's checklist.`,
    18,
  );

  const HEADER_ROW = 5;
  const headerRow = sheet.getRow(HEADER_ROW);
  const headers = [
    "No.",
    "Item Code",
    "Article Name",
    "Unit",
    ...stores.map((s) => storeHeaderLabel(s)),
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

      const prices = stores
        .map((s) => product.cells[s.id])
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

      stores.forEach((s, i) => {
        const cell = row.getCell(FIXED + i + 1);
        const record = product.cells[s.id];
        const isLowest =
          lowest !== null &&
          record &&
          record.availability === "AVAILABLE" &&
          record.price === lowest;
        writeMatrixCell(cell, record, isLowest);
        if (zebra && !isLowest) cell.fill = fill(C.zebra);
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
  sheet.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  setPageSetup(sheet, { landscape: true });
  sheet.pageSetup.printTitlesRow = `${HEADER_ROW}:${HEADER_ROW}`;
  return sheet;
};

// ------------------------------------------------------------------
// Sheet 2b: Single-store observations
// ------------------------------------------------------------------

const buildStoreSheet = (workbook, model) => {
  const storeId = model.store.id;
  const colCount = 9;

  const sheet = workbook.addWorksheet("Store Observations", {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: C.green } },
  });

  sheet.columns = [
    { width: 6 }, // No.
    { width: 18 }, // Item Code
    { width: 42 }, // Article
    { width: 18 }, // Unit / Pack
    { width: 15 }, // Availability
    { width: 14 }, // Price
    { width: 14 }, // Review
    { width: 20 }, // Captured
    { width: 28 }, // Notes
  ];

  addTitleBar(
    sheet,
    1,
    colCount,
    `Price Observations - ${model.store.name}`,
    `${model.period.name}  |  Prices in ${CURRENCY}`,
    null,
  );

  addNote(
    sheet,
    3,
    colCount,
    `Prices in ${CURRENCY}. "Not recorded" = assigned to this store but no observation was captured.`,
    18,
  );

  const HEADER_ROW = 5;
  const headers = [
    "No.",
    "Item Code",
    "Article Name",
    "Unit / Pack",
    "Availability",
    `Price (${CURRENCY})`,
    "Review",
    "Captured",
    "Notes",
  ];
  const aligns = [
    "center",
    "left",
    "left",
    "left",
    "left",
    "right",
    "left",
    "left",
    "left",
  ];
  const headerRow = sheet.getRow(HEADER_ROW);
  headers.forEach((h, i) => {
    headerRow.getCell(i + 1).value = h;
  });
  styleHeaderRow(headerRow, colCount, aligns);

  let r = HEADER_ROW + 1;
  let counter = 0;

  for (const category of model.categories) {
    const entries = category.products.filter(
      (p) => p.cells[storeId] !== undefined,
    );
    if (entries.length === 0) continue;

    styleBandRow(sheet, r, colCount, category.name);
    r += 1;

    let zebra = false;
    for (const product of entries) {
      const record = product.cells[storeId];
      counter += 1;
      const row = sheet.getRow(r);

      const values =
        record === null
          ? [
              counter,
              product.code,
              product.name,
              product.unit,
              "Not recorded",
              null,
              "",
              "",
              "",
            ]
          : [
              counter,
              product.code,
              product.name,
              packLabel(record, product),
              AVAILABILITY_LABELS[record.availability] || record.availability,
              record.availability === "AVAILABLE" ? record.price : null,
              REVIEW_LABELS[record.reviewStatus] || record.reviewStatus,
              formatDateTime(record.capturedAt),
              record.notes || "",
            ];

      values.forEach((value, i) => {
        const cell = row.getCell(i + 1);
        cell.value = value;
        styleDataCell(cell, { align: aligns[i], zebra });
      });

      row.getCell(1).font = font({ color: { argb: C.muted } });
      row.getCell(6).numFmt = PRICE_FORMAT;

      if (record === null) {
        row.getCell(5).font = font({ italic: true, color: { argb: C.muted } });
      } else {
        row.getCell(5).font = font({
          bold: true,
          color: { argb: availabilityColor(record.availability) },
        });
      }

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
// Sheet 3: Flat observation details (filterable)
// ------------------------------------------------------------------

const buildDetailsSheet = (workbook, model) => {
  const sheet = workbook.addWorksheet("Observation Details", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: C.muted } },
  });

  const columns = [
    { header: "Store", key: "store", width: 28, align: "left" },
    { header: "Competitor", key: "competitor", width: 22, align: "left" },
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

  // Stores for lookup
  const storeById = new Map(model.stores.map((s) => [s.id, s]));

  let rowIndex = 2;
  for (const category of model.categories) {
    for (const product of category.products) {
      for (const s of model.stores) {
        const record = product.cells[s.id];
        if (record === undefined) continue;

        const storeInfo = storeById.get(s.id);
        const row = sheet.getRow(rowIndex);
        const zebra = rowIndex % 2 === 1;

        const data =
          record === null
            ? {
                store: storeInfo.name,
                competitor: storeInfo.competitorName,
                city: storeInfo.city ?? "",
                area: storeInfo.area ?? "",
                category: category.name,
                code: product.code,
                name: product.name,
                availability: "Not recorded",
                price: null,
                packageSize: "",
                unit: product.unit,
                review: "",
                capturedAt: "",
                auditor: "",
                alternatives: null,
                notes: "",
              }
            : {
                store: storeInfo.name,
                competitor: storeInfo.competitorName,
                city: storeInfo.city ?? "",
                area: storeInfo.area ?? "",
                category: category.name,
                code: product.code,
                name: product.name,
                availability:
                  AVAILABILITY_LABELS[record.availability] ||
                  record.availability,
                price:
                  record.availability === "AVAILABLE" ? record.price : null,
                packageSize: record.packageSize ?? "",
                unit: record.observedUnit || product.unit,
                review:
                  REVIEW_LABELS[record.reviewStatus] || record.reviewStatus,
                capturedAt: formatDateTime(record.capturedAt),
                auditor: record.auditorName,
                alternatives: record.alternativesCount,
                notes: record.notes || "",
              };

        columns.forEach((c, i) => {
          const cell = row.getCell(i + 1);
          cell.value = data[c.key];
          styleDataCell(cell, {
            align: c.align,
            zebra,
            wrap: c.key === "notes",
          });
        });

        row.getCell(9).numFmt = PRICE_FORMAT;

        const availCell = row.getCell(8);
        if (record === null) {
          availCell.font = font({ italic: true, color: { argb: C.muted } });
        } else {
          availCell.font = font({
            bold: true,
            color: { argb: availabilityColor(record.availability) },
          });
        }

        rowIndex += 1;
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

  if (model.scope === "STORE") {
    buildStoreSheet(workbook, model);
  } else {
    buildMatrixSheet(workbook, model);
  }

  buildDetailsSheet(workbook, model);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
};
