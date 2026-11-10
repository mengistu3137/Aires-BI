import React from "react";
import { useNavigate } from "react-router-dom";
import { formatDate, formatPrice } from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "./QueensPriceStatusBadge.jsx";
import { formatProductName } from "@/utils/formatters.js";

const TRACK_BADGES = {
	DAILY: "bg-emerald-50 text-[#017C4D] border-emerald-200",
	WEEKLY: "bg-red-50 text-[#A41821] border-red-200",
	MONTHLY: "bg-orange-50 text-[#D45F06] border-orange-200",
	BI_YEARLY: "bg-slate-100 text-slate-700 border-slate-300",
};

export const QueensPriceListTable = ({ prices = [] }) => {
	const navigate = useNavigate();

	if (prices.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
				<p className="text-xs font-medium text-slate-400">
					No products match your filters
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
			<div className="overflow-x-auto">
				<table className="w-full text-left text-xs">
					<thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
						<tr>
							<th className="w-16 px-3 py-3 text-center">No.</th>
							<th className="px-4 py-3">Product Item</th>
							<th className="px-4 py-3">Track</th>
							<th className="px-4 py-3">Category</th>
							<th className="px-4 py-3 text-right">Benchmark Price</th>
							<th className="px-4 py-3">Effective Period</th>
							<th className="px-4 py-3">Status</th>
							<th className="px-4 py-3 text-right">Action</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-100 text-slate-700">
						{prices.map((item) => {
							const track = item.product?.frequency || "WEEKLY";
							const badgeStyle = TRACK_BADGES[track] || TRACK_BADGES.WEEKLY;
							const seqNo = item.product?.sortOrder ?? "—";

							return (
								<tr
									key={item.id || item.productId}
									className="transition hover:bg-slate-50/75"
								>
									{/* Sequence Index from Excel SortedBy */}
									<td className="px-3 py-3 text-center">
										<span className="inline-flex items-center justify-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">
											#{seqNo}
										</span>
									</td>

									{/* Product Item */}
									<td className="px-4 py-3">
										<div className="font-bold text-slate-900">
											{formatProductName(item.product?.name) || "—"} (
											{item.product?.unit || "pcs"})
										</div>
										<div className="font-mono text-[10px] text-slate-400">
											Item Code:{" "}
											<span className="font-semibold text-slate-600">
												{item.product?.barcode ||
													item.product?.sku ||
													item.productId}
											</span>
										</div>
									</td>

									{/* Track */}
									<td className="px-4 py-3">
										<span
											className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${badgeStyle}`}
										>
											{track.replace("_", "-")}
										</span>
									</td>

									{/* Category */}
									<td className="px-4 py-3 text-slate-500">
										<span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
											{item.product?.category || "—"}
										</span>
									</td>

									{/* Benchmark Price */}
									<td className="px-4 py-3 text-right">
										{item.price !== null ? (
											<div>
												<span className="font-mono font-bold text-slate-900">
													{formatPrice(item.price)}
												</span>
												{item.revisionCount > 1 && (
													<div className="text-[10px] text-slate-400">
														{item.revisionCount} revisions
													</div>
												)}
											</div>
										) : (
											<span className="font-mono text-xs font-semibold text-slate-400">
												0.00 ETB
											</span>
										)}
									</td>

									{/* Effective Period */}
									<td className="px-4 py-3 font-mono text-[11px] text-slate-500">
										{item.effectiveFrom ? (
											<>
												{formatDate(item.effectiveFrom)} →{" "}
												{item.effectiveTo
													? formatDate(item.effectiveTo)
													: "Present"}
											</>
										) : (
											"—"
										)}
									</td>

									{/* Status */}
									<td className="px-4 py-3">
										{item.status === "NO_BENCHMARK" ? (
											<span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">
												NOT SET
											</span>
										) : (
											<QueensPriceStatusBadge status={item.status} />
										)}
									</td>

									{/* Action */}
									<td className="px-4 py-3 text-right">
										{item.id ? (
											<button
												type="button"
												onClick={() => navigate(`/queens-prices/${item.id}`)}
												className="cursor-pointer font-bold text-[#A41821] hover:underline"
											>
												Update Price
											</button>
										) : (
											<button
												type="button"
												onClick={() =>
													navigate(
														`/queens-prices/new?productId=${item.productId}`,
													)
												}
												className="cursor-pointer font-bold text-[#017C4D] hover:underline"
											>
												+ Set Price
											</button>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};