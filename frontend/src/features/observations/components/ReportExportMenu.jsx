// frontend/src/features/observations/components/ReportExportMenu.jsx
import React, { useEffect, useRef, useState } from "react";

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

export const ReportExportMenu = ({
	surveyPeriodId,
	scopeLabel,
	periodLabel,
	onDownload,
	downloading = null,
	disabled = false,
}) => {
	const [open, setOpen] = useState(false);
	const [reportType, setReportType] = useState("FRESH_CORNER");
	const ref = useRef(null);

	const busy = Boolean(downloading);
	// Enabled whenever online and not actively downloading
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

	const handle = (format) => {
		setOpen(false);
		onDownload(format, reportType || undefined);
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
					className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
				>
					<div className="border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Report scope
						</p>
						<p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
							{periodLabel || "All survey periods (Active Cycle)"}
						</p>
						<p className="truncate text-[11px] text-slate-500">{scopeLabel}</p>
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

					{options.map((opt) => (
						<button
							key={opt.format}
							type="button"
							role="menuitem"
							onClick={() => handle(opt.format)}
							className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-slate-50 cursor-pointer"
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