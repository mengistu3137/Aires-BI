import React from "react";
import { useNavigate } from "react-router-dom";
import {
	formatDate,
	formatIndex,
	formatPrice,
} from "../utils/price-analysis.utils.js";
import { PriceAnalysisActionBadge } from "./PriceAnalysisActionBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

// Ultra-thin glowing hairline accent tailored to the recommended action
const getActionAccent = (action) => {
	const act = String(action || "").toUpperCase();

	if (
		act.includes("MAINTAIN") ||
		act.includes("KEEP") ||
		act.includes("OPTIMAL") ||
		act.includes("OK")
	) {
		return "bg-[#017C4D] shadow-[0_1px_3px_rgba(1,124,77,0.25)]";
	}
	if (
		act.includes("INCREASE") ||
		act.includes("UP") ||
		act.includes("REVIEW") ||
		act.includes("MONITOR") ||
		act.includes("PENDING")
	) {
		return "bg-[#FE7914] shadow-[0_1px_3px_rgba(254,121,20,0.25)]";
	}
	if (
		act.includes("DECREASE") ||
		act.includes("DOWN") ||
		act.includes("ALERT") ||
		act.includes("URGENT")
	) {
		return "bg-[#A41821] shadow-[0_1px_3px_rgba(164,24,33,0.25)]";
	}
	// Default: subtle brand primary red hairline
	return "bg-gradient-to-r from-[#A41821] to-[#CC242F] shadow-[0_1px_3px_rgba(164,24,33,0.2)]";
};

/**
 * Mobile-optimized list item for price analysis, styled to match SurveyProgress cards.
 */
export const PriceAnalysisListItem = ({ analysis }) => {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate(`/price-analysis/${analysis.id}`)}
			className="group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-xs transition-all duration-200 hover:border-[#A41821]/25 hover:shadow-md hover:shadow-[#A41821]/5 active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
		>
			{/* Ultra-thin 1.5px glowing hairline */}
			<div className={`h-[1.5px] w-full ${getActionAccent(analysis.action)}`} />

			<div className="flex flex-1 flex-col p-4 space-y-3">
				{/* Header: Product + Action Badge */}
				<div className="flex items-start justify-between gap-2">
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold text-slate-900 group-hover:text-slate-800">
							{formatProductName(analysis.product?.name) || "Unknown product"}
						</p>
						<p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
							{analysis.product?.category || "Uncategorized"}
							{analysis.product?.sku && ` · SKU ${analysis.product.sku}`}
						</p>
					</div>
					<PriceAnalysisActionBadge action={analysis.action} />
				</div>

				{/* Metrics Row */}
				<div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-100/80 bg-slate-50/70 p-2.5">
					<div className="min-w-0">
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Queens
						</p>
						<p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-800">
							{formatPrice(analysis.queensPrice)}
						</p>
					</div>
					<div className="min-w-0">
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Avg comp.
						</p>
						<p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-700">
							{formatPrice(analysis.competitorAveragePrice)}
						</p>
					</div>
					<div className="min-w-0">
						<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
							Index
						</p>
						<p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-700">
							{formatIndex(analysis.priceIndex)}
						</p>
					</div>
				</div>

				{/* Footer: Period + Date */}
				<div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-[10px] text-slate-400">
					<span className="truncate max-w-[65%] font-medium">
						{analysis.surveyPeriod?.name || "Survey cycle"}
					</span>
					<span className="shrink-0 font-medium">
						{formatDate(analysis.calculatedAt)}
					</span>
				</div>
			</div>
		</button>
	);
};