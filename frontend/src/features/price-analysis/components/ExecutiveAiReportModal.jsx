import React, { useState, useEffect, useMemo } from "react";
import {
	getAiReportSummaryRequest,
	downloadReportRequest,
} from "@/services/api/report.api.js";
import { useSurveyPeriods } from "@/features/survey/hooks/useSurveyPeriods.js";
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

const GatheredDataView = ({ sections }) => {
	if (!sections || sections.length === 0) {
		return (
			<div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
				<p className="text-xs text-slate-500">
					No competitor matrix data returned for this range.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{sections.map((section, sIdx) => (
				<div
					key={sIdx}
					className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs"
				>
					<div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
						<div>
							<h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
								{section.label}
							</h3>
							<p className="text-[11px] text-slate-500">
								{section.description}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200/60 text-slate-700 px-2.5 py-1 rounded-lg">
								{section.summary?.totals?.products || 0} Products
							</span>
							<span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">
								{section.summary?.totals?.coveragePct || 0}% Coverage
							</span>
						</div>
					</div>

					<div className="overflow-x-auto">
						<table className="w-full border-collapse text-left text-xs">
							<thead>
								<tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
									<th className="px-3.5 py-2.5">Product</th>
									<th className="px-2.5 py-2.5 w-16">Unit</th>
									{section.columns.map((col) => (
										<th
											key={col.key}
											className={`px-3 py-2.5 ${
												col.kind === "QUEENS"
													? "bg-amber-50/80 text-amber-900 font-black border-l border-amber-200"
													: ""
											}`}
										>
											{col.label}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{section.categories?.map((cat) => (
									<React.Fragment key={cat.name}>
										<tr className="bg-slate-50/60">
											<td
												colSpan={section.columns.length + 2}
												className="px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"
											>
												{cat.name} ({cat.products.length})
											</td>
										</tr>
										{cat.products.map((prod) => (
											<tr
												key={prod.id}
												className="hover:bg-slate-50/50 transition"
											>
												<td className="px-3.5 py-2 font-semibold text-slate-800">
													{prod.name}
													{prod.code && (
														<span className="block font-mono text-[9px] text-slate-400">
															{prod.code}
														</span>
													)}
												</td>
												<td className="px-2.5 py-2 text-slate-500 font-mono text-[11px]">
													{prod.unit}
												</td>
												{section.columns.map((col) => {
													const cell = prod.cells?.[col.key];
													if (!cell) {
														return (
															<td
																key={col.key}
																className="px-3 py-2 text-slate-300 italic font-mono text-[11px]"
															>
																—
															</td>
														);
													}
													const isAvailable = cell.availability === "AVAILABLE";
													return (
														<td
															key={col.key}
															className={`px-3 py-2 ${
																col.kind === "QUEENS"
																	? "bg-amber-50/40 border-l border-amber-100 font-black"
																	: ""
															}`}
														>
															{isAvailable && cell.price !== null ? (
																<span className="font-mono font-bold text-slate-900">
																	{cell.price.toFixed(2)} ETB
																</span>
															) : (
																<span className="inline-flex rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-700">
																	{cell.availability?.replace(/_/g, " ") ||
																		"OUT OF STOCK"}
																</span>
															)}
														</td>
													);
												})}
											</tr>
										))}
									</React.Fragment>
								))}
							</tbody>
						</table>
					</div>
				</div>
			))}
		</div>
	);
};

const VIEW_TABS = [
	{ id: "DOCS_A4", label: "📄 Word (A4)" },
	{ id: "GATHERED_DATA", label: "📊 Gathered Data" },
	{ id: "NARRATIVE", label: "📝 Narrative" },
	{ id: "EDIT", label: "✏️ Edit" },
];

const RANGE_OPTIONS = [
	{ id: "PERIOD", label: "Current Cycle" },
	{ id: "WEEK", label: "Past 7 Days" },
	{ id: "MONTH", label: "Past 30 Days" },
	{ id: "CUSTOM", label: "Custom Range" },
];

export const ExecutiveAiReportModal = ({
	isOpen,
	onClose,
	surveyPeriodId,
	surveyPeriodName,
}) => {
	const { data: periods = [] } = useSurveyPeriods();

	const [reportType, setReportType] = useState("ALL");
	const [rangeType, setRangeType] = useState("PERIOD");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [selectedCycleId, setSelectedCycleId] = useState(surveyPeriodId || "");

	const [viewMode, setViewMode] = useState("DOCS_A4");
	const [aiData, setAiData] = useState(null);
	const [draft, setDraft] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

	// Keep the in-modal picker in sync when the parent cycle prop changes
	useEffect(() => {
		if (surveyPeriodId) setSelectedCycleId(surveyPeriodId);
	}, [surveyPeriodId]);

	// <select> values are always strings — compare defensively against record ids
	const activePeriodRecord = useMemo(
		() => periods.find((p) => String(p.id) === String(selectedCycleId)),
		[periods, selectedCycleId],
	);

	const activePeriodLabel = useMemo(() => {
		if (rangeType === "WEEK") return "Past 7 Days";
		if (rangeType === "MONTH") return "Past 30 Days";
		if (rangeType === "CUSTOM" && startDate && endDate)
			return `${startDate} to ${endDate}`;
		return (
			activePeriodRecord?.name || surveyPeriodName || "Active Survey Cycle"
		);
	}, [rangeType, startDate, endDate, activePeriodRecord, surveyPeriodName]);

	const meta = useMemo(
		() => getReportMeta(reportType, activePeriodLabel),
		[reportType, activePeriodLabel],
	);

	if (!isOpen) return null;

	const isEdited = !!aiData && draft !== (aiData.narrative || "");
	const isEditing = viewMode === "EDIT";

	const handleGenerate = async (force = false) => {
		if (rangeType === "CUSTOM" && (!startDate || !endDate)) {
			toast.error("Please pick both start and end dates for custom range.");
			return;
		}

		setIsGenerating(true);
		if (force) setAiData(null);
		try {
			const data = await getAiReportSummaryRequest({
				surveyPeriodId:
					rangeType === "PERIOD" ? selectedCycleId || undefined : undefined,
				rangeType,
				startDate: rangeType === "CUSTOM" ? startDate : undefined,
				endDate: rangeType === "CUSTOM" ? endDate : undefined,
				reportType: reportType === "ALL" ? undefined : reportType,
				forceRefresh: force,
			});
			setAiData(data);
			setDraft(data?.narrative || "");
			toast.success("Executive intelligence brief & market data loaded ✓");
		} catch (err) {
			toast.error(
				err?.response?.data?.message || "Failed to generate AI brief",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const handleSelectScope = (type) => {
		if (
			isEdited &&
			!window.confirm("Switching stream scope will discard edits. Continue?")
		)
			return;
		setReportType(type);
		setAiData(null);
		setDraft("");
		setViewMode("DOCS_A4");
	};

	const handleSelectRange = (range) => {
		if (
			isEdited &&
			!window.confirm("Switching time range will discard edits. Continue?")
		)
			return;
		setRangeType(range);
		setAiData(null);
		setDraft("");
		setViewMode("DOCS_A4");
	};

	const handleSelectCycle = (cycleId) => {
		if (
			isEdited &&
			!window.confirm("Switching survey cycle will discard edits. Continue?")
		)
			return;
		setSelectedCycleId(cycleId);
		setAiData(null);
		setDraft("");
		setViewMode("DOCS_A4");
	};

	const handleOpenInNewTab = () => {
		const html = buildStandaloneHtml(draft, meta);
		const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
		const win = window.open(url, "_blank");
		if (!win) {
			URL.revokeObjectURL(url);
			toast.error("Pop-up blocked — allow pop-ups to open the document.");
			return;
		}
		setTimeout(() => URL.revokeObjectURL(url), 60_000);
	};

	const handleCopyForDocs = async () => {
		const inner = buildDocumentInnerHtml(draft, meta);
		const html = `<div style="font-family:'Times New Roman',Times,serif;">${inner}</div>`;
		const plain = (draft || "").replace(/[*#]/g, "");
		const ok = await copyRichTextToClipboard(html, plain);
		if (ok) {
			toast.success("Copied — paste into Word or Google Docs ✓");
		} else {
			toast.error("Copy failed — use 'Open in New Tab' and copy there.");
		}
	};

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
		} catch {
			toast.error("Failed to generate Word document");
		} finally {
			setIsDownloading(false);
		}
	};

	const handleDownloadExcel = async () => {
		setIsDownloadingExcel(true);
		try {
			const { blob, filename } = await downloadReportRequest("excel", {
				surveyPeriodId:
					rangeType === "PERIOD" ? selectedCycleId || undefined : undefined,
				rangeType,
				startDate: rangeType === "CUSTOM" ? startDate : undefined,
				endDate: rangeType === "CUSTOM" ? endDate : undefined,
				reportType: reportType === "ALL" ? undefined : reportType,
			});
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename || `Queens_Price_Gathered_Data_${Date.now()}.xlsx`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success("Gathered data Excel spreadsheet downloaded ✓");
		} catch {
			toast.error("Failed to download Excel report");
		} finally {
			setIsDownloadingExcel(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
			<div
				className={`relative flex flex-col w-full ${
					isEditing ? "max-w-6xl" : "max-w-5xl"
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
								Executive AI Intelligence & Market Summary
							</h2>
							<p className="text-[11px] text-slate-500 font-medium">
								{activePeriodLabel}
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
					{/* Timeframe Scope Selector */}
					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Select Aggregation Timeframe
						</label>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
							{RANGE_OPTIONS.map((range) => (
								<button
									key={range.id}
									type="button"
									onClick={() => handleSelectRange(range.id)}
									className={`px-3 py-2 text-xs font-bold rounded-xl border transition text-center cursor-pointer ${
										rangeType === range.id
											? "border-[#A41821] bg-red-50 text-[#A41821] shadow-2xs"
											: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
									}`}
								>
									{range.label}
								</button>
							))}
						</div>

						{rangeType === "CUSTOM" && (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
								<div>
									<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										Start Date
									</label>
									<input
										type="date"
										value={startDate}
										onChange={(e) => setStartDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
									/>
								</div>
								<div>
									<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
										End Date
									</label>
									<input
										type="date"
										value={endDate}
										onChange={(e) => setEndDate(e.target.value)}
										className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
									/>
								</div>
							</div>
						)}

						{rangeType === "PERIOD" && periods.length > 0 && (
							<div className="pt-2">
								<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
									Select Specific Survey Cycle (Open or Closed)
								</label>
								<select
									value={selectedCycleId}
									onChange={(e) => handleSelectCycle(e.target.value)}
									className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800"
								>
									<option value="">Latest Active Cycle (Default)</option>
									{periods.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name} · {p.status}
										</option>
									))}
								</select>
							</div>
						)}
					</div>

					{/* Stream Scope Selector */}
					<div className="space-y-1.5">
						<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Select Intelligence Stream Scope
						</label>
						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
							<button
								type="button"
								disabled={isGenerating}
								onClick={() => handleSelectScope("FRESH_CORNER")}
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
										20 Items
									</span>
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									Fresh Corner, Garment, and Lamberet ex-factory gates.
								</p>
							</button>

							<button
								type="button"
								disabled={isGenerating}
								onClick={() => handleSelectScope("ULTRA_SENSITIVE")}
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
										100 Items
									</span>
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									Shoa, Abadir, Allmart, and Bambis 95% FMCG parity.
								</p>
							</button>

							<button
								type="button"
								disabled={isGenerating}
								onClick={() => handleSelectScope("ALL")}
								className={`flex flex-col p-3 rounded-xl border text-left transition cursor-pointer bg-white ${
									reportType === "ALL"
										? "border-[#1F4E79] ring-2 ring-[#1F4E79]/30"
										: "border-slate-200 hover:bg-slate-50"
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-900">
										🌐 Combined Stream
									</span>
									<span className="font-mono text-[10px] font-bold text-[#1F4E79] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
										120 Items
									</span>
								</div>
								<p className="mt-1 text-[11px] text-slate-500">
									Both Daily Fresh and FMCG Core multi-stream brief.
								</p>
							</button>
						</div>
					</div>

					{/* Trigger Generate */}
					{!aiData && (
						<div className="py-8 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
							<button
								type="button"
								onClick={() => handleGenerate(false)}
								disabled={isGenerating}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-6 py-3 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
							>
								{isGenerating ? (
									<>
										<div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
										<span>
											Aggregating gathered data &amp; generating brief...
										</span>
									</>
								) : (
									<span>
										✦ Generate Summary &amp; Load Competitor Matrix (
										{activePeriodLabel})
									</span>
								)}
							</button>
						</div>
					)}

					{/* Output Viewer */}
					{aiData && (
						<div className="space-y-3">
							<div className="flex flex-wrap items-center justify-between gap-2 px-1">
								<div className="flex items-center gap-2">
									<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
										{viewMode === "DOCS_A4" &&
											"Word Document Preview (A4 · Times New Roman)"}
										{viewMode === "GATHERED_DATA" &&
											"Gathered Competitor Matrix (Raw Comparison)"}
										{viewMode === "NARRATIVE" && "Clean Executive Narrative"}
										{viewMode === "EDIT" && "Edit Markdown · Live A4 Preview"}
									</span>
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
										onClick={() => handleGenerate(true)}
										disabled={isGenerating}
										className="text-[11px] font-bold text-[#A41821] hover:underline cursor-pointer disabled:opacity-50"
									>
										Regenerate
									</button>
								</div>
							</div>

							{viewMode === "DOCS_A4" && (
								<A4Preview markdown={draft} meta={meta} />
							)}

							{viewMode === "GATHERED_DATA" && (
								<GatheredDataView sections={aiData.sections} />
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
											className="min-h-[520px] lg:h-[640px] w-full resize-y rounded-xl border border-slate-300 bg-white p-4 font-mono text-[12px] leading-relaxed text-slate-800 shadow-xs focus:border-[#1F4E79] focus:outline-hidden focus:ring-2 focus:ring-[#1F4E79]/20"
										/>
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
								onClick={handleDownloadExcel}
								disabled={isDownloadingExcel}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition active:scale-95 disabled:opacity-50"
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
										d="M12 10v6m0 0l-3-3m3 3l3-3M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
									/>
								</svg>
								<span>
									{isDownloadingExcel
										? "Exporting Excel..."
										: "Export Gathered Excel"}
								</span>
							</button>

							<button
								type="button"
								onClick={handleCopyForDocs}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition active:scale-95"
							>
								<span>Copy for Docs</span>
							</button>

							<button
								type="button"
								onClick={handleOpenInNewTab}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#1F4E79] bg-white px-4 py-2.5 text-xs font-bold text-[#1F4E79] hover:bg-[#1F4E79]/5 transition active:scale-95"
							>
								<span>Open in New Tab</span>
							</button>

							<button
								type="button"
								onClick={handleDownloadDocx}
								disabled={isDownloading}
								className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#017C4D] hover:bg-[#015E3A] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
							>
								<span>
									{isDownloading
										? "Building Word Doc..."
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