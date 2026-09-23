import React, { useState } from "react";

export const ObservationAuditDrawer = ({
	isOpen,
	onClose,
	observations = {},
	products = [],
	onEditPrice,
}) => {
	const [editingProductId, setEditingProductId] = useState(null);
	const [editedPrice, setEditedPrice] = useState("");

	if (!isOpen) return null;

	const observationEntries = Object.entries(observations);

	const handleStartEdit = (productId, currentPrice) => {
		setEditingProductId(productId);
		setEditedPrice(currentPrice ? String(currentPrice) : "");
	};

	const handleSaveEdit = (productId) => {
		const num = parseFloat(editedPrice);
		if (!isNaN(num) && num > 0) {
			onEditPrice({ productId, price: num, availability: "AVAILABLE" });
		}
		setEditingProductId(null);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
			<div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-none">
					<div>
						<h2 className="text-base font-black text-slate-900">
							Audit Observation Log
						</h2>
						<p className="text-xs text-slate-500">
							{observationEntries.length} items recorded during this visit
						</p>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
					>
						✕
					</button>
				</div>

				{/* Observation Items List */}
				<div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2">
					{observationEntries.length === 0 ? (
						<div className="p-8 text-center text-xs text-slate-400">
							No prices or out-of-stock items recorded yet for this store.
						</div>
					) : (
						observationEntries.map(([productId, obs]) => {
							const product = products.find(
								(p) => (p.productId || p.id) === productId,
							);
							const isEditing = editingProductId === productId;

							return (
								<div
									key={productId}
									className="py-3 flex items-center justify-between gap-3 text-xs"
								>
									<div className="min-w-0 flex-1">
										<span className="font-bold text-slate-900 block truncate">
											{product?.name || productId}
										</span>
										<span className="text-[11px] text-slate-400 font-mono">
											Code: {product?.barcode || product?.sku || productId} •{" "}
											{product?.category}
										</span>
									</div>

									{isEditing ? (
										<div className="flex items-center gap-1.5 flex-none">
											<input
												type="number"
												step="0.01"
												value={editedPrice}
												onChange={(e) => setEditedPrice(e.target.value)}
												className="w-20 rounded-lg border border-[#A41821] px-2 py-1 text-xs font-mono font-bold"
												autoFocus
											/>
											<button
												type="button"
												onClick={() => handleSaveEdit(productId)}
												className="rounded-lg bg-[#017C4D] px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer"
											>
												✓
											</button>
										</div>
									) : (
										<div className="flex items-center gap-3 flex-none text-right">
											{obs.availability === "AVAILABLE" ? (
												<span className="font-mono font-black text-sm text-[#017C4D]">
													{Number(obs.price).toFixed(2)} ETB
												</span>
											) : (
												<span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-[#FE7914] border border-amber-200">
													{obs.availability.replace("_", " ")}
												</span>
											)}

											<button
												type="button"
												onClick={() => handleStartEdit(productId, obs.price)}
												className="text-slate-400 hover:text-slate-700 underline text-[11px] cursor-pointer"
											>
												Edit
											</button>
										</div>
									)}
								</div>
							);
						})
					)}
				</div>

				{/* Footer */}
				<div className="pt-3 border-t border-slate-100 flex-none flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="w-full sm:w-auto rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer hover:bg-slate-800"
					>
						Done Reviewing
					</button>
				</div>
			</div>
		</div>
	);
};