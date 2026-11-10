import React from "react";
import { useNavigate } from "react-router-dom";
import { formatProductName } from "@/utils/formatters.js";
import { formatPrice, formatCapturedAt } from "../utils/observation.utils.js";
import { ObservationAvailabilityBadge } from "./ObservationAvailabilityBadge.jsx";
import { ObservationReviewBadge } from "./ObservationReviewBadge.jsx";
import { ObservationSyncBadge } from "./ObservationSyncBadge.jsx";

export const ObservationListTable = ({ observations = [] }) => {
	const navigate = useNavigate();

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
			<table className="w-full text-left text-xs">
				<thead className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-black uppercase tracking-wider text-slate-400">
					<tr>
						<th className="px-4 py-3">Product Item</th>
						<th className="px-4 py-3">Store &amp; Competitor</th>
						<th className="px-4 py-3 text-center">Status</th>
						<th className="px-4 py-3 text-right">Price</th>
						<th className="px-4 py-3 text-center">Review</th>
						<th className="px-4 py-3 text-center">Sync</th>
						<th className="px-4 py-3 text-right">Captured</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-100">
					{observations.map((obs) => {
						const hasSubstitute = Boolean(obs.substituteProduct);
						const isUnavailable =
							obs.availability === "OUT_OF_STOCK" ||
							obs.availability === "NOT_FOUND";

						return (
							<tr
								key={obs.id}
								onClick={() => navigate(`/observations/${obs.id}`)}
								className="cursor-pointer transition hover:bg-slate-50/80 active:bg-slate-100"
							>
								{/* Product Item with Struck-Through & Underneath Substitute View */}
								<td className="px-4 py-3">
									<div className="space-y-0.5">
										<p
											className={`text-xs font-bold ${
												isUnavailable && hasSubstitute
													? "text-slate-400 line-through decoration-slate-400 decoration-1"
													: "text-slate-900"
											}`}
										>
											{formatProductName(obs.product?.name || "Unknown Product")}
										</p>

										{/* Display Underneath Substituted Product */}
										{isUnavailable && hasSubstitute && (
											<div className="flex items-center gap-1.5 pt-0.5 font-sans">
												<span className="text-[10px] font-bold text-[#FE7914]">↳ Sub:</span>
												<span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200/70">
													{obs.substituteProduct}
												</span>
											</div>
										)}

										<span className="block font-mono text-[10px] text-slate-400">
											{obs.product?.barcode || obs.product?.sku || obs.productId}
											{obs.product?.unit ? ` • ${obs.product.unit}` : ""}
										</span>
									</div>
								</td>

								<td className="px-4 py-3">
									<p className="font-bold text-slate-800">
										{obs.audit?.store?.name || "Store"}
									</p>
									<p className="font-mono text-[10px] text-slate-400">
										{obs.audit?.store?.competitor?.name}
										{obs.audit?.store?.area && ` • ${obs.audit.store.area}`}
									</p>
								</td>

								<td className="px-4 py-3 text-center">
									<ObservationAvailabilityBadge availability={obs.availability} />
								</td>

								<td className="px-4 py-3 text-right">
									{obs.price !== null && obs.price !== undefined ? (
										<div>
											<span className="font-mono text-xs font-black text-slate-900">
												{formatPrice(obs.price)}
											</span>
											{hasSubstitute && (
												<span className="block text-[9px] font-bold uppercase tracking-wider text-[#FE7914]">
													Sub. Price
												</span>
											)}
										</div>
									) : (
										<span className="font-mono text-xs text-slate-400">—</span>
									)}
								</td>

								<td className="px-4 py-3 text-center">
									<ObservationReviewBadge status={obs.review?.status} />
								</td>

								<td className="px-4 py-3 text-center">
									<ObservationSyncBadge status={obs.sync?.status} />
								</td>

								<td className="px-4 py-3 text-right font-mono text-[11px] text-slate-500">
									{formatCapturedAt(obs.capturedAt)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};