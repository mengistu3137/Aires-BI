import React from "react";

export const AlertsBanner = ({ alerts = [] }) => {
	if (!alerts.length) return null;

	return (
		<div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-xs space-y-2.5">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FE7914] text-white text-[11px] font-bold">
						!
					</span>
					<h3 className="text-xs font-bold text-[#A41821] uppercase tracking-wider">
						Critical Pricing Action Alerts ({alerts.length})
					</h3>
				</div>
				<span className="text-[11px] font-medium text-amber-700">
					Immediate Review Required
				</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
				{alerts.slice(0, 4).map((alert) => (
					<div
						key={alert.id}
						className="flex items-center justify-between rounded-xl bg-white border border-amber-100 p-2.5 text-xs shadow-2xs"
					>
						<div>
							<span className="font-bold text-slate-800">{alert.itemName}</span>
							<p className="text-[11px] text-slate-500 mt-0.5">
								{alert.message}
							</p>
						</div>
						<span
							className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
								alert.type === "PRICE_DOWN"
									? "bg-red-50 text-[#A41821] border border-red-200"
									: "bg-emerald-50 text-[#017C4D] border border-emerald-200"
							}`}
						>
							{alert.type === "PRICE_DOWN" ? "Price Down" : "Price Up"}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};