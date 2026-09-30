import React, { useState } from "react";

export const RecalculateConfirmModal = ({
	isOpen,
	onCancel,
	onConfirm,
	isPending,
	surveyPeriodName,
}) => {
	const [stream, setStream] = useState("ALL");
	const [asOfDate, setAsOfDate] = useState("");

	if (!isOpen) return null;

	const handleConfirm = () => {
		onConfirm({
			categoryStream: stream,
			asOfDate: asOfDate || undefined,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
				onClick={onCancel}
			/>
			<div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-4">
				<div>
					<h3 className="text-base font-black text-slate-900">
						Recalculate Market Price Index
					</h3>
					<p className="mt-1 text-xs text-slate-500">
						Evaluating against{" "}
						<span className="font-bold text-slate-700">
							{surveyPeriodName || "active survey cycle"}
						</span>
						.
					</p>
				</div>

				{/* Stream Scope Selection */}
				<div className="space-y-1.5">
					<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						Category Stream Scope
					</label>
					<div className="grid grid-cols-3 gap-2">
						{[
							{ id: "ALL", label: "All Items", target: "95% / 92%" },
							{ id: "FRESH", label: "⚡ Daily Fresh", target: "92% Target" },
							{ id: "FMCG", label: "🛒 FMCG Core", target: "95% Target" },
						].map((tab) => (
							<button
								key={tab.id}
								type="button"
								onClick={() => setStream(tab.id)}
								className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition cursor-pointer ${
									stream === tab.id
										? "border-[#A41821] bg-red-50/50 text-[#A41821] ring-1 ring-[#A41821]"
										: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
								}`}
							>
								<span className="text-xs font-bold">{tab.label}</span>
								<span className="text-[9px] font-medium opacity-70">
									{tab.target}
								</span>
							</button>
						))}
					</div>
				</div>

				{/* Date Filter */}
				<div className="space-y-1.5">
					<label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
						Effective Date (Optional Daily/Historical)
					</label>
					<input
						type="date"
						value={asOfDate}
						onChange={(e) => setAsOfDate(e.target.value)}
						className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden"
					/>
					<p className="text-[10px] text-slate-400">
						Leave blank to include all approved observations for the cycle.
					</p>
				</div>

				{/* Actions */}
				<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
					<button
						type="button"
						onClick={onCancel}
						disabled={isPending}
						className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={handleConfirm}
						disabled={isPending}
						className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
					>
						{isPending ? "Calculating..." : "Run Analysis"}
					</button>
				</div>
			</div>
		</div>
	);
};