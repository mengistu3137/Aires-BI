import React, { useState, useMemo } from "react";
import { getAiReportSummaryRequest } from "@/services/api/report.api.js";
import toast from "react-hot-toast";
import {
	INLINE_REGEX,
	parseMarkdownToBlocks,
	getReportMeta,
	getCalloutIcon,
	padRow,
	buildStandaloneHtml,
	buildDocumentInnerHtml,
	copyRichTextToClipboard,
	buildAiReportDocxBlob,
} from "../utils/aiReportDocument.js";

const SERIF_STACK = "'Times New Roman', 'Liberation Serif', Times, serif";

/* ── React inline markdown renderer ── */

export const renderFormattedInline = (text) => {
	if (!text) return null;
	const parts = String(text).split(INLINE_REGEX);

	return parts.map((part, idx) => {
		if (!part) return null;
		if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
			return (
				<strong key={idx} className="font-bold italic text-slate-900">
					{part.slice(3, -3)}
				</strong>
			);
		}
		if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
			return (
				<strong key={idx} className="font-bold text-slate-900">
					{part.slice(2, -2)}
				</strong>
			);
		}
		if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
			return (
				<em key={idx} className="italic text-slate-700">
					{part.slice(1, -1)}
				</em>
			);
		}
		return (
			<React.Fragment key={idx}>{part.replace(/\*{2,}/g, "")}</React.Fragment>
		);
	});
};

/* ── React block renderer (Word-look tables: full grid, square corners) ── */

const renderBlock = (block, idx, isA4View) => {
	const bodyClass = isA4View ? "text-[13px]" : "text-sm";
	const cellClass = isA4View ? "text-[11px]" : "text-xs";
	const mainHeadingClass = isA4View ? "text-[15px]" : "text-base";

	switch (block.type) {
		case "heading":
			return block.tone === "main" ? (
				<h2
					key={idx}
					className={`${mainHeadingClass} font-bold uppercase tracking-wide text-[#1F4E79] mt-4 mb-1.5 first:mt-0`}
				>
					{block.text}
				</h2>
			) : (
				<h3
					key={idx}
					className="text-[13px] font-bold text-[#FE7914] mt-3 mb-1 first:mt-0"
				>
					{block.text}
				</h3>
			);

		case "table": {
			const headerCount = block.headers.length;
			return (
				<div key={idx} className="my-2 overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								{block.headers.map((header, cIdx) => (
									<th
										key={cIdx}
										className="border border-slate-400 bg-[#1F4E79] px-3 py-1.5 text-left text-[10px] font-bold uppercase tracking-wide text-white whitespace-nowrap"
									>
										{renderFormattedInline(header)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row, rIdx) => (
								<tr
									key={rIdx}
									className={rIdx % 2 === 1 ? "bg-slate-50" : "bg-white"}
								>
									{padRow(row, headerCount).map((cell, cIdx) => (
										<td
											key={cIdx}
											className={`border border-slate-300 px-3 py-1.5 font-medium text-slate-800 ${cellClass}`}
										>
											{renderFormattedInline(cell)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			);
		}

		case "callout":
			return (
				<div
					key={idx}
					className="flex items-start gap-2.5 rounded-xl border border-[#FE7914]/40 border-l-4 bg-[#FE7914]/5 px-3.5 py-3"
				>
					<span className="mt-0.5 flex-none text-sm leading-none">
						{getCalloutIcon(block.title)}
					</span>
					<div className="min-w-0">
						<p className="text-[10px] font-black uppercase tracking-wider text-[#C2410C]">
							{block.title}
						</p>
						{block.body && (
							<p className={`mt-1 leading-relaxed text-slate-700 ${bodyClass}`}>
								{renderFormattedInline(block.body)}
							</p>
						)}
					</div>
				</div>
			);

		case "hr":
			return <div key={idx} className="my-3 h-px w-full bg-slate-200" />;

		case "list":
			return (
				<div key={idx} className="space-y-1.5 py-0.5 pl-1">
					{block.items.map((item, itemIdx) => (
						<div
							key={itemIdx}
							className="flex items-start gap-2 leading-relaxed"
						>
							<span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-[#A41821]/60" />
							<span className={`min-w-0 text-slate-700 ${bodyClass}`}>
								{renderFormattedInline(item)}
							</span>
						</div>
					))}
				</div>
			);

		case "paragraph":
		default:
			if (block.lead) {
				return (
					<p
						key={idx}
						className={`leading-relaxed text-slate-700 ${bodyClass}`}
					>
						<strong className="font-bold text-slate-900">{block.lead} </strong>
						{renderFormattedInline(block.text)}
					</p>
				);
			}
			return (
				<p key={idx} className={`leading-relaxed text-slate-700 ${bodyClass}`}>
					{renderFormattedInline(block.text)}
				</p>
			);
	}
};

const FormattedDocumentViewer = ({ markdown, isA4View = false }) => {
	const blocks = useMemo(() => parseMarkdownToBlocks(markdown), [markdown]);
	if (!blocks.length) return null;
	return (
		<div className={isA4View ? "space-y-3" : "space-y-4"}>
			{blocks.map((block, idx) => renderBlock(block, idx, isA4View))}
		</div>
	);
};

/* ── A4 preview — emulates the printed Word page in Times New Roman ── */

const A4Preview = ({ markdown, meta }) => (
	<div
		className="mx-auto max-w-2xl bg-white border border-slate-300 rounded-sm shadow-xl p-8 sm:p-12 space-y-5 text-slate-800"
		style={{ fontFamily: SERIF_STACK }}
	>
		<div className="border-b border-slate-200 pb-4 text-center space-y-1">
			<h1 className="text-lg font-bold tracking-tight text-[#1F4E79] uppercase leading-snug">
				{meta.title}
			</h1>
			<p className="text-xs italic text-slate-500">{meta.subtitle}</p>
		</div>

		<div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[11px] border-b border-slate-100 pb-3 text-slate-700">
			{[
				["Survey Target Date:", meta.date],
				["Reference Baseline:", meta.baseline],
				["Scope:", meta.scope],
				["Prepared By:", meta.preparedBy],
			].map(([label, value]) => (
				<div key={label}>
					<span className="font-bold text-slate-400 block text-[9px] uppercase tracking-wide">
						{label}
					</span>
					<span className="font-medium text-slate-800">{value}</span>
				</div>
			))}
		</div>

		<div className="leading-relaxed">
			<FormattedDocumentViewer markdown={markdown} isA4View={true} />
		</div>

		<div className="pt-6 border-t border-slate-100 text-right text-[10px] italic text-slate-400">
			{meta.signoff}
		</div>
	</div>
);

/* ── Modal ── */

const VIEW_TABS = [
	{ id: "DOCS_A4", label: "📄 Word (A4)" },
	{ id: "NARRATIVE", label: "📝 Narrative" },
	{ id: "EDIT", label: "✏️ Edit" },
];

export const ExecutiveAiReportModal = ({
	isOpen,
	onClose,
	surveyPeriodId,
	surveyPeriodName,
}) => {
	const [reportType, setReportType] = useState("FRESH_CORNER");
	const [viewMode, setViewMode] = useState("DOCS_A4"); // DOCS_A4 | NARRATIVE | EDIT
	const [aiData, setAiData] = useState(null);
	const [draft, setDraft] = useState(""); // editable markdown — source of truth
	const [isGenerating, setIsGenerating] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);

	const meta = useMemo(
		() => getReportMeta(reportType, surveyPeriodName),
		[reportType, surveyPeriodName],
	);

	if (!isOpen) return null;

	const isEdited = !!aiData && draft !== (aiData.narrative || "");
	const isEditing = viewMode === "EDIT";

	const handleGenerate = async (force = false) => {
		setIsGenerating(true);
		if (force) setAiData(null);
		try {
			const data = await getAiReportSummaryRequest({
				surveyPeriodId,
				reportType,
				forceRefresh: force,
			});
			setAiData(data);
			if (data?.isCached) {
				toast("Loaded cached summary (Data unchanged)", { icon: "⚡" });
			} else {
				toast.success("Executive intelligence brief generated ✓");
			}
		} catch (err) {
			toast.error(
				err?.response?.data?.message || "Failed to generate AI brief",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSelectType = (type) => {
		if (
			isEdited &&
			!window.confirm("Switching scope will discard your edits. Continue?")
		)
			return;
		setReportType(type);
		setAiData(null);
		setDraft("");
		setViewMode("DOCS_A4");
	};

	/* Open the full Times New Roman A4 document in a new browser tab —
       editable, printable to PDF, and copyable into Word / Google Docs. */
	const handleOpenInNewTab = () => {
		const html = buildStandaloneHtml(draft, meta);
		const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
		const win = window.open(url, "_blank");
		if (!win) {
			URL.revokeObjectURL(url);
			toast.error("Pop-up blocked — allow pop-ups to open the document.");
			return;
		}
		// Give the new tab time to load before releasing the blob.
		setTimeout(() => URL.revokeObjectURL(url), 60_000);
	};

	/* Copy the fully-styled document to the clipboard as rich text —
       paste directly into Word or Google Docs with formatting intact. */
	const handleCopyForDocs = async () => {
		const inner = buildDocumentInnerHtml(draft, meta);
		const html = `<div style="font-family:'Times New Roman',Times,serif;">${inner}</div>`;
		const plain = (draft || "").replace(/[*#]/g, "");
		const ok = await copyRichTextToClipboard(html, plain);
		if (ok) {
			toast.success("Copied — paste into Word or Google Docs ✓");
		} else {
			toast.error("Copy failed — use “Open in New Tab” and copy there.");
		}
	};

	/* Client-side .docx: Times New Roman, real Word tables, includes edits. */
	const handleDownloadDocx = async () => {
		setIsDownloading(true);
		try {
			const { blob, filename } = await buildAiReportDocxBlob(draft, meta);

			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			toast.success("Word document downloaded ✓");
		} catch (err) {
			const msg = String(err?.message || "");
			toast.error(
				msg.includes("Failed to fetch") || msg.includes("Unable to load")
					? "Word export library missing — run: npm install docx"
					: "Failed to generate Word document",
			);
		} finally {
			setIsDownloading(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
			<div
				className={`relative flex flex-col w-full ${
					isEditing ? "max-w-6xl" : "max-w-4xl"
				} max-h-[92vh] bg-slate-100 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all`}
			>
				{/* Topbar */}
				<div className="flex items-center justify-between gap-3 px-5 py-3.5 bg-white border-b border-slate-200 flex-none">
					<div className="flex items-center gap-2">
						<span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[#FE7914] text-[11px] font-black text-white">
							✦
						</span>
						<div>
							<h2 className="text-sm font-black text-slate-900 leading-tight">
								Executive AI Intelligence Report
							</h2>
							<p className="text-[11px] text-slate-500 font-medium">
								{surveyPeriodName || "Survey Cycle"}
								{isEdited && (
									<span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
										EDITED
									</span>
								)}
							</p>
						</div>
					</div>

					{aiData && (
						<div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
							{VIEW_TABS.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setViewMode(tab.id)}
									className={`px-3 py-1 rounded-lg transition cursor-pointer ${
										viewMode === tab.id
											? "bg-white text-slate-900 shadow-2xs"
											: "text-slate-500 hover:text-slate-800"
									}`}
								>
									{tab.label}
								</button>
							))}
						</div>
					)}

					<button
						type="button"
						onClick={onClose}
						className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer rounded-lg"
					>
						✕
					</button>
				</div>

				{/* Content */}
				<div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
					{/* Scope Selector */}
					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Select Intelligence Stream Scope
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<button
								type="button"
								disabled={isGenerating}
								onClick={() => handleSelectType("FRESH_CORNER")}
								className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer bg-white ${
									reportType === "FRESH_CORNER"
										? "border-[#017C4D] ring-2 ring-[#017C4D]/30"
										: "border-slate-200 hover:bg-slate-50"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-900">
										🥬 Daily Fresh Produce
									</span>
									<span className="font-mono text-[10px] font-bold text-[#017C4D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
										20 Products
									</span>
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									Daily morning shift. Evaluates approved &amp; pending prices
									across Fresh Corner, Garment, and Lamberet ex-factory gates.
								</p>
							</button>

							<button
								type="button"
								disabled={isGenerating}
								onClick={() => handleSelectType("ULTRA_SENSITIVE")}
								className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer bg-white ${
									reportType === "ULTRA_SENSITIVE"
										? "border-[#A41821] ring-2 ring-[#A41821]/30"
										: "border-slate-200 hover:bg-slate-50"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-900">
										🛒 Weekly FMCG Core
									</span>
									<span className="font-mono text-[10px] font-bold text-[#A41821] bg-red-50 px-2 py-0.5 rounded border border-red-200">
										100 Products
									</span>
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									Full weekly survey. Evaluates 95% Carrefour target parity,
									price drift, and margin recovery across Shoa, Abadir, Allmart,
									and Bambis.
								</p>
							</button>
						</div>
					</div>

					{/* Generate */}
					{!aiData && (
						<div className="py-8 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
							<button
								type="button"
								onClick={handleGenerate}
								disabled={isGenerating}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-6 py-3 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
							>
								{isGenerating ? (
									<>
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										<span>Generating summary...</span>
									</>
								) : (
									<span>
										✦ Generate{" "}
										{reportType === "FRESH_CORNER"
											? "Daily Fresh Produce (20 Items)"
											: "Weekly FMCG Core (100 Items)"}{" "}
										Brief
									</span>
								)}
							</button>
						</div>
					)}

					{/* Document area */}
					{aiData && (
						<div className="space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2 px-1">
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
										{viewMode === "DOCS_A4" &&
											"Word Document Preview (A4 · Times New Roman)"}
										{viewMode === "NARRATIVE" && "Clean Executive Narrative"}
										{viewMode === "EDIT" && "Edit Markdown · Live A4 Preview"}
									</span>
									{aiData.isCached && (
										<span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[9px] font-bold text-[#017C4D]">
											⚡ Instant (Data Unchanged)
										</span>
									)}
								</div>
								<div className="flex items-center gap-3">
									{isEdited && (
										<button
											type="button"
											onClick={() => setDraft(aiData.narrative || "")}
											className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
										>
											Reset to AI original
										</button>
									)}
									<button
										type="button"
										onClick={() => handleGenerate(true)} // ← Pass true for forceRefresh
										disabled={isGenerating}
										className="text-[11px] font-bold text-[#A41821] hover:underline cursor-pointer disabled:opacity-50"
									>
										Regenerate
									</button>
								</div>
							</div>

							{/* Mobile view switcher */}
							<div className="flex sm:hidden gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-[11px] font-bold">
								{VIEW_TABS.map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setViewMode(tab.id)}
										className={`flex-1 px-2 py-1 rounded-lg ${
											viewMode === tab.id
												? "bg-white text-slate-900 shadow-2xs"
												: "text-slate-500"
										}`}
									>
										{tab.label}
									</button>
								))}
							</div>

							{viewMode === "DOCS_A4" && (
								<A4Preview markdown={draft} meta={meta} />
							)}

							{viewMode === "NARRATIVE" && (
								<div className="max-h-[600px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
									<FormattedDocumentViewer markdown={draft} isA4View={false} />
								</div>
							)}

							{viewMode === "EDIT" && (
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									<div className="flex flex-col">
										<textarea
											value={draft}
											onChange={(e) => setDraft(e.target.value)}
											spellCheck
											className="min-h-[520px] lg:h-[640px] w-full resize-y rounded-xl border border-slate-300 bg-white p-4 font-mono text-[12px] leading-relaxed text-slate-800 shadow-xs focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
										/>
										<p className="mt-1.5 text-[10px] text-slate-500">
											Tip: <code>## Heading</code>,{" "}
											<code>**Key Insight:** text</code> for callouts,{" "}
											<code>- item</code> for bullets, and{" "}
											<code>| a | b |</code> for tables. Edits flow into the
											preview, new tab, clipboard copy, and the .docx download.
										</p>
									</div>
									<div className="lg:h-[640px] overflow-y-auto rounded-xl bg-slate-200/60 p-3">
										<A4Preview markdown={draft} meta={meta} />
									</div>
								</div>
							)}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-slate-200 flex-none bg-white">
					<button
						type="button"
						onClick={onClose}
						className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
					>
						Close
					</button>

					{aiData && (
						<div className="flex flex-wrap items-center gap-2">
							<button
								type="button"
								onClick={handleCopyForDocs}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
								title="Copy formatted document — paste into Word or Google Docs"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
									/>
								</svg>
								<span>Copy for Word / Google Docs</span>
							</button>

							<button
								type="button"
								onClick={handleOpenInNewTab}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1F4E79] bg-white px-4 py-2.5 text-xs font-bold text-[#1F4E79] hover:bg-[#1F4E79]/5 transition active:scale-95"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
								<span>Open in New Tab</span>
							</button>

							<button
								type="button"
								onClick={handleDownloadDocx}
								disabled={isDownloading}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#017C4D] hover:bg-[#015E3A] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
							>
								<svg
									className="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<span>
									{isDownloading
										? "Building Word Doc..."
										: isEdited
											? "Download Edited Word (.docx)"
											: "Download Word (.docx)"}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};