// Backend/src/modules/report/report.pdf.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import {
  CURRENCY,
  formatDate,
  formatPrice,
  columnHeaderLabel,
} from "./report.utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────
// Palette
// ──────────────────────────────────────────────────────────────────

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
  cycleBg: "#E8F0FA",
  cycleBorder: "#1F4E79",
  chartQueens: "#1B4332",
  chartComp1: "#2D6A4F",
  chartComp2: "#D97706",
  chartComp3: "#0284C7",
  // ── Aires brand tokens ──────────────────────────────────────────
  airesGreen: "#017C4D",
  airesOrange: "#FE7914",
  airesRed: "#A41821",
};

// ──────────────────────────────────────────────────────────────────
// Aires logo — loaded once, cached in memory.
// Falls back to null when the PNG isn't present so the header degrades
// to a styled text wordmark instead of crashing.
// ──────────────────────────────────────────────────────────────────

const AIRES_LOGO_PATH = path.join(__dirname, "assets", "aires-logo.png");
let _airesLogoBuffer = null;
let _airesLogoChecked = false;

const loadAiresLogo = () => {
  if (_airesLogoChecked) return _airesLogoBuffer;
  _airesLogoChecked = true;
  try {
    _airesLogoBuffer = fs.readFileSync(AIRES_LOGO_PATH);
  } catch {
    _airesLogoBuffer = null;
    console.warn(
      `[report.pdf] Aires logo not found at ${AIRES_LOGO_PATH}. ` +
      `Falling back to text wordmark. Run: ` +
      `mkdir -p Backend/src/modules/report/assets && ` +
      `cp Frontend/public/icons/icon-192.png Backend/src/modules/report/assets/aires-logo.png`,
    );
  }
  return _airesLogoBuffer;
};

// ──────────────────────────────────────────────────────────────────
// Layout helpers
// ──────────────────────────────────────────────────────────────────

const bottomLimit = (doc) => doc.page.height - doc.page.margins.bottom;
const contentWidth = (doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;

// ──────────────────────────────────────────────────────────────────
// Aires brand strip — three-stop gradient bar
//   green ─────► orange ─────► red
// Drawn as ~96 thin vertical rectangles so it renders smoothly without
// needing an image asset.
// ──────────────────────────────────────────────────────────────────

const hexToRgb = (hex) => {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

const mixColor = (from, to, t) => {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
};

const rgbHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

/**
 * Draws a 3-stop horizontal gradient bar.
 *   Stop 0 → C.airesGreen   (left)
 *   Stop 1 → C.airesOrange  (middle)
 *   Stop 2 → C.airesRed     (right)
 */
const drawAiresGradientBar = (doc, x, y, width, height) => {
  const SEGMENTS = 96;
  const segW = width / SEGMENTS;
  for (let i = 0; i < SEGMENTS; i += 1) {
    const t = i / (SEGMENTS - 1);
    let color;
    // Left → Right: RED ▸ ORANGE ▸ GREEN
    if (t <= 0.5) {
      color = rgbHex(mixColor(C.airesRed, C.airesOrange, t / 0.5));
    } else {
      color = rgbHex(mixColor(C.airesOrange, C.airesGreen, (t - 0.5) / 0.5));
    }
    doc
      .save()
      .rect(x + i * segW, y, segW + 0.5, height)
      .fill(color)
      .restore();
  }
};

// ──────────────────────────────────────────────────────────────────
// Cover header (page 1 only)
// ──────────────────────────────────────────────────────────────────

const drawCoverHeader = (doc, model) => {
  const W = contentWidth(doc);
  const left = doc.page.margins.left;
  let y = doc.page.margins.top;

  const logoBuffer = loadAiresLogo();
  const logoH = 40;

  // ── Left: Aires logo (PNG) or text wordmark fallback ──────────
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, y, { height: logoH });
    } catch {
      // If pdfkit can't decode the image, fall back to text.
      doc
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(C.airesGreen)
        .text("AIRES", left, y + 10, { lineBreak: false });
    }
  } else {
    // Text wordmark — Green "AIRES" + Orange dot + Red "COMMUNICATION"
    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(C.airesGreen)
      .text("AIRES", left, y + 10, { lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(C.airesOrange)
      .text(".", left + 52, y + 10, { lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(C.airesRed)
      .text("COMMUNICATION", left + 58, y + 14, { lineBreak: false });
  }

  // ── Center: company name ──────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(C.navy)
    .text("Aires Communication PLC", left, y + 6, {
      width: W,
      align: "center",
      lineBreak: false,
    });

  // ── Right: badge text ────────────────────────────────────────
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(C.muted)
    .text("Pricing Intelligence Unit", left, y + 22, {
      width: W,
      align: "right",
      lineBreak: false,
    });

  y += logoH + 8;

  // ── Gradient bar under the header ────────────────────────────
  drawAiresGradientBar(doc, left, y, W, 3);
  y += 14;

  return y;
};

// ──────────────────────────────────────────────────────────────────
// Page 1: Executive Overview & Visual Price Benchmark Comparison
// ──────────────────────────────────────────────────────────────────

const drawExecutiveCoverPage = (doc, model) => {
  const W = contentWidth(doc);
  const left = doc.page.margins.left;
  let y = drawCoverHeader(doc, model);

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

  drawPriceComparisonChart(doc, model, left, y, W);
};

// ──────────────────────────────────────────────────────────────────
// Price chart
// ──────────────────────────────────────────────────────────────────

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
  const chartX = x0 + 35;

  const section = model.sections?.[0];
  const sampleProducts = (section?.categories?.[0]?.products || []).slice(0, 6);
  if (sampleProducts.length === 0) return;

  const columns = section.columns.slice(0, 4);
  const seriesColors = [C.chartQueens, C.chartComp1, C.chartComp2, C.chartComp3];

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

  let maxPrice = 350;
  sampleProducts.forEach((p) => {
    columns.forEach((col) => {
      const cell = p.cells?.[col.key];
      if (cell && cell.price && Number(cell.price) > maxPrice) {
        maxPrice = Math.ceil(Number(cell.price) / 50) * 50;
      }
    });
  });

  const steps = 7;
  const stepVal = maxPrice / steps;
  doc.lineWidth(0.5).strokeColor(C.gridLine);

  for (let s = 0; s <= steps; s++) {
    const val = Math.round(s * stepVal);
    const lineY = chartY + chartH - (s / steps) * chartH;
    doc.moveTo(chartX, lineY).lineTo(chartX + chartW, lineY).stroke();
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(C.muted)
      .text(String(val), x0, lineY - 4, { width: 30, align: "right" });
  }

  doc.save();
  doc.rotate(-90, { origin: [x0 - 15, chartY + chartH / 2] });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(C.muted)
    .text("Price in ETB", x0 - 45, chartY + chartH / 2, { lineBreak: false });
  doc.restore();

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
// Master Pricing Matrix — one table per survey cycle
// ──────────────────────────────────────────────────────────────────

const drawCycleHeader = (doc, cycle, left, W, y) => {
  const h = 22;
  doc.save().rect(left, y, W, h).fill(C.cycleBg).restore();
  doc
    .save()
    .lineWidth(2)
    .strokeColor(C.cycleBorder)
    .moveTo(left, y)
    .lineTo(left, y + h)
    .stroke()
    .restore();

  const label = `Survey Cycle: ${cycle.period.name}`;
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(C.cycleBorder)
    .text(label, left + 8, y + 6, { width: W - 16, lineBreak: false });

  const rangeStr = `${formatDate(cycle.period.startDate)} – ${formatDate(cycle.period.endDate)}`;
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor(C.muted)
    .text(rangeStr, left + 8, y + 6, {
      width: W - 16,
      align: "right",
      lineBreak: false,
    });

  return y + h + 4;
};

const drawCycleTable = (doc, cycle, section, left, W, startY) => {
  const columns = cycle.columns;
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

  let y = startY;

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

  let counter = 1;
  let zebra = false;

  for (const cat of cycle.categories) {
    const catHeaderH = 16;
    if (y + catHeaderH > bottomLimit(doc) - 70) {
      doc.addPage();
      y = doc.page.margins.top;
      y = drawCycleHeader(doc, cycle, left, W, y);
      doc.save().rect(left, y, W, headerH).fill(C.navy).restore();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
      curX = left;
      tableCols.forEach((col) => {
        doc.text(col.label, curX + 3, y + 8, {
          width: col.width - 6,
          align: col.align,
        });
        curX += col.width;
      });
      y += headerH;
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
        y = drawCycleHeader(doc, cycle, left, W, y);
        doc.save().rect(left, y, W, headerH).fill(C.navy).restore();
        doc.font("Helvetica-Bold").fontSize(8).fillColor(C.white);
        curX = left;
        tableCols.forEach((col) => {
          doc.text(col.label, curX + 3, y + 8, {
            width: col.width - 6,
            align: col.align,
          });
          curX += col.width;
        });
        y += headerH;
      }

      if (zebra) {
        doc.save().rect(left, y, W, rowH).fill(C.zebra).restore();
      }
      zebra = !zebra;

      doc
        .save()
        .lineWidth(0.5)
        .strokeColor(C.border)
        .moveTo(left, y + rowH)
        .lineTo(left + W, y + rowH)
        .stroke()
        .restore();

      curX = left;
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(String(counter++), curX + 2, y + 5, {
          width: noW - 4,
          align: "center",
        });
      curX += noW;

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text("", curX + 2, y + 5, { width: catW - 4, align: "left" });
      curX += catW;

      doc
        .font("Helvetica-Bold")
        .fontSize(7.5)
        .fillColor(C.textDark)
        .text(prod.name, curX + 2, y + 5, {
          width: nameW - 4,
          align: "left",
        });
      curX += nameW;

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(C.muted)
        .text(prod.unit, curX + 2, y + 5, {
          width: unitW - 4,
          align: "center",
        });
      curX += unitW;

      columns.forEach((col) => {
        const cell = prod.cells?.[col.key];
        let valStr = "Not found";
        let color = C.muted;

        if (cell) {
          if (cell.availability === "AVAILABLE" && cell.price !== null) {
            valStr = `${formatPrice(cell.price)} ETB`;
            color = C.textDark;
            if (col.kind === "QUEENS") color = C.headerBlue;
          } else if (cell.availability === "OUT_OF_STOCK") {
            valStr = "OUT OF STOCK";
            color = "#B91C1C";
          } else if (cell.availability === "NOT_FOUND") {
            valStr = "Not found";
            color = C.muted;
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

  return y;
};

const drawMatrixTable = (doc, section, startY) => {
  const W = contentWidth(doc);
  const left = doc.page.margins.left;
  let y = startY;

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor(C.headerBlue)
    .text(`Master Competitor Pricing & Baseline Matrix — ${section.label}`, left, y);
  y += 18;

  const cycles = section.cycles && section.cycles.length > 0
    ? section.cycles
    : [
      {
        period: {
          id: "flat",
          name: "Report Range",
          status: null,
          startDate: null,
          endDate: null,
        },
        label: "Report Range",
        columns: section.columns,
        categories: section.categories,
        summary: section.summary,
      },
    ];

  for (let i = 0; i < cycles.length; i += 1) {
    const cycle = cycles[i];

    if (y + 80 > bottomLimit(doc) - 70) {
      doc.addPage();
      y = doc.page.margins.top;
    } else if (i > 0) {
      y += 14;
    }

    y = drawCycleHeader(doc, cycle, left, W, y);
    y = drawCycleTable(doc, cycle, section, left, W, y);
  }

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
// Top strips (pages 2+) & Footers (all pages)
// ──────────────────────────────────────────────────────────────────

const drawTopStripsAndFooters = (doc) => {
  const range = doc.bufferedPageRange();
  const totalPages = range.count;

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const { left, bottom } = doc.page.margins;
    const width = contentWidth(doc);

    const originalBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    const isFirstPage = i === range.start;

    // ── Top gradient strip on pages 2+ ──────────────────────────
    if (!isFirstPage) {
      const stripY = doc.page.margins.top - 14;
      drawAiresGradientBar(doc, left, stripY, width, 2);
    }

    // ── Footer: thin gradient bar + text ────────────────────────
    const y = doc.page.height - bottom + 16;

    drawAiresGradientBar(doc, left, y - 8, width, 1.5);

    doc.font("Helvetica").fontSize(7.5).fillColor(C.muted);
    doc.text(
      "Aires Communication PLC  ·  Queens Supermarket Retail Price Intelligence",
      left,
      y,
      { width: width * 0.7, align: "left", lineBreak: false },
    );
    doc.text(`Page ${i - range.start + 1} of ${totalPages}`, left, y, {
      width,
      align: "right",
      lineBreak: false,
    });

    doc.page.margins.bottom = originalBottom;
  }
};

// ──────────────────────────────────────────────────────────────────
// Entry point
// ──────────────────────────────────────────────────────────────────

export const buildObservationReportPdf = (model) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "portrait",
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

      // Page 1: cover header + dashboard
      drawExecutiveCoverPage(doc, model);

      // Page 2+: one matrix block per section
      const sections = model.sections || [];
      sections.forEach((section) => {
        doc.addPage();
        drawMatrixTable(doc, section, doc.page.margins.top);
      });

      drawTopStripsAndFooters(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });