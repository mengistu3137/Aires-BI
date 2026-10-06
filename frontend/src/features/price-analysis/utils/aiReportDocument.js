/* ─────────────────────────────────────────────────────────────────────────────
    Executive AI Report — shared document engine.
    Markdown parsing + Word/Google-Docs-ready HTML export + client-side .docx
    (Times New Roman, professional tables). Consumed by the React modal.
────────────────────────────────────────────────────────────────────────────── */

/* ── Markdown parsing (single source of truth for all 3 renderers) ── */

export const INLINE_REGEX =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*)/g;

const isTableLine = (line) => /^\s*\|.*\|\s*$/.test(line);
const isSeparatorLine = (line) =>
    /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

const parseTableRow = (line) =>
    line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());

const isStructuralLine = (line) =>
    isTableLine(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^[-*•]\s+/.test(line) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(line) ||
    /^\*\*\s*[^*]+?\s*:\*\*/.test(line);

const isMostlyUppercase = (text) => {
    const clean = (text || "").replace(/\*/g, "").trim();
    const letters = clean.replace(/[^A-Za-z]/g, "");
    if (letters.length < 2) return false;
    const caps = letters.replace(/[^A-Z]/g, "").length;
    return caps / letters.length >= 0.7;
};

export const getCalloutIcon = (title) => {
    const t = (title || "").toLowerCase();
    if (t.includes("risk") || t.includes("warning") || t.includes("alert"))
        return "⚠️";
    if (t.includes("recommend") || t.includes("action")) return "✅";
    if (t.includes("opportunit")) return "🚀";
    return "💡";
};

export const padRow = (row, headerCount) =>
    row.length >= headerCount
        ? row
        : [...row, ...Array(headerCount - row.length).fill("")];

export const parseMarkdownToBlocks = (markdown) => {
    const lines = (markdown || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks = [];
    let i = 0;

    while (i < lines.length) {
        const trimmed = lines[i].trim();

        if (!trimmed) {
            i++;
            continue;
        }

        const plain = trimmed.replace(/\*/g, "");

        // 1. Table
        if (isTableLine(trimmed)) {
            const tableLines = [];
            while (i < lines.length && isTableLine(lines[i].trim())) {
                tableLines.push(lines[i].trim());
                i++;
            }
            const cleanRows = tableLines
                .filter((l) => !isSeparatorLine(l))
                .map(parseTableRow);
            if (cleanRows.length > 0) {
                blocks.push({
                    type: "table",
                    headers: cleanRows[0],
                    rows: cleanRows.slice(1),
                });
            }
            continue;
        }

        // 2. HR
        if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
            blocks.push({ type: "hr" });
            i++;
            continue;
        }

        // 3. ATX headings
        const atx = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (atx) {
            blocks.push({
                type: "heading",
                tone: atx[1].length <= 2 ? "main" : "sub",
                text: atx[2].replace(/\*/g, "").trim(),
            });
            i++;
            continue;
        }

        // 4. Bold caps title
        const boldTitle = trimmed.match(/^\*\*([^*]+)\*\*$/);
        if (boldTitle && isMostlyUppercase(boldTitle[1])) {
            blocks.push({ type: "heading", tone: "main", text: boldTitle[1].trim() });
            i++;
            continue;
        }

        // 5. Numbered main heading
        const mainNum = plain.match(/^(\d+\.)\s+(.+)$/);
        if (mainNum && isMostlyUppercase(mainNum[2])) {
            blocks.push({
                type: "heading",
                tone: "main",
                text: `${mainNum[1]} ${mainNum[2].trim()}`,
            });
            i++;
            continue;
        }

        // 6. Numbered sub heading (uppercase guard stops "1.5 liters" false positives)
        const subNum = plain.match(/^(\d+\.\d+)\s+([A-Z].{1,80})$/);
        if (subNum) {
            blocks.push({
                type: "heading",
                tone: "sub",
                text: `${subNum[1]} ${subNum[2].trim()}`,
            });
            i++;
            continue;
        }

        // 7. Callout
        const callout = trimmed.match(/^\*\*\s*([^*]+?)\s*:\*\*\s*(.*)$/);
        if (callout) {
            let body = callout[2].trim();
            i++;
            if (!body) {
                const bodyLines = [];
                while (i < lines.length) {
                    const next = lines[i].trim();
                    if (!next || isStructuralLine(next)) break;
                    bodyLines.push(next);
                    i++;
                }
                body = bodyLines.join(" ");
            }
            blocks.push({ type: "callout", title: callout[1].trim(), body });
            continue;
        }

        // 8. Bullet list
        if (/^[-*•]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
                items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
                i++;
            }
            blocks.push({ type: "list", items });
            continue;
        }

        // 9. Lead-in paragraph
        const lead = trimmed.match(/^([A-Z][^:\n*]{1,39}:)\s+(.+)$/);
        if (lead) {
            blocks.push({ type: "paragraph", lead: lead[1], text: lead[2].trim() });
            i++;
            continue;
        }

        // 10. Paragraph
        blocks.push({ type: "paragraph", text: trimmed });
        i++;
    }

    return blocks;
};

/* ── Report metadata (shared by all renderers) ── */
export const getReportMeta = (reportType, surveyPeriodName) => {
    const isFresh = reportType === "FRESH_CORNER";
    const isUltra = reportType === "ULTRA_SENSITIVE";

    let subtitle = "Comprehensive Daily Fresh Produce & FMCG Core Intelligence";
    let scope = "Fresh Corner, Garment, Straight Market, Shoa, Abadir, Allmart, Bambis";
    let fileSlug = "Comprehensive-All";

    if (isFresh) {
        subtitle = "20 Daily Fresh Produce Items · Real-Time Approved & Pending Market Audit";
        scope = "Fresh Corner, Garment Market, Straight Market, Queens Benchmark";
        fileSlug = "Daily-Fresh-20";
    } else if (isUltra) {
        subtitle = "100 Ultra-Sensitive FMCG Goods · Carrefour 95% Parity Index Benchmark";
        scope = "Shoa, Abadir, Allmart, Bambis";
        fileSlug = "FMCG-Core-100";
    }

    return {
        title: "QUEENS SUPERMARKET PLC - PRICE INTELLIGENCE REPORT",
        subtitle,
        date: new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        }),
        baseline: surveyPeriodName || "Active Period",
        scope,
        preparedBy: "Pricing Intelligence Unit, Aires Communication PLC",
        signoff: "Verified & Finalized by: Aires Communication PLC / Carrefour Integration Team",
        reportType,
        fileSlug,
    };
};

/* ─────────────────────────────────────────────────────────────────────────────
    Times New Roman HTML export.
    Every block carries INLINE styles (no CSS classes) so the markup is
    "paste-safe": copied straight into Word or Google Docs with headings,
    bold, and bordered tables intact. Used by the new-tab view AND clipboard.
────────────────────────────────────────────────────────────────────────────── */

const SERIF_STACK = "'Times New Roman','Liberation Serif',Times,serif";
const F = `font-family:${SERIF_STACK};`;

const esc = (s) =>
    String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const inlineHtml = (text) =>
    String(text || "")
        .split(INLINE_REGEX)
        .map((part) => {
            if (!part) return "";
            if (part.startsWith("***") && part.endsWith("***") && part.length >= 6)
                return `<b><i>${esc(part.slice(3, -3))}</i></b>`;
            if (part.startsWith("**") && part.endsWith("**") && part.length >= 4)
                return `<b>${esc(part.slice(2, -2))}</b>`;
            if (part.startsWith("*") && part.endsWith("*") && part.length >= 2)
                return `<i>${esc(part.slice(1, -1))}</i>`;
            return esc(part.replace(/\*{2,}/g, ""));
        })
        .join("");

const blockToInlineHtml = (b) => {
    switch (b.type) {
        case "heading":
            return b.tone === "main"
                ? `<h2 style="${F}font-size:13pt;font-weight:700;color:#1F4E79;margin:14pt 0 5pt;text-transform:uppercase;line-height:1.3;">${esc(b.text)}</h2>`
                : `<h3 style="${F}font-size:12pt;font-weight:700;color:#FE7914;margin:11pt 0 4pt;line-height:1.3;">${esc(b.text)}</h3>`;

        case "table": {
            const n = b.headers.length;
            const th = b.headers
                .map(
                    (h) =>
                        `<th style="${F}border:1px solid #1F4E79;background:#1F4E79;color:#FFFFFF;padding:4pt 6pt;text-align:left;font-size:9pt;font-weight:700;">${inlineHtml(h)}</th>`,
                )
                .join("");
            const rows = b.rows
                .map(
                    (r, i) =>
                        `<tr>${padRow(r, n)
                            .map(
                                (c) =>
                                    `<td style="${F}border:1px solid #A6B3C2;padding:4pt 6pt;font-size:10pt;${i % 2 ? "background:#F3F6FA;" : ""
                                    }">${inlineHtml(c)}</td>`,
                            )
                            .join("")}</tr>`,
                )
                .join("");
            return `<table style="border-collapse:collapse;width:100%;margin:7pt 0;"><thead><tr>${th}</tr></thead><tbody>${rows}</tbody></table>`;
        }

        case "callout":
            return (
                `<div style="border:1px solid #FE7914;border-left:4pt solid #FE7914;background:#FFF3E7;padding:7pt 10pt;margin:7pt 0;">` +
                `<div style="${F}font-size:9pt;font-weight:700;color:#C2410C;text-transform:uppercase;letter-spacing:.04em;">${getCalloutIcon(
                    b.title,
                )} ${esc(b.title)}</div>` +
                (b.body
                    ? `<p style="${F}font-size:11pt;margin:3pt 0 0;line-height:1.4;">${inlineHtml(b.body)}</p>`
                    : "") +
                `</div>`
            );

        case "hr":
            return `<hr style="border:0;border-top:1px solid #D8DFE8;margin:10pt 0;"/>`;

        case "list":
            return `<ul style="${F}font-size:11pt;margin:5pt 0;padding-left:18pt;line-height:1.4;">${b.items
                .map((it) => `<li style="margin:2.5pt 0;">${inlineHtml(it)}</li>`)
                .join("")}</ul>`;

        default:
            return b.lead
                ? `<p style="${F}font-size:11pt;margin:5pt 0;line-height:1.45;"><b>${esc(b.lead)}</b> ${inlineHtml(b.text)}</p>`
                : `<p style="${F}font-size:11pt;margin:5pt 0;line-height:1.45;">${inlineHtml(b.text)}</p>`;
    }
};

/** The full document body (title block + metadata + narrative + signoff). */
export const buildDocumentInnerHtml = (markdown, meta) => {
    const body = parseMarkdownToBlocks(markdown)
        .map(blockToInlineHtml)
        .join("\n");
    const cell = (label, value) =>
        `<td style="${F}border:0;padding:2pt 12pt 2pt 0;width:50%;vertical-align:top;">` +
        `<span style="font-size:8pt;font-weight:700;color:#8A94A6;text-transform:uppercase;letter-spacing:.05em;">${esc(label)}</span>` +
        `<br/><span style="font-size:10pt;color:#334155;">${esc(value)}</span></td>`;

    return `<header style="text-align:center;border-bottom:1px solid #E2E8F0;padding-bottom:10pt;margin-bottom:6pt;">
    <div style="${F}font-size:15pt;font-weight:700;color:#1F4E79;text-transform:uppercase;line-height:1.25;">${esc(meta.title)}</div>
    <div style="${F}font-size:10.5pt;color:#64748B;margin-top:2pt;">${esc(meta.subtitle)}</div>
</header>
<table style="border-collapse:collapse;width:100%;margin:2pt 0 10pt;">
    <tr>${cell("Survey Target Date", meta.date)}${cell("Reference Baseline", meta.baseline)}</tr>
    <tr>${cell("Scope", meta.scope)}${cell("Prepared By", meta.preparedBy)}</tr>
</table>
 ${body}
<footer style="margin-top:24pt;padding-top:8pt;border-top:1px solid #EEF2F6;text-align:right;">
    <span style="${F}font-size:9pt;color:#8A94A6;font-style:italic;">${esc(meta.signoff)}</span>
</footer>`;
};

/** Full standalone page (new tab): toolbar + A4 Times New Roman sheet. */
export const buildStandaloneHtml = (markdown, meta) => {
    const inner = buildDocumentInnerHtml(markdown, meta);
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(meta.title)} — ${esc(meta.baseline)}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#E2E8F0;font-family:Calibri,"Segoe UI",Arial,sans-serif;color:#1F2937}
.bar{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:10px 20px;background:#FFFFFF;border-bottom:1px solid #CBD5E1}
.bar .hint{font-size:12px;color:#64748B;max-width:55%}
.bar button{cursor:pointer;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font-size:12px;color:#FFFFFF;background:#A41821}
.bar button.alt{background:#1F4E79}
.bar button.on{background:#017C4D}
.page{width:210mm;min-height:297mm;margin:24px auto;background:#FFFFFF;padding:20mm 18mm;box-shadow:0 10px 30px rgba(15,23,42,.2);font-family:${SERIF_STACK};font-size:11pt;line-height:1.45;outline:none}
.page[contenteditable="true"]{box-shadow:0 0 0 3px rgba(1,124,77,.35),0 10px 30px rgba(15,23,42,.2)}
@media print{body{background:#FFFFFF}.bar{display:none}.page{margin:0;box-shadow:none!important;width:auto;min-height:0;padding:0}@page{size:A4;margin:14mm 16mm}}
@media (max-width:820px){.page{width:auto;margin:0;padding:20px}}
</style></head><body>
<div class="bar">
  <span class="hint" id="hint">Times New Roman · A4 — edit, copy into Word / Google Docs, or print to PDF.</span>
  <span style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="alt" id="edit">Enable editing</button>
    <button id="copy">Copy for Word / Google Docs</button>
    <button class="on" id="print">Print / Save PDF</button>
  </span>
</div>
<article class="page" id="page">${inner}</article>
<script>
(function(){
  var p=document.getElementById("page");
  var b=document.getElementById("edit");
  b.onclick=function(){
    var on=p.getAttribute("contenteditable")!=="true";
    p.setAttribute("contenteditable",on?"true":"false");
    b.textContent=on?"Editing on — click to lock":"Enable editing";
    b.classList.toggle("on",on);
    if(on){p.focus();}
  };
  document.getElementById("print").onclick=function(){window.print();};
  document.getElementById("copy").onclick=function(){copyDoc().then(flash);};
  function flash(msg){
    var h=document.getElementById("hint"),old=h.textContent;
    h.textContent=msg;
    setTimeout(function(){h.textContent=old;},3000);
  }
  async function copyDoc(){
    var html='<div style="font-family:\\'Times New Roman\\',Times,serif">'+p.innerHTML+'</div>';
    var ok=false;
    try{
      if(navigator.clipboard&&window.ClipboardItem){
        await navigator.clipboard.write([new ClipboardItem({
          "text/html":new Blob([html],{type:"text/html"}),
          "text/plain":new Blob([p.innerText||""],{type:"text/plain"})
        })]);
        ok=true;
      }
    }catch(e){}
    if(!ok){
      try{
        var r=document.createRange();r.selectNodeContents(p);
        var s=window.getSelection();s.removeAllRanges();s.addRange(r);
        ok=document.execCommand("copy");
        s.removeAllRanges();
      }catch(e2){}
    }
    return ok
      ?"Copied! Paste into Word or Google Docs — formatting is kept."
      :"Copy failed — press Ctrl+A inside the page, then Ctrl+C.";
  }
})();
</script>
</body></html>`;
};

/* ── Rich clipboard helper (text/html + text/plain, legacy fallback) ── */

export const copyRichTextToClipboard = async (html, plainText) => {
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/html": new Blob([html], { type: "text/html" }),
                    "text/plain": new Blob([plainText || ""], {
                        type: "text/plain",
                    }),
                }),
            ]);
            return true;
        }
    } catch (_) {
        /* fall through to legacy path */
    }
    try {
        const holder = document.createElement("div");
        holder.setAttribute("contenteditable", "true");
        holder.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;";
        holder.innerHTML = html;
        document.body.appendChild(holder);
        const range = document.createRange();
        range.selectNodeContents(holder);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        const ok = document.execCommand("copy");
        sel.removeAllRanges();
        document.body.removeChild(holder);
        return ok;
    } catch (_) {
        return false;
    }
};

/* ─────────────────────────────────────────────────────────────────────────────
    Client-side .docx generation (the `docx` npm package, loaded on demand).
    Real Word document: Times New Roman default style, navy/orange headings,
    grid-bordered tables with repeating header rows, A4 pages, page numbers.
    Fully editable in Microsoft Word and importable into Google Docs.
────────────────────────────────────────────────────────────────────────────── */

export const DOCX_FONT = "Times New Roman";

export const buildAiReportDocxBlob = async (markdown, meta) => {
    const {
        Document,
        Packer,
        Paragraph,
        TextRun,
        Table,
        TableRow,
        TableCell,
        WidthType,
        BorderStyle,
        ShadingType,
        AlignmentType,
        Footer,
        PageNumber,
    } = await import("docx");

    const NAVY = "1F4E79";
    const ORANGE = "FE7914";
    const GRAY = "64748B";
    const LIGHT = "94A3B8";

    const run = (text, o = {}) =>
        new TextRun({
            text: String(text ?? ""),
            bold: o.bold || false,
            italics: o.italics || false,
            color: o.color,
            size: o.size || 22, // half-points → 11pt body
            font: DOCX_FONT,
            allCaps: o.allCaps || false,
        });

    const inlineRuns = (text, base = {}) => {
        const parts = String(text || "").split(INLINE_REGEX);
        const runs = [];
        for (const part of parts) {
            if (!part) continue;
            if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
                runs.push(run(part.slice(3, -3), { ...base, bold: true, italics: true }));
            } else if (
                part.startsWith("**") &&
                part.endsWith("**") &&
                part.length >= 4
            ) {
                runs.push(run(part.slice(2, -2), { ...base, bold: true }));
            } else if (
                part.startsWith("*") &&
                part.endsWith("*") &&
                part.length >= 2
            ) {
                runs.push(run(part.slice(1, -1), { ...base, italics: true }));
            } else {
                runs.push(run(part.replace(/\*{2,}/g, ""), base));
            }
        }
        return runs.length ? runs : [run("")];
    };

    const thin = { style: BorderStyle.SINGLE, size: 4, color: "B7C3D2" };
    const tableBorders = {
        top: thin,
        bottom: thin,
        left: thin,
        right: thin,
        insideHorizontal: thin,
        insideVertical: thin,
    };
    const cellPad = { top: 60, bottom: 60, left: 110, right: 110 };
    // Word merges adjacent tables — always separate them with a spacer paragraph.
    const spacer = () => new Paragraph({ text: "", spacing: { after: 60 } });

    const children = [];

    // ── Title block ──
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [run(meta.title, { bold: true, size: 30, color: NAVY, allCaps: true })],
        }),
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            border: {
                bottom: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 6 },
            },
            children: [run(meta.subtitle, { size: 20, color: GRAY, italics: true })],
        }),
    );

    // ── Metadata block ──
    const metaRow = (label, value) => [
        run(`${label}:  `, { bold: true, size: 20, color: "475569" }),
        run(value, { size: 20 }),
    ];
    children.push(
        new Paragraph({ spacing: { after: 30 }, children: metaRow("Survey Target Date", meta.date) }),
        new Paragraph({ spacing: { after: 30 }, children: metaRow("Reference Baseline", meta.baseline) }),
        new Paragraph({ spacing: { after: 30 }, children: metaRow("Scope", meta.scope) }),
        new Paragraph({ spacing: { after: 140 }, children: metaRow("Prepared By", meta.preparedBy) }),
    );

    // ── Narrative body ──
    for (const b of parseMarkdownToBlocks(markdown)) {
        switch (b.type) {
            case "heading":
                children.push(
                    b.tone === "main"
                        ? new Paragraph({
                            spacing: { before: 300, after: 120 },
                            keepNext: true,
                            children: [
                                run(b.text, { bold: true, size: 26, color: NAVY, allCaps: true }),
                            ],
                        })
                        : new Paragraph({
                            spacing: { before: 220, after: 80 },
                            keepNext: true,
                            children: [run(b.text, { bold: true, size: 24, color: ORANGE })],
                        }),
                );
                break;

            case "table": {
                const n = b.headers.length;
                const headerRow = new TableRow({
                    tableHeader: true, // repeats when the table spans pages
                    children: b.headers.map(
                        (h) =>
                            new TableCell({
                                shading: { type: ShadingType.CLEAR, fill: NAVY },
                                margins: cellPad,
                                children: [
                                    new Paragraph({
                                        children: inlineRuns(h, {
                                            bold: true,
                                            color: "FFFFFF",
                                            size: 18,
                                        }),
                                    }),
                                ],
                            }),
                    ),
                });
                const bodyRows = b.rows.map(
                    (row, rIdx) =>
                        new TableRow({
                            children: padRow(row, n).map(
                                (c) =>
                                    new TableCell({
                                        margins: cellPad,
                                        shading:
                                            rIdx % 2 === 1
                                                ? { type: ShadingType.CLEAR, fill: "F3F6FA" }
                                                : undefined,
                                        children: [
                                            new Paragraph({ children: inlineRuns(c, { size: 20 }) }),
                                        ],
                                    }),
                            ),
                        }),
                );
                children.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: tableBorders,
                        rows: [headerRow, ...bodyRows],
                    }),
                    spacer(),
                );
                break;
            }

            case "callout": {
                const paras = [
                    new Paragraph({
                        spacing: { after: 40 },
                        children: [
                            run(`${getCalloutIcon(b.title)}  ${b.title.toUpperCase()}`, {
                                bold: true,
                                size: 18,
                                color: "C2410C",
                            }),
                        ],
                    }),
                ];
                if (b.body) {
                    paras.push(new Paragraph({ children: inlineRuns(b.body) }));
                }
                children.push(
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        borders: {
                            top: { style: BorderStyle.SINGLE, size: 4, color: "F3B888" },
                            bottom: { style: BorderStyle.SINGLE, size: 4, color: "F3B888" },
                            left: { style: BorderStyle.SINGLE, size: 24, color: ORANGE },
                            right: { style: BorderStyle.SINGLE, size: 4, color: "F3B888" },
                            insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                            insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                        },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({
                                        shading: { type: ShadingType.CLEAR, fill: "FFF3E7" },
                                        margins: { top: 100, bottom: 100, left: 160, right: 160 },
                                        children: paras,
                                    }),
                                ],
                            }),
                        ],
                    }),
                    spacer(),
                );
                break;
            }

            case "hr":
                children.push(
                    new Paragraph({
                        spacing: { before: 140, after: 140 },
                        border: {
                            bottom: { style: BorderStyle.SINGLE, size: 6, color: "D8DFE8", space: 1 },
                        },
                        text: "",
                    }),
                );
                break;

            case "list":
                for (const item of b.items) {
                    children.push(
                        new Paragraph({
                            bullet: { level: 0 },
                            spacing: { after: 40 },
                            children: inlineRuns(item),
                        }),
                    );
                }
                break;

            default:
                children.push(
                    b.lead
                        ? new Paragraph({
                            spacing: { after: 60 },
                            children: [run(`${b.lead} `, { bold: true }), ...inlineRuns(b.text)],
                        })
                        : new Paragraph({
                            spacing: { after: 60 },
                            children: inlineRuns(b.text),
                        }),
                );
        }
    }

    // ── Signoff ──
    children.push(
        new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 480 },
            border: {
                top: { style: BorderStyle.SINGLE, size: 6, color: "E2E8F0", space: 8 },
            },
            children: [run(meta.signoff, { size: 18, color: LIGHT, italics: true })],
        }),
    );

    const doc = new Document({
        creator: "Aires Communication PLC",
        title: meta.title,
        description: meta.subtitle,
        // Everything the user later types in Word defaults to Times New Roman 11pt.
        styles: {
            default: {
                document: { run: { font: DOCX_FONT, size: 22 } },
            },
        },
        sections: [
            {
                properties: {
                    page: {
                        size: { width: 11906, height: 16838 }, // A4 portrait
                        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
                    },
                },
                footers: {
                    default: new Footer({
                        children: [
                            new Paragraph({
                                alignment: AlignmentType.CENTER,
                                children: [
                                    run("Queens Supermarket PLC — Price Intelligence  ·  Page ", {
                                        size: 16,
                                        color: LIGHT,
                                    }),
                                    new TextRun({
                                        children: [PageNumber.CURRENT],
                                        size: 16,
                                        color: LIGHT,
                                        font: DOCX_FONT,
                                    }),
                                ],
                            }),
                        ],
                    }),
                },
                children,
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    const stamp = new Date().toISOString().slice(0, 10);
    return {
        blob,
        filename: `Queens-Price-Intelligence-${meta.fileSlug}-${stamp}.docx`,
    };
};