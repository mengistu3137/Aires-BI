import React, { useState, useEffect, useRef } from "react";
import { formatProductName } from "@/utils/formatters.js";

export const RapidPriceInput = ({
	selectedProduct,
	currentIndex = 1,
	totalItems = 120,
	autoAdvance = true,
	onToggleAutoAdvance,
	onSavePrice,
	onSaveAvailability,
	onNext,
	onPrev,
	onCancel,
	isSaving = false,
}) => {
	const [price, setPrice] = useState("");
	const [substituteProduct, setSubstituteProduct] = useState("");
	const [substitutePrice, setSubstitutePrice] = useState("");
	// State controlling drawer: null | 'OUT_OF_STOCK' | 'NOT_FOUND'
	const [unavailableMode, setUnavailableMode] = useState(null);
	const [error, setError] = useState("");

	const inputRef = useRef(null);
	const substituteInputRef = useRef(null);

	// Reset when product changes
	useEffect(() => {
		if (selectedProduct) {
			setPrice("");
			setSubstituteProduct("");
			setSubstitutePrice("");
			setUnavailableMode(null);
			setError("");
			const timer = setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
					inputRef.current.select();
				}
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [selectedProduct?.id, selectedProduct?.productId]);

	// Auto-focus substitute input when drawer opens
	useEffect(() => {
		if (unavailableMode) {
			setTimeout(() => {
				substituteInputRef.current?.focus();
			}, 80);
		}
	}, [unavailableMode]);

	if (!selectedProduct) return null;

	const handlePriceSubmit = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setError("");

		const numeric = parseFloat(price);
		if (isNaN(numeric) || numeric <= 0) {
			setError("Please enter a valid price greater than 0");
			inputRef.current?.focus();
			return;
		}

		onSavePrice({
			productId: selectedProduct.id || selectedProduct.productId,
			price: numeric,
			availability: "AVAILABLE",
		});
	};

	const handleKeyDown = (e) => {
		if (e.key === "Escape") {
			if (unavailableMode) {
				setUnavailableMode(null);
				setError("");
			} else {
				onCancel?.();
			}
		}
	};

	// Save with substitute
	const handleConfirmSubstitute = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setError("");

		if (!substituteProduct.trim()) {
			setError("Please enter what substitute product was found on the shelf");
			substituteInputRef.current?.focus();
			return;
		}

		const chosenPrice = substitutePrice || price;
		const numericSubPrice = parseFloat(chosenPrice);

		if (isNaN(numericSubPrice) || numericSubPrice <= 0) {
			setError("Please enter the price of the substitute product");
			return;
		}

		onSaveAvailability({
			productId: selectedProduct.id || selectedProduct.productId,
			availability: unavailableMode,
			price: numericSubPrice,
			substituteProduct: substituteProduct.trim(),
		});
	};

	// Save plain out of stock / not carried without substitute
	const handleConfirmWithoutSubstitute = (e) => {
		e.preventDefault();
		e.stopPropagation();

		onSaveAvailability({
			productId: selectedProduct.id || selectedProduct.productId,
			availability: unavailableMode,
			price: null,
			substituteProduct: null,
		});
	};

	return (
		<div className="rounded-2xl border-2 border-[#A41821] bg-white p-4 shadow-xl space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
			{/* Product Title Header */}
			<div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#A41821] font-mono">
							Active Item
						</span>
						<span className="text-[10px] text-slate-400 font-mono">
							#{currentIndex} of {totalItems}
						</span>
					</div>

					<h3 className="mt-1 text-base font-bold text-slate-900 leading-snug truncate">
						{formatProductName(selectedProduct.name)}
					</h3>
					<div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
						<span>
							CODE: {selectedProduct.barcode || selectedProduct.sku || selectedProduct.id}
						</span>
						<span>•</span>
						<span>
							UNIT: {selectedProduct.unit || "pcs"}
						</span>
					</div>
				</div>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onPrev}
						disabled={isSaving}
						className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-30"
						title="Previous item"
					>
						◀
					</button>
					<button
						type="button"
						onClick={onNext}
						disabled={isSaving}
						className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-30"
						title="Skip to next item"
					>
						▶
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
						title="Close (Esc)"
					>
						✕
					</button>
				</div>
			</div>

			{/* ========================================================= */}
			{/* DRAWER STATE: RECORD SUBSTITUTE (Triggered by Buttons)   */}
			{/* ========================================================= */}
			{unavailableMode ? (
				<div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3.5 space-y-3 animate-in fade-in slide-in-from-top-2">
					<div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
						<span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
							{unavailableMode === "OUT_OF_STOCK"
								? "⚠️ Item Out of Stock — Record Shelf Substitute"
								: "⚠️ Item Not Carried — Record Closest Benchmark"}
						</span>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setUnavailableMode(null);
								setError("");
							}}
							className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
						>
							Cancel
						</button>
					</div>

					<div>
						<label className="block text-xs font-bold text-slate-800 mb-1">
							Substitute Product / Action Taken *
						</label>
						<input
							ref={substituteInputRef}
							type="text"
							placeholder={
								unavailableMode === "OUT_OF_STOCK"
									? "e.g. Dove OOS, captured Lux 150g as substitute"
									: "e.g. Not carried, captured local garlic instead"
							}
							value={substituteProduct}
							onChange={(e) => {
								setSubstituteProduct(e.target.value);
								setError("");
							}}
							className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-medium"
						/>
					</div>

					<div>
						<label className="block text-xs font-bold text-slate-800 mb-1">
							Substitute Shelf Price (ETB) *
						</label>
						<div className="relative">
							<input
								type="text"
								inputMode="decimal"
								pattern="[0-9]*[.,]?[0-9]*"
								placeholder="0.00"
								value={substitutePrice || price}
								onChange={(e) => {
									const val = e.target.value.replace(",", ".");
									if (/^\d*\.?\d{0,2}$/.test(val)) {
										setSubstitutePrice(val);
										setError("");
									}
								}}
								className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 pr-14 text-base font-bold font-mono text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
							/>
							<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-slate-400 font-mono">
								ETB
							</span>
						</div>
					</div>

					{error && (
						<p className="text-xs font-semibold text-[#A41821]">{error}</p>
					)}

					<div className="pt-1 flex flex-col gap-2">
						<button
							type="button"
							onClick={handleConfirmSubstitute}
							disabled={isSaving}
							className="w-full rounded-xl bg-[#FE7914] hover:bg-[#D45F06] py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
						>
							Save with Substitute (Enter ↵)
						</button>

						<button
							type="button"
							onClick={handleConfirmWithoutSubstitute}
							disabled={isSaving}
							className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-[11px] font-semibold text-slate-600 transition cursor-pointer disabled:opacity-50"
						>
							No Substitute on Shelf (Confirm {unavailableMode.replace("_", " ")})
						</button>
					</div>
				</div>
			) : (
				/* ========================================================= */
				/* NORMAL STATE: ENTER PRICE & ACTION BUTTONS               */
				/* ========================================================= */
				<div className="space-y-3">
					<form onSubmit={handlePriceSubmit}>
						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="text-xs font-bold text-slate-700">
									Observed shelf price
								</label>
								<span className="text-[10px] text-slate-400">
									Press <kbd className="font-mono font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded">Enter ↵</kbd>
								</span>
							</div>

							<div className="relative">
								<input
									ref={inputRef}
									type="text"
									inputMode="decimal"
									pattern="[0-9]*[.,]?[0-9]*"
									autoComplete="off"
									disabled={isSaving}
									value={price}
									onChange={(e) => {
										const val = e.target.value.replace(",", ".");
										if (/^\d*\.?\d{0,2}$/.test(val)) {
											setPrice(val);
											setError("");
										}
									}}
									onKeyDown={handleKeyDown}
									placeholder="0.00"
									className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3.5 pl-4 pr-16 text-2xl font-black text-slate-900 placeholder:text-slate-300 focus:border-[#A41821] focus:bg-white focus:ring-2 focus:ring-[#A41821]/15 outline-hidden font-mono transition"
								/>
								<span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 font-mono">
									ETB
								</span>
							</div>
							{error && (
								<p className="text-xs font-semibold text-[#A41821] mt-1">{error}</p>
							)}
						</div>

						<button
							type="submit"
							disabled={isSaving || !price}
							className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-40 cursor-pointer"
						>
							<span>Save price observation</span>
							<kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-mono font-bold">
								↵ Enter
							</kbd>
						</button>
					</form>

					{/* STOCK EXCEPTION BUTTONS (STRICTLY OUTSIDE FORM) */}
					<div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setUnavailableMode("OUT_OF_STOCK");
								setError("");
							}}
							disabled={isSaving}
							className="flex-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2.5 text-xs font-bold text-[#FE7914] hover:bg-amber-100/60 transition cursor-pointer"
						>
							OUT OF STOCK
						</button>

						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								setUnavailableMode("NOT_FOUND");
								setError("");
							}}
							disabled={isSaving}
							className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
						>
							NOT CARRIED
						</button>
					</div>
				</div>
			)}
		</div>
	);
};