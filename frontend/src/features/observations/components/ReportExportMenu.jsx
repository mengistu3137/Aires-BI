import React, { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog.jsx";
import toast from "react-hot-toast";

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
		value: "DAILY",
		label: "Daily Fresh",
		hint: "20 Volatile Produce items (Fresh Corner, Garment, Straight Market)",
	},
	{
		value: "WEEKLY",
		label: "Ultra-Sensitive",
		hint: "100 FMCG Staples (Shoa, Abadir, Allmart, Bambis)",
	},
	{
		value: "MONTHLY",
		label: "Sensitive",
		hint: "500 Sensitive Packaged Grocery items",
	},
	{
		value: "BI_YEARLY",
		label: "Bi-Yearly",
		hint: "2,804 Non-Sensitive Long-Tail articles",
	},
	{
		value: "",
		label: "All 4 Tracks",
		hint: "Complete 3,424-item catalog in one consolidated report",
	},
];

// ────────────────────────────────────────────────────────────
// Collapsible Period Multi-Select (Accordion with Chevrons)
// ────────────────────────────────────────────────────────────
const CollapsiblePeriodMultiSelect = ({
	periods = [],
	selected = [],
	onToggle,
	onSelectAll,
	onClearAll,
}) => {
	const [expandedWeeks, setExpandedWeeks] = useState({});

	const { openWeekly, openDailyMap, closedWeekly, closedDailyMap } =
		useMemo(() => {
			const openW = [];
			const openD = {};
			const closedW = [];
			const closedD = {};

			periods.forEach((p) => {
				const isDaily =
					p.id.includes("-DAILY-") || p.name?.toLowerCase().includes("daily");
				const isClosed = p.status === "CLOSED";

				if (isDaily) {
					const parentKey = p.id.split("-DAILY-")[0];
					const targetMap = isClosed ? closedD : openD;
					if (!targetMap[parentKey]) targetMap[parentKey] = [];
					targetMap[parentKey].push(p);
				} else if (isClosed) {
					closedW.push(p);
				} else {
					openW.push(p);
				}
			});

			return {
				openWeekly: openW,
				openDailyMap: openD,
				closedWeekly: closedW,
				closedDailyMap: closedD,
			};
		}, [periods]);

	const toggleWeek = (e, weekId) => {
		e.stopPropagation();
		setExpandedWeeks((prev) => ({
			...prev,
			[weekId]: !prev[weekId],
		}));
	};

	if (periods.length === 0) {
		return (
			<p className="px-2 py-1.5 text-[11px] text-slate-400 italic">
				No periods available
			</p>
		);
	}

	return (
		<div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
			<div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-2 py-1.5 backdrop-blur">
				<button
					type="button"
					onClick={onSelectAll}
					className="text-[10px] font-bold text-[#A41821] hover:underline cursor-pointer"
				>
					Select all
				</button>
				<button
					type="button"
					onClick={onClearAll}
					className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
				>
					Clear
				</button>
			</div>

			<div className="p-1 space-y-1 text-xs">
				{/* Open Cycles Group */}
				{openWeekly.length > 0 && (
					<div>
						<p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
							Open Cycles
						</p>

						{openWeekly.map((wp) => {
							const dailyList = openDailyMap[wp.id] || [];
							const isExpanded = Boolean(expandedWeeks[wp.id]);
							const isChecked = selected.includes(wp.id);

							return (
								<div
									key={wp.id}
									className="rounded-lg border border-slate-100 bg-slate-50/50 mb-1 overflow-hidden"
								>
									<div className="flex items-center gap-1.5 p-1.5 hover:bg-slate-100/70">
										{dailyList.length > 0 && (
											<button
												type="button"
												onClick={(e) => toggleWeek(e, wp.id)}
												className="flex h-4 w-4 items-center justify-center rounded bg-slate-200/70 text-slate-600 hover:bg-slate-300 text-[8px] font-bold cursor-pointer flex-none"
												title={
													isExpanded
														? "Collapse daily streams"
														: "Expand daily streams"
												}
											>
												{isExpanded ? "▼" : "▶"}
											</button>
										)}

										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => onToggle(wp.id)}
											className="h-3.5 w-3.5 rounded border-slate-300 accent-[#A41821] cursor-pointer"
										/>
										<span className="flex-1 truncate text-[11px] font-bold text-slate-800">
											{wp.name || wp.id}
											{dailyList.length > 0 && (
												<span className="text-[10px] font-normal text-emerald-700 ml-1">
													({dailyList.length} daily)
												</span>
											)}
										</span>
									</div>

									{/* Collapsible Daily Cycles */}
									{isExpanded && dailyList.length > 0 && (
										<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-1 animate-in fade-in">
											{dailyList.map((dp) => {
												const isDailyChecked = selected.includes(dp.id);
												return (
													<label
														key={dp.id}
														className="flex items-center gap-2 text-[11px] text-slate-600 hover:text-slate-900 cursor-pointer"
													>
														<input
															type="checkbox"
															checked={isDailyChecked}
															onChange={() => onToggle(dp.id)}
															className="h-3 w-3 rounded border-slate-300 accent-[#A41821] cursor-pointer"
														/>
														<span className="truncate">↳ {dp.name}</span>
													</label>
												);
											})}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}

				{/* Closed Cycles Group */}
				{closedWeekly.length > 0 && (
					<div className="pt-1 border-t border-slate-100">
						<p className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
							Closed Historical Cycles
						</p>

						{closedWeekly.map((wp) => {
							const dailyList = closedDailyMap[wp.id] || [];
							const isExpanded = Boolean(expandedWeeks[wp.id]);
							const isChecked = selected.includes(wp.id);

							return (
								<div
									key={wp.id}
									className="rounded-lg border border-slate-100 bg-slate-50/30 mb-1 overflow-hidden"
								>
									<div className="flex items-center gap-1.5 p-1.5 hover:bg-slate-100/70">
										{dailyList.length > 0 && (
											<button
												type="button"
												onClick={(e) => toggleWeek(e, wp.id)}
												className="flex h-4 w-4 items-center justify-center rounded bg-slate-200/70 text-slate-500 hover:bg-slate-300 text-[8px] font-bold cursor-pointer flex-none"
											>
												{isExpanded ? "▼" : "▶"}
											</button>
										)}

										<input
											type="checkbox"
											checked={isChecked}
											onChange={() => onToggle(wp.id)}
											className="h-3.5 w-3.5 rounded border-slate-300 accent-[#A41821] cursor-pointer"
										/>
										<span className="flex-1 truncate text-[11px] font-semibold text-slate-600">
											{wp.name || wp.id}
										</span>
									</div>

									{isExpanded && dailyList.length > 0 && (
										<div className="border-t border-slate-200 bg-white py-1 pl-6 pr-2 space-y-1 animate-in fade-in">
											{dailyList.map((dp) => (
												<label
													key={dp.id}
													className="flex items-center gap-2 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer"
												>
													<input
														type="checkbox"
														checked={selected.includes(dp.id)}
														onChange={() => onToggle(dp.id)}
														className="h-3 w-3 rounded border-slate-300 accent-[#A41821] cursor-pointer"
													/>
													<span className="truncate">↳ {dp.name}</span>
												</label>
											))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};

// ────────────────────────────────────────────────────────────
// Stores Multi-Select List (Active Stores Only)
// ────────────────────────────────────────────────────────────
const StoresMultiSelectList = ({
	items,
	selected,
	onToggle,
	onSelectAll,
	onClearAll,
	emptyLabel = "No active stores available",
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
					className="text-[10px] font-bold text-[#A41821] hover:underline cursor-pointer"
				>
					Select all
				</button>
				<button
					type="button"
					onClick={onClearAll}
					className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
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
// Main Export Menu with Cycle & Category Validations
// ────────────────────────────────────────────────────────────
export const ReportExportMenu = ({
	surveyPeriodId,
	periodLabel,
	scopeLabel,

	availableStores = [],
	availablePeriods = [],

	onDownload,
	downloading = null,
	disabled = false,
}) => {
	const [open, setOpen] = useState(false);
	const [reportType, setReportType] = useState("DAILY"); // Defaults to Daily Fresh instead of all
	const [showScope, setShowScope] = useState(false);

	const [selectedPeriodIds, setSelectedPeriodIds] = useState([]);
	const [selectedStoreIds, setSelectedStoreIds] = useState([]);

	// Validation: Confirmation dialog state for massive "All 4 Tracks" (3,424 products) export
	const [pendingLargeExport, setPendingLargeExport] = useState(null);

	const ref = useRef(null);
	const busy = Boolean(downloading);
	const isDisabled = disabled || busy;

	const activeStores = useMemo(
		() => (availableStores || []).filter((s) => s.active !== false),
		[availableStores],
	);

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

	const storeItems = useMemo(
		() =>
			activeStores.map((s) => ({
				id: s.id,
				label: s.name,
				subLabel: s.competitor?.name
					? `${s.competitor.name}${s.area ? ` · ${s.area}` : ""}`
					: s.area || "",
			})),
		[activeStores],
	);

	// Validation logic before downloading
	const handleInitiateExport = (format) => {
		// 1. Validate that at least one survey cycle is selected
		const surveyPeriodIds =
			selectedPeriodIds.length > 0
				? selectedPeriodIds
				: surveyPeriodId
					? [surveyPeriodId]
					: [];

		if (surveyPeriodIds.length === 0) {
			toast.error("Please select a survey cycle before exporting.");
			setShowScope(true); // Automatically expand the cycle picker
			return;
		}

		const storeIds = selectedStoreIds.length > 0 ? selectedStoreIds : undefined;

		// 2. Validate category stream: If "All 4 Tracks" (3,424 items) is selected, require confirmation
		if (!reportType) {
			setOpen(false);
			setPendingLargeExport({
				format,
				reportType: undefined,
				scope: { surveyPeriodIds, storeIds },
			});
			return;
		}

		// 3. Otherwise, proceed directly with export for the selected track
		setOpen(false);
		onDownload(format, reportType, {
			surveyPeriodIds,
			storeIds,
		});
	};

	const handleConfirmLargeExport = () => {
		if (!pendingLargeExport) return;
		const { format, reportType: confirmedType, scope } = pendingLargeExport;
		setPendingLargeExport(null);
		onDownload(format, confirmedType, scope);
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

	const scopeSummary = (() => {
		const pLabel =
			selectedPeriodIds.length === 0
				? surveyPeriodId
					? periodLabel || "1 period"
					: "No period selected"
				: selectedPeriodIds.length === 1
					? periodLabel || "1 period"
					: `${selectedPeriodIds.length} periods`;
		const sLabel =
			selectedStoreIds.length === 0
				? "All active stores"
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
				className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#8a1219] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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

					{/* Customize Scope (Collapsible Periods & Active Stores) */}
					<div className="border-b border-slate-100 px-3.5 py-2.5">
						<button
							type="button"
							onClick={() => setShowScope((v) => !v)}
							className="flex w-full items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer"
						>
							<span>Customize scope</span>
							<span className="text-xs">{showScope ? "▾" : "▸"}</span>
						</button>

						{showScope && (
							<div className="mt-2 space-y-2.5">
								{/* Collapsible Period Selection */}
								<div>
									<div className="flex items-center justify-between mb-1">
										<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
											Survey periods <span className="text-[#A41821]">*</span>
										</p>
										{selectedPeriodIds.length === 0 && !surveyPeriodId && (
											<span className="text-[9px] font-bold text-amber-600">
												Required
											</span>
										)}
									</div>
									<CollapsiblePeriodMultiSelect
										periods={availablePeriods}
										selected={selectedPeriodIds}
										onToggle={togglePeriod}
										onSelectAll={() =>
											setSelectedPeriodIds(availablePeriods.map((p) => p.id))
										}
										onClearAll={() => setSelectedPeriodIds([])}
									/>
								</div>

								{/* Active Stores Multi-Select */}
								<div>
									<p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
										Stores (Active only)
									</p>
									<StoresMultiSelectList
										items={storeItems}
										selected={selectedStoreIds}
										onToggle={toggleStore}
										onSelectAll={() =>
											setSelectedStoreIds(storeItems.map((s) => s.id))
										}
										onClearAll={() => setSelectedStoreIds([])}
										emptyLabel="No active stores available"
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
							className="grid grid-cols-2 sm:grid-cols-5 gap-1 rounded-xl bg-slate-100 p-1"
						>
							{REPORT_TYPES.map((t) => {
								const active = t.value === reportType;
								return (
									<button
										key={t.value || "all"}
										type="button"
										role="radio"
										aria-checked={active}
										onClick={() => setReportType(t.value)}
										className={`rounded-lg px-1.5 py-1.5 text-[10px] font-bold transition text-center cursor-pointer ${
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
							onClick={() => handleInitiateExport(opt.format)}
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

			{/* Reusable Confirmation Dialog for Large "All 4 Tracks" (3,424 Products) Export */}
			<ConfirmDialog
				open={Boolean(pendingLargeExport)}
				title="Export All 3,424 Products?"
				message={`You are about to export all 4 survey tracks (3,424 products) in ${pendingLargeExport?.format?.toUpperCase()} format for ${
					pendingLargeExport?.scope?.surveyPeriodIds?.length > 1
						? `${pendingLargeExport.scope.surveyPeriodIds.length} cycles`
						: "the selected survey cycle"
				}${
					pendingLargeExport?.scope?.storeIds
						? ` across ${pendingLargeExport.scope.storeIds.length} store(s)`
						: ` across all active store locations`
				}.`}
				details="Compiling all 3,424 products produces a large document and may take a moment. If you only need produce or staple groceries, cancel and select 'Daily Fresh' (20 items) or 'Ultra-Sensitive' (100 items) to export much faster."
				confirmLabel={`Proceed with ${pendingLargeExport?.format?.toUpperCase()} Export`}
				cancelLabel="Cancel"
				variant="primary"
				isConfirming={busy}
				onCancel={() => setPendingLargeExport(null)}
				onConfirm={handleConfirmLargeExport}
			/>
		</div>
	);
};