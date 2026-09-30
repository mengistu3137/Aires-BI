import React, { useState, useEffect, useRef } from "react";
import { formatPrice } from "../utils/price-analysis.utils.js";
import { formatProductName } from "@/utils/formatters.js";
import { useApplyRecommendedPrice } from "../hooks/usePriceAnalysisMutations.js";
import { useCreateQueensPrice } from "@/features/queens-prices/hooks/useQueensPriceMutations.js";
import toast from "react-hot-toast";

export const RapidPriceAdjustmentDrawer = ({
	isOpen,
	onClose,
	analyses = [],
}) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [priceInput, setPriceInput] = useState("");
	const inputRef = useRef(null);

	const applyRecommended = useApplyRecommendedPrice();
	const createQueensPrice = useCreateQueensPrice();

	const currentAnalysis = analyses[currentIndex];

	useEffect(() => {
		if (currentAnalysis) {
			const defaultPrice =
				currentAnalysis.recommendedPrice ?? currentAnalysis.queensPrice ?? "";
			setPriceInput(defaultPrice ? String(defaultPrice) : "");
			setTimeout(() => {
				inputRef.current?.focus();
				inputRef.current?.select();
			}, 50);
		}
	}, [currentIndex, currentAnalysis]);

	if (!isOpen || analyses.length === 0) return null;

	const handleNext = () => {
		if (currentIndex < analyses.length - 1) {
			setCurrentIndex((prev) => prev + 1);
		} else {
			toast.success("All items reviewed!");
			onClose();
		}
	};

	const handlePrev = () => {
		if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
	};

	const handleSaveAndNext = async (e) => {
		e?.preventDefault();
		const numeric = parseFloat(priceInput);
		if (!numeric || numeric <= 0) {
			toast.error("Please enter a valid price");
			return;
		}

		try {
			// If price matches recommended price exactly, use 1-click optimization
			if (
				currentAnalysis.recommendedPrice &&
				Number(currentAnalysis.recommendedPrice) === numeric
			) {
				await applyRecommended.mutateAsync(currentAnalysis.id);
			} else {
				// Manual custom price adjustment
				await createQueensPrice.mutateAsync({
					productId: currentAnalysis.productId,
					price: numeric,
					effectiveFrom: new Date(),
					source: "Rapid Benchmark Adjustment Engine",
					notes: `Rapid adjustment during cycle ${currentAnalysis.surveyPeriodId}`,
				});
			}
			handleNext();
		} catch (err) {
			// Handled by mutation toast
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex justify-end">
			<div
				className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
				onClick={onClose}
			/>

			<div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 p-4">
					<div>
						<div className="flex items-center gap-2">
							<span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#A41821] font-mono">
								Item {currentIndex + 1} of {analyses.length}
							</span>
							<span className="text-[10px] font-bold text-slate-400">
								Action: {currentAnalysis?.action}
							</span>
						</div>
						<h2 className="mt-1 text-base font-bold text-slate-900 truncate max-w-xs">
							{formatProductName(currentAnalysis?.product?.name)}
						</h2>
						<p className="text-[11px] text-slate-500 font-medium">
							{currentAnalysis?.product?.category} • SKU:{" "}
							{currentAnalysis?.product?.sku || "—"}
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
					>
						✕
					</button>
				</div>

				{/* Content Body */}
				<div className="flex-1 p-5 space-y-4 overflow-y-auto">
					{/* Comparison Cards */}
					<div className="grid grid-cols-2 gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Current Queens
							</p>
							<p className="mt-0.5 font-mono text-base font-black text-slate-900">
								{formatPrice(currentAnalysis?.queensPrice)}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Competitor Avg
							</p>
							<p className="mt-0.5 font-mono text-base font-bold text-slate-700">
								{formatPrice(currentAnalysis?.competitorAveragePrice)}
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
								Target Index
							</p>
							<p className="mt-0.5 font-mono text-xs font-bold text-slate-700">
								{currentAnalysis?.targetIndex}%
							</p>
						</div>
						<div>
							<p className="text-[10px] font-bold uppercase tracking-wider text-[#017C4D]">
								Recommended
							</p>
							<p className="mt-0.5 font-mono text-xs font-black text-[#017C4D]">
								{formatPrice(currentAnalysis?.recommendedPrice)}
							</p>
						</div>
					</div>

					{/* Rapid Price Input */}
					<form onSubmit={handleSaveAndNext} className="space-y-3 pt-2">
						<div>
							<label className="text-xs font-bold text-slate-700 block mb-1">
								New Queens Benchmark Price
							</label>
							<div className="relative">
								<input
									ref={inputRef}
									type="text"
									inputMode="decimal"
									value={priceInput}
									onChange={(e) => {
										const val = e.target.value.replace(",", ".");
										if (/^\d*\.?\d{0,2}$/.test(val)) setPriceInput(val);
									}}
									className="w-full rounded-xl border-2 border-[#A41821] bg-white py-3.5 pl-4 pr-16 text-2xl font-black text-slate-900 font-mono shadow-xs focus:outline-hidden"
									placeholder="0.00"
								/>
								<span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 font-mono">
									ETB
								</span>
							</div>
						</div>

						<button
							type="submit"
							disabled={
								applyRecommended.isPending || createQueensPrice.isPending
							}
							className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] cursor-pointer disabled:opacity-40"
						>
							<span>Save Benchmark &amp; Next</span>
							<kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-mono font-bold">
								↵ Enter
							</kbd>
						</button>
					</form>
				</div>

				{/* Footer Navigation */}
				<div className="flex items-center justify-between border-t border-slate-100 p-4">
					<button
						type="button"
						onClick={handlePrev}
						disabled={currentIndex === 0}
						className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
					>
						◀ Previous
					</button>
					<button
						type="button"
						onClick={handleNext}
						className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
					>
						Skip ▶
					</button>
				</div>
			</div>
		</div>
	);
};