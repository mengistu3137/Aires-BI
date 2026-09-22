import React from "react";

export const CategoryIndexList = ({ categories = [], targetPercent = 95 }) => {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
			<div className="flex items-center justify-between border-b border-slate-100 pb-3">
				<h3 className="text-sm font-bold text-slate-900">
					Category Price Index Breakdown
				</h3>
				<span className="text-xs font-semibold text-slate-500">
					Benchmark: {targetPercent}%
				</span>
			</div>

			<div className="space-y-3.5">
				{categories.map((cat) => {
					const isOnTarget = cat.priceIndexPercent <= targetPercent;

					return (
						<div key={cat.category} className="space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold text-slate-800">
									{cat.category}
									<span className="text-slate-400 font-normal ml-1">
										({cat.itemCount} items)
									</span>
								</span>
								<div className="flex items-center gap-2">
									<span className="font-mono font-bold text-slate-900">
										{cat.priceIndexPercent}%
									</span>
									<span
										className={`h-2 w-2 rounded-full ${
											isOnTarget ? "bg-[#017C4D]" : "bg-[#A41821]"
										}`}
									/>
								</div>
							</div>

							{/* Progress track */}
							<div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
								<div
									className="h-full rounded-full transition-all duration-300"
									style={{
										width: `${Math.min(cat.priceIndexPercent, 120)}%`,
										backgroundColor: isOnTarget ? "#017C4D" : "#A41821",
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};