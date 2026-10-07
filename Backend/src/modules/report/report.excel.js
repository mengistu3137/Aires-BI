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
  cycleBand: "FFDCE6F4",
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

const safeSheetName = (name) =>
  String(name)
    .replace(/[:\\/?*[\]]/g, " ")
    .slice(0, 31);

const colLetter = (index) => {
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
    paperSize: 9,
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
    sheet.unMergeCells(`A${rowNumber + 1}:${lastCol}${rowNumber + 1}`);
    sheet.mergeCells(`A${rowNumber + 1}:${colLetter(colCount - 2)}${rowNumber + 1}`);
    sheet.mergeCells(`${colLetter(colCount - 1)}${rowNumber + 1}:${lastCol}${rowNumber + 1}`);
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

const styleBandRow = (sheet, rowNumber, colCount, text, opts = {}) => {
  sheet.mergeCells(`A${rowNumber}:${colLetter(colCount)}${rowNumber}`);
  const cell = sheet.getCell(`A${rowNumber}`);
  cell.value = text;
  cell.font = font({
    size: opts.size || 11,
    bold: true,
    color: { argb: opts.color || C.primary },
  });
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(rowNumber).height = opts.height || 20;
  for (let c = 1; c <= colCount; c += 1) {
    const rc = sheet.getRow(rowNumber).getCell(c);
    rc.fill = fill(opts.bg || C.band);
    rc.border = thinBorder;
  }
};

const styleDataCell = (cell, { align = "left", zebra = false, wrap = true } = {}) => {
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

// ─────────────────────────────────────────────────────────────────
// Matrix cell writer
//   - record === undefined (never observed) → "Not found" (italic, muted)
//   - record === null (assigned, not recorded) → "Not found" (italic, muted)
//   - QUEENS with price → bold, highlighted
//   - AVAILABLE with price → price (right-aligned, lowest highlighted)
//   - OUT_OF_STOCK → red label
//   - NOT_FOUND (explicit) → "Not found" (italic, muted)
// ─────────────────────────────────────────────────────────────────
const writeMatrixCell = (cell, record, column, isLowest) => {
  cell.border = thinBorder;
  cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  cell.font = font();

  if (record === undefined) {
    cell.value = "Not found";
    cell.font = font({ italic: true, color: { argb: C.muted } });
    return false;
  }
  if (record === null) {
    cell.value = "Not found";
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
  // Explicit NOT_FOUND (or anything else) → "Not found"
  cell.value = "Not found";
  cell.font = font({ italic: true, color: { argb: C.muted } });
  return false;
};

const buildMatrixSheet = (workbook, model, section, cycleBlock) => {
  const { columns, categories } = cycleBlock;
  const period = model.period;
  const FIXED = 4;
  const colCount = FIXED + columns.length;
  const barCols = Math.max(colCount, 5);

  const cycleLabel = cycleBlock.label;
  const sheetName = safeSheetName(`${section.label} - ${cycleLabel}`);
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: C.green } },
  });

  sheet.columns = [
    { width: 6 },
    { width: 18 },
    { width: 42 },
    { width: 10 },
    ...columns.map(() => ({ width: 20 })),
  ];

  // Subtitle no longer appends status.
  addTitleBar(
    sheet,
    1,
    barCols,
    `${section.label} — Survey Cycle: ${cycleLabel}`,
    `${formatDate(cycleBlock.period.startDate)} – ${formatDate(cycleBlock.period.endDate)}  |  Prices in ${CURRENCY}`,
    cycleLabel,
  );

  const hasQueens = columns.some((c) => c.kind === "QUEENS");
  sheet.mergeCells(`A3:${colLetter(barCols)}3`);
  const noteCell = sheet.getCell("A3");
  noteCell.value =
    `Prices in ${CURRENCY}. Green = lowest competitor price in the row. ` +
    (hasQueens ? "Queens Price = current price from the price list. " : "") +
    `"Not found" = no observation recorded for this competitor in this cycle.`;
  noteCell.font = font({ size: 9, color: { argb: C.muted } });
  noteCell.alignment = { vertical: "top", wrapText: true };
  sheet.getRow(3).height = 18;

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
          (rec) => rec && rec.availability === "AVAILABLE" && rec.price !== null,
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

const buildDetailsSheet = (workbook, model) => {
  const sheet = workbook.addWorksheet("Observation Details", {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: C.muted } },
  });

  const columns = [
    { header: "Report", key: "report", width: 16, align: "left" },
    { header: "Survey cycle", key: "cycle", width: 22, align: "left" },
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
    { header: "Other observations", key: "alternatives", width: 12, align: "right" },
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

  const emptyData = (section, cycleBlock, column, product, category) => ({
    report: section.label,
    cycle: cycleBlock.label,
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
    const cycles = section.cycles || [];
    for (const cycleBlock of cycles) {
      for (const category of cycleBlock.categories) {
        for (const product of category.products) {
          for (const column of cycleBlock.columns) {
            const record = product.cells[column.key];

            const base = emptyData(section, cycleBlock, column, product, category);
            let data;
            let availabilityKey = null;

            if (record === undefined || record === null) {
              // Never observed / assigned-but-not-recorded → explicit "Not found"
              data = { ...base, availability: "Not found" };
              availabilityKey = "NOT_FOUND";
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

export const buildObservationReportExcel = async (model) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = model.generatedBy || "Price Audit System";
  workbook.lastModifiedBy = model.generatedBy || "Price Audit System";
  workbook.created = new Date(model.generatedAt);
  workbook.modified = new Date(model.generatedAt);
  workbook.title = `Competitor Price Audit Report - ${model.period.name}`;
  workbook.subject = safeSheetName(model.period.name);

  for (const section of model.sections) {
    const cycles = section.cycles || [];
    if (cycles.length === 0) {
      buildMatrixSheet(workbook, model, section, {
        label: "Report Range",
        period: {
          id: "flat",
          name: "Report Range",
          status: null,
          startDate: model.period.startDate,
          endDate: model.period.endDate,
        },
        columns: section.columns,
        categories: section.categories,
        summary: section.summary,
      });
      continue;
    }
    for (const cycleBlock of cycles) {
      buildMatrixSheet(workbook, model, section, cycleBlock);
    }
  }

  buildDetailsSheet(workbook, model);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
};