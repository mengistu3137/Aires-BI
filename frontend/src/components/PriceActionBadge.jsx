import React from "react";

export const PriceActionBadge = ({ action, variancePercent }) => {
	switch (action) {
		case "PRICE_DOWN":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-[#A41821]">
					<svg
						className="h-3 w-3"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2.5}
							d="M19 14l-7 7m0 0l-7-7m7 7V3"
						/>
					</svg>
					Price Down{" "}
					{variancePercent !== undefined ? `(+${variancePercent}%)` : ""}
				</span>
			);

		case "PRICE_UP":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-[#017C4D]">
					<svg
						className="h-3 w-3"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2.5}
							d="M5 10l7-7m0 0l7 7m-7-7v18"
						/>
					</svg>
					Price Up{" "}
					{variancePercent !== undefined ? `(${variancePercent}%)` : ""}
				</span>
			);

		case "KEEP":
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
					<span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
					Keep
				</span>
			);

		case "PENDING":
		default:
			return (
				<span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-medium text-[#FE7914]">
					<span className="h-1.5 w-1.5 rounded-full bg-[#FE7914] animate-pulse" />
					Pending
				</span>
			);
	}
};