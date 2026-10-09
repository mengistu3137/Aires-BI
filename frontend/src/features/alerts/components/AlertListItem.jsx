import React from "react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime, formatPrice } from "../utils/alert.utils.js";
import { AlertSeverityBadge } from "./AlertSeverityBadge.jsx";
import { AlertTypeBadge } from "./AlertTypeBadge.jsx";
import { AlertStatusBadge } from "./AlertStatusBadge.jsx";

/**
 * Mobile-optimized alert list item.
 * Row click: `onRowClick(alert)` when provided, else navigates to /alerts/:id.
 */
export const AlertListItem = ({ alert, onRowClick }) => {
	const navigate = useNavigate();

	const handleClick = () => {
		if (typeof onRowClick === "function") {
			onRowClick(alert);
		} else {
			navigate(`/alerts/${alert.id}`);
		}
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className="flex w-full flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#A41821] focus:ring-offset-2"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-bold text-slate-800">
						{alert.product?.name || "Unknown product"}
					</p>
					<p className="mt-0.5 truncate text-[11px] text-slate-500">
						{alert.product?.category}
						{alert.product?.sku && ` · SKU ${alert.product.sku}`}
					</p>
				</div>
				<AlertSeverityBadge severity={alert.severity} />
			</div>

			<p className="line-clamp-2 text-[11px] text-slate-600">{alert.message}</p>

			{/* Price deltas */}
			<div className="flex items-center gap-2 rounded-lg bg-slate-50/70 border border-slate-100 px-2.5 py-1.5 text-[11px]">
				<span className="text-slate-500">Queens</span>
				<span className="font-mono font-bold text-slate-800">
					{formatPrice(alert.queensPrice)}
				</span>
				{alert.recommendedPrice != null && (
					<>
						<span className="text-slate-400">→</span>
						<span className="font-mono font-bold text-[#017C4D]">
							{formatPrice(alert.recommendedPrice)}
						</span>
					</>
				)}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<AlertTypeBadge type={alert.type} />
				<AlertStatusBadge resolved={alert.resolved} />
				<span className="ml-auto text-[10px] text-slate-400">
					{formatRelativeTime(alert.createdAt)}
				</span>
			</div>
		</button>
	);
};