// frontend/src/features/observations/components/ReportExportMenu.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

const Spinner = () => (
	<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

const FileIcon = ({ className = "" }) => (
	<svg
		className={`h-4 w-4 ${className}`}
		fill="none"
		viewBox="0 0 24 24"
		stroke="currentColor"
		aria-hidden="true"
	>
		<path
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M12 10v6m0 0l-3-3m3 3l3-3M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
		/>
	</svg>
);

const REPORT_TYPES = [
	{
		value: "FRESH_CORNER",
		label: "Fresh Corner",
		hint: "Fresh Corner, Garment Market, Straight Market, Queens Price",
	},
	{
		value: "ULTRA_SENSITIVE",
		label: "Ultra-Sensitive",
		hint: "Shoa, Abadir, Allmart, Bambis",
	},
	{
		value: "",
		label: "Both",
		hint: "Fresh Corner and Ultra-Sensitive in one file",
	},
];

// ────────────────────────────────────────────────────────────
// Multi-select list (checkbox-based)
// ────────────────────────────────────────────────────────────

const MultiSelectList = ({
	items,
	selected,
	onToggle,
	onSelectAll,
	onClearAll,
	emptyLabel = "No options",
	groupBy,
}) => {
	const grouped = useMemo(() => {
		if (!groupBy) return [{ groupKey: null, items }];
		const map = new Map();
		for (const item of items) {
			const key = groupBy(item) || "Other";
			if (!map.has(key)) map.set(key, []);
			map.get(key).push(item);
		}
		return [...map.entries()].map(([groupKey, groupItems]) => ({
			groupKey,
			items: groupItems,
		}));
	}, [items, groupBy]);

	if (items.length === 0) {
		return (
			<p className="px-2 py-1.5 text-[11px] text-slate-400 italic">
				{emptyLabel}
			</p>
		);
	}

	return (
		<div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white">
			<div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-2 py-1.5 backdrop-blur">
				<button
					type="button"
					onClick={onSelectAll}
					className="text-[10px] font-bold text-[#A41821] hover:underline"
				>
					Select all
				</button>
				<button
					type="button"
					onClick={onClearAll}
					className="text-[10px] font-bold text-slate-500 hover:underline"
				>
					Clear
				</button>
			</div>

			{grouped.map(({ groupKey, items: groupItems }) => (
				<div key={groupKey || "__ungrouped__"}>
					{groupKey && (
						<p className="sticky top-[26px] z-0 border-b border-slate-100 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
							{groupKey}
						</p>
					)}
					{groupItems.map((item) => {
						const checked = selected.includes(item.id);
						return (
							<label
								key={item.id}
								className="flex cursor-pointer items-center gap-2 px-2 py-1.5 text-[11px] text-slate-700 hover:bg-slate-50"
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => onToggle(item.id)}
									className="h-3.5 w-3.5 rounded border-slate-300 accent-[#A41821]"
								/>
								<span className="flex-1 truncate">
									{item.label}
									{item.subLabel && (
										<span className="ml-1 text-slate-400">
											— {item.subLabel}
										</span>
									)}
								</span>
							</label>
						);
					})}
				</div>
			))}
		</div>
	);
};

// ────────────────────────────────────────────────────────────
// Main menu
// ────────────────────────────────────────────────────────────

export const ReportExportMenu = ({
	// Legacy single-scope props (still honored when arrays are empty):
	surveyPeriodId,
	periodLabel,
	scopeLabel,

	// Multi-select data sources (optional — menu degrades gracefully if absent):
	availableStores = [],
	availablePeriods = [],

	// Callback: (format, reportType, { surveyPeriodIds, storeIds })
	onDownload,
	downloading = null,
	disabled = false,
}) => {
	const [open, setOpen] = useState(false);
	const [reportType, setReportType] = useState("FRESH_CORNER");
	const [showScope, setShowScope] = useState(false);

	const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
	const [selectedStoreIds, setSelectedStoreIds] = useState([]);

	const ref = useRef(null);
	const busy = Boolean(downloading);
	const isDisabled = disabled || busy;

	useEffect(() => {
		if (!open) return undefined;
		const onClick = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setOpen(false);
		};
		const onKey = (e) => e.key === "Escape" && setOpen(false);
		document.addEventListener("mousedown", onClick);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onClick);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const togglePeriod = (id) =>
		setSelectedPeriodIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	const toggleStore = (id) =>
		setSelectedStoreIds((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);

	const periodItems = useMemo(
		() =>
			availablePeriods.map((p) => ({
				id: p.id,
				label: p.name || p.id,
				subLabel: p.status,
			})),
		[availablePeriods],
	);

	const storeItems = useMemo(
		() =>
			availableStores.map((s) => ({
				id: s.id,
				label: s.name,
				subLabel: s.competitor?.name
					? `${s.competitor.name}${s.area ? ` · ${s.area}` : ""}`
					: s.area || "",
			})),
		[availableStores],
	);

	const handle = (format) => {
		setOpen(false);
		// Resolve effective scope: if nothing selected in multi-select, fall
		// back to legacy single values (page filters) if present, else all.
		const surveyPeriodIds =
			selectedPeriodIds.length > 0
				? selectedPeriodIds
				: surveyPeriodId
					? [surveyPeriodId]
					: undefined;

		const storeIds = selectedStoreIds.length > 0 ? selectedStoreIds : undefined;

		onDownload(format, reportType || undefined, {
			surveyPeriodIds,
			storeIds,
		});
	};

	const options = [
		{
			format: "pdf",
			label: "Download PDF",
			hint: "Executive dashboard with comparison graph",
			color: "text-[#A41821]",
		},
		{
			format: "excel",
			label: "Download Excel",
			hint: "Spreadsheet with all competitor data",
			color: "text-emerald-700",
		},
	];

	const selectedType = REPORT_TYPES.find((t) => t.value === reportType);

	// Human-readable summary of current scope
	const scopeSummary = (() => {
		const pLabel =
			selectedPeriodIds.length === 0
				? "All survey periods"
				: selectedPeriodIds.length === 1
					? periodLabel || "1 period"
					: `${selectedPeriodIds.length} periods`;
		const sLabel =
			selectedStoreIds.length === 0
				? "All stores"
				: selectedStoreIds.length === 1
					? "1 store"
					: `${selectedStoreIds.length} stores`;
		return `${pLabel} · ${sLabel}`;
	})();

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				disabled={isDisabled}
				aria-haspopup="menu"
				aria-expanded={open}
				className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#8a1219] disabled:cursor-not-allowed disabled:opacity-50"
			>
				{busy ? <Spinner /> : <FileIcon />}
				{busy ? "Generating…" : "Export report"}
				{!busy && (
					<svg
						className="h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				)}
			</button>

			{open && (
				<div
					role="menu"
					className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
				>
					{/* Header */}
					<div className="border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Report scope
						</p>
						<p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
							{scopeSummary}
						</p>
						{scopeLabel && (
							<p className="truncate text-[11px] text-slate-500">
								{scopeLabel}
							</p>
						)}
					</div>

					{/* Multi-select scope toggle */}
					<div className="border-b border-slate-100 px-3.5 py-2.5">
						<button
							type="button"
							onClick={() => setShowScope((v) => !v)}
							className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600"
						>
							<span>Customize scope</span>
							<span className="text-xs">{showScope ? "▾" : "▸"}</span>
						</button>

						{showScope && (
							<div className="mt-2 space-y-2.5">
								<div>
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
										Survey periods
									</p>
									<MultiSelectList
										items={periodItems}
										selected={selectedPeriodIds}
										onToggle={togglePeriod}
										onSelectAll={() =>
											setSelectedPeriodIds(periodItems.map((p) => p.id))
										}
										onClearAll={() => setSelectedPeriodIds([])}
										emptyLabel="No periods available"
										groupBy={(item) =>
											item.subLabel === "OPEN"
												? "Open Cycles"
												: item.subLabel === "CLOSED"
													? "Closed Cycles"
													: "Other"
										}
									/>
								</div>

								<div>
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
										Stores
									</p>
									<MultiSelectList
										items={storeItems}
										selected={selectedStoreIds}
										onToggle={toggleStore}
										onSelectAll={() =>
											setSelectedStoreIds(storeItems.map((s) => s.id))
										}
										onClearAll={() => setSelectedStoreIds([])}
										emptyLabel="No stores available"
										groupBy={(item) =>
											item.subLabel?.split(" · ")[0] || "Other"
										}
									/>
								</div>
							</div>
						)}
					</div>

					{/* Report type */}
					<div className="border-b border-slate-100 px-3.5 py-2.5">
						<p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Report Stream
						</p>
						<div
							role="radiogroup"
							aria-label="Report type"
							className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1"
						>
							{REPORT_TYPES.map((t) => {
								const active = t.value === reportType;
								return (
									<button
										key={t.value || "both"}
										type="button"
										role="radio"
										aria-checked={active}
										onClick={() => setReportType(t.value)}
										className={`rounded-lg px-1.5 py-1.5 text-[11px] font-bold transition ${
											active
												? "bg-white text-[#A41821] shadow-xs"
												: "text-slate-500 hover:text-slate-800"
										}`}
									>
										{t.label}
									</button>
								);
							})}
						</div>
						<p className="mt-1.5 text-[11px] leading-snug text-slate-500">
							{selectedType?.hint}
						</p>
					</div>

					{/* Format options */}
					{options.map((opt) => (
						<button
							key={opt.format}
							type="button"
							role="menuitem"
							onClick={() => handle(opt.format)}
							className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-slate-50"
						>
							<FileIcon className={`mt-0.5 ${opt.color}`} />
							<span>
								<span className="block text-xs font-bold text-slate-800">
									{opt.label}
								</span>
								<span className="block text-[11px] text-slate-500">
									{opt.hint}
								</span>
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
};