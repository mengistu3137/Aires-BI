import React from "react";

/**
 * Filter bar for Queen's benchmark prices list.
 * Supports 4-track frequency filtering and current benchmark toggle.
 */
export const QueensPriceFilters = ({
	search,
	onSearchChange,
	frequency,
	onFrequencyChange,
	currentFilter,
	onCurrentFilterChange,
}) => {
	return (
		<div className="space-y-3">
			{/* 4 Tracks Navigation Tabs */}
			<div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1">
				<button
					type="button"
					onClick={() => onFrequencyChange("ALL")}
					className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
						frequency === "ALL"
							? "bg-white text-slate-900 shadow-2xs"
							: "text-slate-600 hover:text-slate-900"
					}`}
				>
					All Tracks
				</button>

				<button
					type="button"
					onClick={() => onFrequencyChange("DAILY")}
					className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
						frequency === "DAILY"
							? "bg-[#017C4D] text-white shadow-2xs"
							: "text-slate-600 hover:text-slate-900"
					}`}
				>
					Daily Fresh
				</button>

				<button
					type="button"
					onClick={() => onFrequencyChange("WEEKLY")}
					className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
						frequency === "WEEKLY"
							? "bg-[#A41821] text-white shadow-2xs"
							: "text-slate-600 hover:text-slate-900"
					}`}
				>
					Weekly Ultra
				</button>

				<button
					type="button"
					onClick={() => onFrequencyChange("MONTHLY")}
					className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
						frequency === "MONTHLY"
							? "bg-[#FE7914] text-white shadow-2xs"
							: "text-slate-600 hover:text-slate-900"
					}`}
				>
					Monthly Sensitive
				</button>

				<button
					type="button"
					onClick={() => onFrequencyChange("BI_YEARLY")}
					className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
						frequency === "BI_YEARLY"
							? "bg-slate-800 text-white shadow-2xs"
							: "text-slate-600 hover:text-slate-900"
					}`}
				>
					Bi-Yearly
				</button>
			</div>

			{/* Search Input & Status Toggle */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative w-full sm:max-w-md">
					<input
						type="text"
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search products by name, barcode, or SKU..."
						className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pl-9 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] transition"
					/>
					<svg
						className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
				</div>

				{/* Filter Mode Toggle */}
				<div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-0.5 text-xs">
					<button
						type="button"
						onClick={() => onCurrentFilterChange(false)}
						className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
							!currentFilter
								? "bg-white text-slate-900 shadow-2xs"
								: "text-slate-500 hover:text-slate-800"
						}`}
					>
						All Products
					</button>
					<button
						type="button"
						onClick={() => onCurrentFilterChange(true)}
						className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
							currentFilter
								? "bg-[#A41821] text-white shadow-2xs"
								: "text-slate-500 hover:text-slate-800"
						}`}
					>
						Configured Only
					</button>
				</div>
			</div>
		</div>
	);
};