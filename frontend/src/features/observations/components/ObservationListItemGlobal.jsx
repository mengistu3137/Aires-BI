import React from "react";
import { useNavigate } from "react-router-dom";
import { formatProductName } from "@/utils/formatters.js";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { ObservationAvailabilityBadge } from "./ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "./ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";

export const ObservationListItemGlobal = ({ observation }) => {
	const navigate = useNavigate();
	const product = observation.product;
	const store = observation.audit?.store;
	const hasSubstitute = Boolean(observation.substituteProduct);
	const isUnavailable =
		observation.availability === "OUT_OF_STOCK" ||
		observation.availability === "NOT_FOUND";

	return (
		<button
			type="button"
			onClick={() => navigate(`/observations/${observation.id}`)}
			className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-xs transition hover:border-slate-300 hover:bg-slate-50/50"
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0 flex-1 space-y-1">
					{/* Original Product Title (Struck through if substituted) */}
					<p
						className={`truncate text-sm font-bold ${
							isUnavailable && hasSubstitute
								? "text-slate-400 line-through decoration-slate-400 decoration-1"
								: "text-slate-900"
						}`}
					>
						{formatProductName(product?.name || "Unknown Product")}
					</p>

					{/* Underneath Substituted Product Display */}
					{isUnavailable && hasSubstitute && (
						<div className="flex items-center gap-1.5 font-sans">
							<span className="text-[10px] font-bold text-[#FE7914]">↳ Sub:</span>
							<span className="truncate rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900 border border-amber-200">
								{observation.substituteProduct}
							</span>
						</div>
					)}

					<p className="truncate text-[11px] text-slate-500">
						{store?.name}
						{store?.competitor?.name && ` • ${store.competitor.name}`}
					</p>

					<p className="font-mono text-[10px] text-slate-400">
						{product?.barcode || product?.sku || product?.id}
					</p>
				</div>

				<div className="flex flex-col items-end gap-1.5">
					<ObservationAvailabilityBadge availability={observation.availability} />
					{observation.price !== null && observation.price !== undefined ? (
						<div className="text-right">
							<span className="font-mono text-sm font-black text-[#017C4D]">
								{formatPrice(observation.price)}
							</span>
							{hasSubstitute && (
								<span className="block text-[9px] font-bold uppercase tracking-wider text-[#FE7914]">
									Sub. Price
								</span>
							)}
						</div>
					) : (
						<span className="text-xs text-slate-400">—</span>
					)}
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
				<div className="flex items-center gap-1.5">
					<ObservationReviewBadge status={observation.review?.status} />
					<ObservationSyncBadge status={observation.sync?.status} />
				</div>
				<span className="font-mono text-slate-400">
					{formatCapturedAt(observation.capturedAt)}
				</span>
			</div>
		</button>
	);
};