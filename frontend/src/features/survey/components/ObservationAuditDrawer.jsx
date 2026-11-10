import React, { useState } from "react";
import { formatProductName } from "@/utils/formatters.js";
import { apiClient } from "@/services/client.js";

const resolveAssetUrl = (url) => {
	if (!url) return "";
	if (url.startsWith("http://") || url.startsWith("https://")) return url;

	const apiBase =
		apiClient.defaults.baseURL ||
		import.meta.env.VITE_API_URL ||
		import.meta.env.VITE_API_BASE_URL ||
		"https://biapi.airescommunications.com/api/v1";

	const hostOrigin = apiBase.replace(/\/api(\/v1)?\/?$/, "");
	const normalizedPath = url.startsWith("/") ? url : `/${url}`;

	return `${hostOrigin}${normalizedPath}`;
};

export const ObservationAuditDrawer = ({
	isOpen,
	onClose,
	observations = {},
	products = [],
	onEditPrice,
}) => {
	const [editingProductId, setEditingProductId] = useState(null);
	const [editedPrice, setEditedPrice] = useState("");
	const [editedSubstitute, setEditedSubstitute] = useState("");
	const [previewPhotoUrl, setPreviewPhotoUrl] = useState(null);

	if (!isOpen) return null;

	const observationEntries = Object.entries(observations);

	const handleStartEdit = (productId, obs) => {
		setEditingProductId(productId);
		setEditedPrice(
			obs.price !== null && obs.price !== undefined ? String(obs.price) : "",
		);
		setEditedSubstitute(obs.substituteProduct || "");
	};

	const handleSaveEdit = (productId, originalObs) => {
		const num = parseFloat(editedPrice);
		const hasValidPrice = !isNaN(num) && num > 0;

		if (originalObs.availability === "AVAILABLE") {
			if (hasValidPrice) {
				onEditPrice({
					productId,
					price: num,
					availability: "AVAILABLE",
					substituteProduct: null,
				});
			}
		} else {
			onEditPrice({
				productId,
				price: hasValidPrice ? num : null,
				availability: originalObs.availability,
				substituteProduct: editedSubstitute.trim() || null,
			});
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
				<div className="flex-1 overflow-y-auto divide-y divide-slate-100 py-2 pr-1">
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
							const hasSubstitute = Boolean(obs.substituteProduct);
							const hasPhoto = Boolean(obs.evidencePhotoUrl);

							return (
								<div
									key={productId}
									className="py-3 flex flex-col gap-2 text-xs"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<span className="font-bold text-slate-900 block truncate">
												{formatProductName(product?.name || productId)}
											</span>
											<span className="text-[11px] text-slate-400 font-mono">
												Code: {product?.barcode || product?.sku || productId} •{" "}
												{product?.category}
											</span>
										</div>

										{!isEditing && (
											<button
												type="button"
												onClick={() => handleStartEdit(productId, obs)}
												className="text-slate-400 hover:text-[#A41821] underline text-[11px] cursor-pointer flex-none font-semibold"
											>
												Edit
											</button>
										)}
									</div>

									{isEditing ? (
										<div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-2">
											<div className="flex items-center justify-between">
												<span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
													Edit {obs.availability.replace("_", " ")}
												</span>
												<button
													type="button"
													onClick={() => setEditingProductId(null)}
													className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
												>
													Cancel
												</button>
											</div>

											{obs.availability !== "AVAILABLE" && (
												<div>
													<label className="block text-[10px] font-bold text-slate-700 mb-0.5">
														Substitute Product / Action Taken
													</label>
													<input
														type="text"
														placeholder="e.g. Dove OOS, captured Lux 150g"
														value={editedSubstitute}
														onChange={(e) =>
															setEditedSubstitute(e.target.value)
														}
														className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-[#A41821] outline-hidden font-medium"
													/>
												</div>
											)}

											<div>
												<label className="block text-[10px] font-bold text-slate-700 mb-0.5">
													{obs.availability !== "AVAILABLE"
														? "Substitute Price (ETB)"
														: "Observed Price (ETB)"}
												</label>
												<input
													type="number"
													step="0.01"
													placeholder="0.00"
													value={editedPrice}
													onChange={(e) => setEditedPrice(e.target.value)}
													className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-[#A41821] outline-hidden"
													autoFocus
												/>
											</div>

											<div className="flex justify-end pt-1">
												<button
													type="button"
													onClick={() => handleSaveEdit(productId, obs)}
													className="rounded-lg bg-[#017C4D] hover:bg-[#01633D] px-3 py-1.5 text-xs font-bold text-white shadow-xs cursor-pointer"
												>
													Save Changes
												</button>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-between bg-slate-50/60 rounded-lg p-2 border border-slate-100 gap-2">
											<div className="flex items-center gap-2 min-w-0 flex-1">
												<span
													className={`rounded-md px-2 py-0.5 text-[10px] font-bold border flex-none ${
														obs.availability === "AVAILABLE"
															? "bg-emerald-50 text-[#017C4D] border-emerald-200"
															: "bg-orange-50 text-[#FE7914] border-orange-200"
													}`}
												>
													{obs.availability.replace("_", " ")}
												</span>

												{hasSubstitute && (
													<span className="text-[11px] font-medium text-slate-700 truncate">
														↳ {obs.substituteProduct}
													</span>
												)}
											</div>

											<div className="flex items-center gap-2 flex-none">
												{hasPhoto && (
													<button
														type="button"
														onClick={() =>
															setPreviewPhotoUrl(obs.evidencePhotoUrl)
														}
														className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
													>
														<span>📷</span>
														<span>Proof</span>
													</button>
												)}

												{obs.price !== null && obs.price !== undefined ? (
													<span className="font-mono font-black text-xs text-slate-900">
														{Number(obs.price).toFixed(2)} ETB
													</span>
												) : (
													<span className="text-[10px] text-slate-400 font-mono">
														No Price
													</span>
												)}
											</div>
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

			{/* Mini Lightbox Preview */}
			{previewPhotoUrl && (
				<div
					className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/80 p-4 cursor-pointer"
					onClick={() => setPreviewPhotoUrl(null)}
				>
					<div
						className="relative max-h-[85vh] max-w-lg rounded-2xl bg-black p-2"
						onClick={(e) => e.stopPropagation()}
					>
						<img
							src={resolveAssetUrl(previewPhotoUrl)}
							alt="Observation proof"
							className="max-h-[75vh] w-auto object-contain mx-auto rounded-lg"
						/>
						<div className="flex justify-end pt-2">
							<button
								type="button"
								onClick={() => setPreviewPhotoUrl(null)}
								className="rounded-lg bg-white/20 px-3 py-1 text-xs font-bold text-white hover:bg-white/30"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};