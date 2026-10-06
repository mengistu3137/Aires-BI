import {
    Document,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    BorderStyle,
    HeadingLevel,
    LevelFormat,
    Packer,
    ShadingType,
    Header,
    Footer,
    PageNumber,
} from "docx";

/* ─────────────────────────── Aires Brand Tokens ─────────────────────────── */

const FONT = "Calibri";

const COLOR = {
    NAVY_HEADING: "1F4E79",   // Section 1 / Primary Heading Blue
    ORANGE_SUB: "FE7914",     // Subheading 1.1 / Accent Orange
    AIRES_RED: "A41821",      // Aires Brand Red / Out of stock
    AIRES_GREEN: "017C4D",    // Lowest price / Optimal
    TEXT_DARK: "1F2937",      // Primary body text
    TEXT_MUTED: "64748B",     // Secondary / dates
    TABLE_HEADER: "1F3A5F",   // Table header navy fill
    ZEBRA_BG: "F8FAFC",       // Subtle table stripe
    BORDER_LINE: "CBD5E1",    // 0.5pt subtle border
    WHITE: "FFFFFF",
};

const PT = (n) => Math.round(n * 2);
const TW = (pt) => Math.round(pt * 20);

// A4 Dimensions (11906 x 16838 dxa) with 1" margins (1440 dxa)
const PAGE = { width: 11906, height: 16838 };
const MARGIN = 1440;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2; // 9026 dxa

const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = {
    top: NO_BORDER,
    bottom: NO_BORDER,
    left: NO_BORDER,
    right: NO_BORDER,
};

/* ─────────────────────────── Inline Typography Parsing ─────────────────────────── */

const INLINE_RE = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(?!\s)(.+?)\*/g;

const inlineRuns = (text, { size = PT(11), color = COLOR.TEXT_DARK, bold = false } = {}) => {
    const runs = [];
    const base = { font: FONT, size, color };
    let last = 0;

    for (const m of text.matchAll(INLINE_RE)) {
        if (m.index > last) {
            runs.push(new TextRun({ ...base, text: text.slice(last, m.index), bold }));
        }
        if (m[1] !== undefined) {
            runs.push(new TextRun({ ...base, text: m[1], bold: true, italics: true }));
        } else if (m[2] !== undefined) {
            runs.push(new TextRun({ ...base, text: m[2], bold: true }));
        } else {
            runs.push(new TextRun({ ...base, text: m[3], italics: true }));
        }
        last = m.index + m[0].length;
    }

    if (last < text.length) {
        runs.push(new TextRun({ ...base, text: text.slice(last), bold }));
    }
    return runs.length ? runs : [new TextRun({ ...base, text: "", bold })];
};

const stripInline = (text) =>
    (text || "").replace(/\*\*\*(.+?)\*\*\*/g, "$1").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(?!\s)(.+?)\*/g, "$1").trim();

/* ─────────────────────────── Block Builders ─────────────────────────── */

// Level 1 Section Heading (#1F4E79 Bold Uppercase)
const h1Block = (text) =>
    new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: TW(14), after: TW(6) },
        keepNext: true,
        children: [
            new TextRun({
                text: stripInline(text).toUpperCase(),
                bold: true,
                font: FONT,
                size: PT(12.5),
                color: COLOR.NAVY_HEADING,
            }),
        ],
    });

// Level 2 Subheading (1.1, 1.2 in Aires Orange #FE7914 Bold)
const h2Block = (text) =>
    new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: TW(10), after: TW(4) },
        keepNext: true,
        children: [
            new TextRun({
                text: stripInline(text),
                bold: true,
                font: FONT,
                size: PT(11.5),
                color: COLOR.ORANGE_SUB,
            }),
        ],
    });

// Standard Body with Lead-in Bold detection ("Lead-in Phrase: explanation...")
const bodyBlock = (text) => {
    const leadMatch = text.match(/^([^:\n]+:)\s+(.*)$/);

    if (leadMatch && !text.startsWith("#") && !text.startsWith("-")) {
        return new Paragraph({
            spacing: { after: TW(6), line: 276 },
            children: [
                new TextRun({
                    text: stripInline(leadMatch[1]) + " ",
                    bold: true,
                    font: FONT,
                    size: PT(11),
                    color: COLOR.TEXT_DARK,
                }),
                ...inlineRuns(leadMatch[2], { size: PT(11), color: COLOR.TEXT_DARK }),
            ],
        });
    }

    return new Paragraph({
        spacing: { after: TW(6), line: 276 },
        children: inlineRuns(text, { size: PT(11), color: COLOR.TEXT_DARK }),
    });
};

const bulletBlock = (text) =>
    new Paragraph({
        numbering: { reference: "report-bullets", level: 0 },
        spacing: { after: TW(3), line: 276 },
        children: inlineRuns(text, { size: PT(11), color: COLOR.TEXT_DARK }),
    });

/* ─────────────────────────── Table Builder ─────────────────────────── */

const buildTable = (headers, rows) => {
    const colCount = headers.length;
    const fixed = [650, 3100, 750]; // No. (650), Item Name (3100), Unit (750)
    const remaining = CONTENT_WIDTH - fixed.reduce((a, b) => a + b, 0);
    const compColWidth = Math.max(800, Math.floor(remaining / Math.max(1, colCount - 3)));

    const widths = [fixed[0], fixed[1], fixed[2]];
    for (let c = 3; c < colCount; c++) {
        widths.push(compColWidth);
    }

    const headerRow = new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map(
            (h, i) =>
                new TableCell({
                    width: { size: widths[i] || 1200, type: WidthType.DXA },
                    margins: CELL_MARGINS,
                    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLOR.TABLE_HEADER },
                    borders: {
                        ...NO_BORDERS,
                        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR.NAVY_HEADING },
                    },
                    children: [
                        new Paragraph({
                            alignment: i >= 3 ? AlignmentType.RIGHT : AlignmentType.LEFT,
                            children: [
                                new TextRun({
                                    text: stripInline(h),
                                    bold: true,
                                    font: FONT,
                                    size: PT(9.5),
                                    color: COLOR.WHITE,
                                }),
                            ],
                        }),
                    ],
                })
        ),
    });

    const dataRows = rows.map(
        (row, rIdx) =>
            new TableRow({
                cantSplit: true,
                children: headers.map((_, i) => {
                    const val = row[i] ?? "";
                    const isOOS = val.includes("OUT OF STOCK");
                    const isNumeric = i >= 3 && val !== "—";

                    return new TableCell({
                        width: { size: widths[i] || 1200, type: WidthType.DXA },
                        margins: CELL_MARGINS,
                        shading: {
                            type: ShadingType.CLEAR,
                            color: "auto",
                            fill: rIdx % 2 === 0 ? COLOR.WHITE : COLOR.ZEBRA_BG,
                        },
                        borders: {
                            ...NO_BORDERS,
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER_LINE },
                        },
                        children: [
                            new Paragraph({
                                alignment: isNumeric ? AlignmentType.RIGHT : AlignmentType.LEFT,
                                children: [
                                    new TextRun({
                                        text: val,
                                        bold: isOOS || i === 1,
                                        font: FONT,
                                        size: PT(9.5),
                                        color: isOOS ? COLOR.AIRES_RED : COLOR.TEXT_DARK,
                                    }),
                                ],
                            }),
                        ],
                    });
                }),
            })
    );

    return new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        columnWidths: widths,
        borders: {
            ...NO_BORDERS,
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: COLOR.BORDER_LINE },
            insideVertical: NO_BORDER,
        },
        rows: [headerRow, ...dataRows],
    });
};

/* ─────────────────────────── Markdown Parser ─────────────────────────── */

const markdownToDocx = (markdown) => {
    const lines = (markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Subheading check (e.g. "1.1 Core Platform Capabilities:" or "## 1.1")
        const subMatch = trimmed.match(/^(?:#{1,4}\s*)?(\d+\.\d+[\s\w:\-–—]+)$/);
        if (subMatch && !trimmed.startsWith("###")) {
            blocks.push(h2Block(subMatch[1]));
            continue;
        }

        // Main Section Heading ("1. EXECUTIVE SUMMARY" or "# 1. EXECUTIVE")
        const mainMatch = trimmed.match(/^(?:#{1,3}\s*)?(\d+\.\s+[A-Z\s\-–—&]+)$/);
        if (mainMatch) {
            blocks.push(h1Block(mainMatch[1]));
            continue;
        }

        // Generic Headings
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            blocks.push(level <= 2 ? h1Block(headingMatch[2]) : h2Block(headingMatch[2]));
            continue;
        }

        // Bullet items
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
        if (bulletMatch) {
            blocks.push(bulletBlock(bulletMatch[1]));
            continue;
        }

        // Standard body paragraph
        blocks.push(bodyBlock(trimmed));
    }

    return blocks;
};

/* ─────────────────────────── Document Export Entry ─────────────────────────── */

export const buildObservationReportDocx = async ({ model, aiNarrative, reportType }) => {
    const isFresh = reportType === "FRESH_CORNER";
    const title = isFresh
        ? "DAILY FRESH PRODUCE PRICE INTELLIGENCE REPORT"
        : "WEEKLY ULTRA-SENSITIVE FMCG PRICE INTELLIGENCE REPORT";

    const subtitle = isFresh
        ? "20 Daily Fresh Produce Items · Real-Time Approved & Pending Market Audit"
        : "100 Ultra-Sensitive FMCG Goods · Carrefour 95% Parity Index Benchmark";

    const children = [];

    // 1. Formal Document Header
    children.push(
        new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: TW(2) },
            children: [
                new TextRun({
                    text: "QUEENS SUPERMARKET PLC - PRICE INTELLIGENCE REPORT",
                    bold: true,
                    font: FONT,
                    size: PT(14),
                    color: COLOR.NAVY_HEADING,
                }),
            ],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: TW(12) },
            children: [
                new TextRun({
                    text: subtitle,
                    font: FONT,
                    size: PT(9.5),
                    color: COLOR.TEXT_MUTED,
                }),
            ],
        })
    );

    // 2. Metadata Box Table
    const metadataRows = [
        [
            "Survey Target Date:",
            `${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
            "Reference Baseline:",
            `${model.period.name} (${model.period.id})`,
        ],
        [
            "Scope:",
            isFresh ? "Fresh Corner, Garment Market, Straight Market" : "Shoa, Abadir, Allmart, Bambis",
            "Prepared By:",
            "Pricing Intelligence Unit, Aires Communication PLC",
        ],
    ];
    const metaWidths = [1900, 2613, 1900, 2613];

    children.push(
        new Table({
            width: { size: CONTENT_WIDTH, type: WidthType.DXA },
            columnWidths: metaWidths,
            borders: { ...NO_BORDERS, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
            rows: metadataRows.map(
                (row) =>
                    new TableRow({
                        children: row.map(
                            (text, i) =>
                                new TableCell({
                                    width: { size: metaWidths[i], type: WidthType.DXA },
                                    margins: { top: 40, bottom: 40, left: 60, right: 60 },
                                    borders: NO_BORDERS,
                                    children: [
                                        new Paragraph({
                                            children: [
                                                new TextRun({
                                                    text,
                                                    bold: i % 2 === 0,
                                                    font: FONT,
                                                    size: PT(9.5),
                                                    color: i % 2 === 0 ? COLOR.TEXT_MUTED : COLOR.TEXT_DARK,
                                                }),
                                            ],
                                        }),
                                    ],
                                })
                        ),
                    })
            ),
        }),
        new Paragraph({ spacing: { after: TW(10) }, children: [] })
    );

    // 3. AI Synthesized Executive Section
    children.push(...markdownToDocx(aiNarrative));

    // 4. Master Price Matrix Section
    children.push(h1Block("2. Master Price & Competitor Matrix"));

    const sectionData = model.sections?.[0];
    if (sectionData) {
        const priceCols = sectionData.columns || [];
        const headers = ["No.", "Category & Item Name", "Unit", ...priceCols.map((c) => c.label)];

        const rows = [];
        let counter = 1;
        for (const cat of sectionData.categories || []) {
            for (const prod of cat.products || []) {
                rows.push([
                    String(counter++),
                    prod.name,
                    prod.unit || "kg",
                    ...priceCols.map((col) => {
                        const cell = prod.cells?.[col.key];
                        if (!cell) return "—";
                        if (cell.availability === "OUT_OF_STOCK") return "OUT OF STOCK";
                        if (cell.availability === "NOT_FOUND") return "—";
                        return cell.price !== null && cell.price !== undefined
                            ? `${Number(cell.price).toFixed(2)} ETB`
                            : "—";
                    }),
                ]);
            }
        }

        children.push(buildTable(headers, rows));
    }

    // 5. Verification Sign-off Block
    children.push(
        new Paragraph({
            spacing: { before: TW(18) },
            alignment: AlignmentType.RIGHT,
            children: [
                new TextRun({
                    text: "Verified & Finalized by: Aires Communication PLC / Carrefour Integration Team",
                    bold: true,
                    font: FONT,
                    size: PT(9.5),
                    color: COLOR.TEXT_MUTED,
                }),
            ],
        })
    );

    const doc = new Document({
        creator: "Aires-BI Pricing Intelligence",
        title,
        numbering: {
            config: [
                {
                    reference: "report-bullets",
                    levels: [
                        {
                            level: 0,
                            format: LevelFormat.BULLET,
                            text: "•",
                            alignment: AlignmentType.LEFT,
                            style: { paragraph: { indent: { left: 540, hanging: 270 } } },
                        },
                    ],
                },
            ],
        },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: PAGE.width, height: PAGE.height },
                        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
                    },
                },
                headers: {
                    default: new Header({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({
                                        text: "Aires-BI · Queens Supermarket Retail Price Intelligence",
                                        size: PT(8.5),
                                        font: FONT,
                                        color: COLOR.TEXT_MUTED,
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
                                alignment: AlignmentType.RIGHT,
                                children: [
                                    new TextRun({ text: "Page ", size: PT(8.5), font: FONT, color: COLOR.TEXT_MUTED }),
                                    new TextRun({ children: [PageNumber.CURRENT], size: PT(8.5), font: FONT, color: COLOR.TEXT_MUTED }),
                                ],
                            }),
                        ],
                    }),
                },
                children,
            },
        ],
    });

    return Packer.toBuffer(doc);
};