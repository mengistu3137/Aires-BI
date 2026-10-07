// Backend/src/modules/report/report.pdf.js
import PDFDocument from "pdfkit";
import {
  CURRENCY,
  formatDate,
  formatPrice,
  columnHeaderLabel,
} from "./report.utils.js";

const C = {
  navy: "#1F3A5F",
  headerBlue: "#1F4E79",
  textDark: "#1F2937",
  muted: "#6B7280",
  border: "#CBD5E1",
  gridLine: "#E5E7EB",
  zebra: "#F8FAFC",
  white: "#FFFFFF",
  amber: "#D97706",
  // Chart Series Colors matching executive manual report
  chartQueens: "#1B4332", // Dark Green
  chartComp1: "#2D6A4F", // Medium Green
  chartComp2: "#D97706", // Amber / Orange
  chartComp3: "#0284C7", // Sky Blue
};

const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom;
const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

// ──────────────────────────────────────────────────────────────────
// Page 1: Executive Overview & Visual Price Benchmark Comparison
// ──────────────────────────────────────────────────────────────────

const drawExecutiveCoverPage = (doc, model) => {
  const W = contentWidth(doc);
  const left = doc.page.margins.left;
  let y = doc.page.margins.top;

  // 1. Centered Header Block
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(C.headerBlue)
    .text("COMPETITOR PRICE INTELLIGENCE DASHBOARD", left, y, {
      width: W,
      align: "center",
      lineBreak: false,
    });
  y += 20;

  const dateStr = formatDate(model.period.startDate);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(C.muted)
    .text(
      `Survey Date: ${dateStr}  |  Prepared By: Aires Communication PLC  |  Status: Final Executive Master Version`,
      left,
      y,
      { width: W, align: "center", lineBreak: false },
    );
  y += 28;

  // 2. Executive Operational Overview
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(C.textDark)
    .text("Executive Operational Overview", left, y);
  y += 16;

  const primarySection = model.sections?.[0];
  const competitorsList =
    primarySection?.columns
      ?.filter((c) => c.kind === "COMPETITOR")
      .map((c) => c.label)
      .join(" and ") || "Garment Vegetable Market and Fresh Corner";

  const overviewText = `This official management intelligence dashboard report presents verified retail and wholesale price indices captured live by our dedicated field surveyors on ${dateStr}. All datasets representing ${competitorsList} were collected via direct on-site store audits and physical tracking of active trading bays. The Queens Price column reflects active catalog baseline thresholds, while the competitor data reflects the verified live shelf pricing metrics recorded during this operational window to guarantee authentic market benchmarking.`;

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(C.textDark)
    .text(overviewText, left, y, { width: W, lineGap: 3 });
  y += doc.heightOfString(overviewText, { width: W, lineGap: 3 }) + 22;

  // 3. Price Benchmark Comparison Graph
  drawPriceComparisonChart(doc, model, left, y, W);
};

const drawPriceComparisonChart = (doc, model, x0, y0, totalW) => {
  const chartTitle = `Price Benchmark Comparison Dashboard - ${formatDate(model.period.startDate)}`;
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.textDark)
    .text(chartTitle, x0, y0, { width: totalW, align: "center" });

  const chartY = y0 + 26;
  const chartH = 220;
  const chartW = totalW - 40;
  const chartX = x0 + 35; // margin for Y-axis numbers

  // Extract up to 6 products from the first section
  const section = model.sections?.[0];
  const sampleProducts = (section?.categories?.[0]?.products || []).slice(0, 6);
  if (sampleProducts.length === 0) return;

  const columns = section.columns.slice(0, 4); // Queens + up to 3 competitors
  const seriesColors = [C.chartQueens, C.chartComp1, C.chartComp2, C.chartComp3];

  // Draw Legend at the top-right
  let legendX = chartX + chartW - columns.length * 90;
  const legendY = chartY - 14;
  columns.forEach((col, idx) => {
    const color = seriesColors[idx % seriesColors.length];
    doc.save().rect(legendX, legendY, 8, 8).fill(color).restore();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(C.textDark)
      .text(col.label, legendX + 11, legendY, { lineBreak: false });
    legendX += 90;
  });

  // Calculate Max Value for scale
  let maxPrice = 350;
  sampleProducts.forEach((p) => {
    columns.forEach((col) => {
      const cell = p.cells?.[col.key];
      if (cell && cell.price && Number(cell.price) > maxPrice) {
        maxPrice = Math.ceil(Number(cell.price) / 50) * 50;
      }
    });
  });

  // Y-Axis Ticks & Gridlines
  const steps = 7;
  const stepVal = maxPrice / steps;
  doc.lineWidth(0.5).strokeColor(C.gridLine);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round(s * stepVal);
    const lineY = chartY + chartH - (s / steps) * chartH;

    // Gridline
    doc.moveTo(chartX, lineY).lineTo(chartX + chartW, lineY).stroke();

    // Y-Axis Label
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.muted)
      .text(String(val), x0, lineY - 4, { width: 30, align: "right" });
  }

  // Y-Axis Title
  doc.save();
  doc.rotate(-90, { origin: [x0 - 15, chartY + chartH / 2] });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(C.muted)
    .text("Price in ETB", x0 - 45, chartY + chartH / 2, { lineBreak: false });
  doc.restore();

  // Draw Bars for each product
  const groupW = chartW / sampleProducts.length;
  const barW = Math.min(16, (groupW * 0.7) / columns.length);
  const groupPad = (groupW - barW * columns.length) / 2;

  sampleProducts.forEach((prod, pIdx) => {
    const groupX = chartX + pIdx * groupW + groupPad;

    columns.forEach((col, cIdx) => {
      const cell = prod.cells?.[col.key];
      const price =
        cell && cell.availability === "AVAILABLE" && cell.price
          ? Number(cell.price)
          : 0;
      const barH = (price / maxPrice) * chartH;
      const barX = groupX + cIdx * barW;
      const barY = chartY + chartH - barH;

      if (barH > 0) {
        doc
          .save()
          .rect(barX, barY, barW - 1, barH)
          .fill(seriesColors[cIdx % seriesColors.length])
          .restore();
      }
    });

    // Product Name Label below chart
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.textDark)
      .text(prod.name.slice(0, 14), chartX + pIdx * groupW, chartY + chartH + 6, {
        width: groupW,
        align: "center",
        lineBreak: false,
      });
  });

  // Base X-Axis line
  doc
    .save()
    .lineWidth(1)
    .strokeColor(C.textDark)
    .moveTo(chartX, chartY + chartH)
    .lineTo(chartX + chartW, chartY + chartH)
    .stroke()
    .restore();
};

// ──────────────────────────────────────────────────────────────────
// Page 2+: Master Pricing Matrix (uses per-category layout — category
// name printed once per category, not repeated per product) &
// Field Summary Sourcing Insights.
// ──────────────────────────────────────────────────────────────────

const drawMatrixTable = (doc, section, startY) => {
  const W = contentWidth(doc);
  const left = doc.page.margins.left;
  let y = startY;

  // Header
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(C.headerBlue)
    .text("Master Competitor Pricing & Baseline Matrix", left, y);
  y += 18;

  const columns = section.columns;
  const noW = 24;
  const catW = 70;
  const nameW = 140;
  const unitW = 40;
  const compW = Math.floor((W - noW - catW - nameW - unitW) / columns.length);

  const tableCols = [
    { label: "No.", width: noW, align: "center" },
    { label: "Category", width: catW, align: "left" },
    { label: "Item Name", width: nameW, align: "left" },
    { label: "Unit", width: unitW, align: "center" },
    ...columns.map((c) => ({
      label: columnHeaderLabel(c),
      width: compW,
      align: "right",
    })),
  ];

  // Draw Table Header
  const headerH = 26;
  doc.save().rect(left, y, W, headerH).fill(C.navy).restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);

  let curX = left;
  tableCols.forEach((col) => {
    doc.text(col.label, curX + 3, y + 8, {
      width: col.width - 6,
      align: col.align,
    });
    curX += col.width;
  });
  y += headerH;

  // Table Data Rows — iterate per category so the category name
  // appears once per category (matching the report config), not
  // repeated on every product row.
  let counter = 1;
  let zebra = false;

  for (const cat of section.categories) {
    // Category header band (spans full table width)
    const catHeaderH = 16;
    if (y + catHeaderH > bottomLimit(doc) - 70) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.save().rect(left, y, W, catHeaderH).fill(C.zebra).restore();
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(C.headerBlue)
      .text(cat.name, left + 4, y + 4, { width: W - 8, align: "left" });
    y += catHeaderH;

    for (const prod of cat.products) {
      const rowH = 18;
      if (y + rowH > bottomLimit(doc) - 70) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      if (zebra) {
        doc.save().rect(left, y, W, rowH).fill(C.zebra).restore();
      }
      zebra = !zebra;

      // Grid line
      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(C.border)
        .moveTo(left, y + rowH)
        .lineTo(left + W, y + rowH)
        .stroke()
        .restore();

      curX = left;
      // No.
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(String(counter++), curX + 2, y + 5, {
          width: noW - 4,
          align: "center",
        });
      curX += noW;
      // Category — left blank since category header band above already
      // identifies the category (avoids "dairy dairy dairy ..." repetition).
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text("", curX + 2, y + 5, { width: catW - 4, align: "left" });
      curX += catW;
      // Name
      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.textDark)
        .text(prod.name, curX + 2, y + 5, {
          width: nameW - 4,
          align: "left",
        });
      curX += nameW;
      // Unit
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(prod.unit, curX + 2, y + 5, {
          width: unitW - 4,
          align: "center",
        });
      curX += unitW;

      // Price Columns
      columns.forEach((col) => {
        const cell = prod.cells?.[col.key];
        let valStr = "—";
        let color = C.textDark;

        if (cell) {
          if (cell.availability === "AVAILABLE" && cell.price !== null) {
            valStr = `${formatPrice(cell.price)} ETB`;
            if (col.kind === "QUEENS") color = C.headerBlue;
          } else if (cell.availability === "OUT_OF_STOCK") {
            valStr = "OUT OF STOCK";
            color = "#B91C1C";
          }
        }

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(color)
          .text(valStr, curX + 2, y + 5, {
            width: compW - 6,
            align: "right",
          });
        curX += compW;
      });

      y += rowH;
    }
  }

  // ───────────────────────────────────────────────────────────
  // Field Summary Sourcing & Insights Section
  // ───────────────────────────────────────────────────────────
  if (y + 110 > bottomLimit(doc)) {
    doc.addPage();
    y = doc.page.margins.top;
  } else {
    y += 18;
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(C.textDark)
    .text("Field Summary Sourcing & Insights", left, y);
  y += 14;

  const insights = [
    "Direct Physical Sourcing: All pricing indices were obtained directly from open-market distribution channels by field surveyors, eliminating automated web scraping to guarantee actual market context.",
    "Strategic Window: Ground prices represent active retail and wholesale transactions recorded between 8:00 AM and 11:30 AM on the survey date.",
    "Quality Assurance: Price benchmarks are verified against current shelf stock and approved catalog baselines under Aires Communication PLC oversight.",
  ];

  insights.forEach((bullet) => {
    doc.save().circle(left + 4, y + 4, 1.5).fill(C.headerBlue).restore();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(C.textDark)
      .text(bullet, left + 12, y, { width: W - 14, lineGap: 2 });
    y += doc.heightOfString(bullet, { width: W - 14, lineGap: 2 }) + 4;
  });

  return y;
};

// ──────────────────────────────────────────────────────────────────
// Footers
// ──────────────────────────────────────────────────────────────────

const drawFooters = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const { left, bottom } = doc.page.margins;
    const width = contentWidth(doc);
    const y = doc.page.height - bottom + 16;

    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .save()
      .lineWidth(0.5)
      .strokeColor(C.border)
      .moveTo(left, y - 6)
      .lineTo(left + width, y - 6)
      .stroke()
      .restore();

    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted);
    doc.text(
      "Aires Communication PLC  ·  Queens Supermarket Retail Price Intelligence",
      left,
      y,
      { width: width * 0.7, align: "left", lineBreak: false },
    );
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, left, y, {
      width,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = originalBottom;
  }
};

export const buildObservationReportPdf = (model) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait", // Portrait layout matches the executive report specification
        margins: { top: 36, bottom: 40, left: 36, right: 36 },
        bufferPages: true,
        info: {
          Title: `Competitor Price Intelligence Dashboard - ${model.period.name}`,
          Author: "Aires Communication PLC",
          Creator: "Aires-BI Platform",
        },
      });

      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Page 1: Dashboard with Narrative & Chart
      drawExecutiveCoverPage(doc, model);

      // Page 2+: Master Price Matrix & Sourcing Notes
      // Loop over all sections (both report types) so the config-driven
      // layout is honored.
      const sections = model.sections || [];
      sections.forEach((section) => {
        doc.addPage();
        drawMatrixTable(doc, section, doc.page.margins.top);
      });

      drawFooters(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });