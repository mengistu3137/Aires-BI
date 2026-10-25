// frontend/src/features/products/components/ProductFormModal.jsx
import React, { useEffect, useState } from "react";

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"];

const EMPTY = {
	id: "",
	name: "",
	barcode: "",
	sku: "",
	category: "",
	unit: "pcs",
	frequency: "WEEKLY",
	description: "",
	initialQueensPrice: "",
	active: true,
};

export const ProductFormModal = ({
	mode,
	product,
	onClose,
	onSubmit,
	isSaving,
}) => {
	const isEdit = mode === "edit";
	const [form, setForm] = useState(EMPTY);

	useEffect(() => {
		if (isEdit && product) {
			setForm({
				id: product.id ?? "",
				name: product.name ?? "",
				barcode: product.barcode ?? "",
				sku: product.sku ?? "",
				category: product.category ?? "",
				unit: product.unit ?? "pcs",
				frequency: product.frequency ?? "WEEKLY",
				description: product.description ?? "",
				initialQueensPrice: "",
				active: product.active ?? true,
			});
		} else {
			setForm(EMPTY);
		}
	}, [isEdit, product]);

	const set = (k) => (e) => {
		const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
		setForm((f) => ({ ...f, [k]: v }));
	};

	const handleSubmit = (e) => {
		e.preventDefault();

		const base = {
			name: form.name.trim(),
			description: form.description.trim() || null,
			category: form.category.trim() || "General",
			unit: form.unit.trim() || "pcs",
			frequency: form.frequency,
			active: form.active,
		};

		if (isEdit) {
			// Only send fields that updateProductSchema accepts
			const payload = { ...base };
			if (form.barcode.trim()) payload.barcode = form.barcode.trim();
			if (form.sku.trim()) payload.sku = form.sku.trim();
			onSubmit(payload);
			return;
		}

		// Create — schema requires id + initialQueensPrice > 0
		const priceNum = Number(form.initialQueensPrice);
		onSubmit({
			...base,
			id: form.id.trim(),
			barcode: form.barcode.trim() || null,
			sku: form.sku.trim() || null,
			initialQueensPrice:
				Number.isFinite(priceNum) && priceNum > 0 ? priceNum : 0.01,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
			<div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
				<div className="flex items-center justify-between border-b border-slate-100 pb-3">
					<h3 className="text-base font-black text-slate-900">
						{isEdit ? "Edit Product" : "New Product"}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="text-slate-400 hover:text-slate-600 cursor-pointer"
					>
						✕
					</button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-3 text-xs">
					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Item Code / Barcode <span className="text-[#A41821]">*</span>
						</label>
						<input
							required
							disabled={isEdit}
							value={form.id}
							onChange={set("id")}
							placeholder="e.g. 6291105766388 or VEG-01"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-500"
						/>
					</div>

					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Product Name <span className="text-[#A41821]">*</span>
						</label>
						<input
							required
							value={form.name}
							onChange={set("name")}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Category
							</label>
							<input
								value={form.category}
								onChange={set("category")}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
							/>
						</div>
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Unit
							</label>
							<input
								value={form.unit}
								onChange={set("unit")}
								placeholder="pcs / kg / L"
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
							/>
						</div>
					</div>

					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Survey Frequency
						</label>
						<select
							value={form.frequency}
							onChange={set("frequency")}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
						>
							{FREQUENCIES.map((f) => (
								<option key={f} value={f}>
									{f}
								</option>
							))}
						</select>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Barcode
							</label>
							<input
								value={form.barcode}
								onChange={set("barcode")}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
							/>
						</div>
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								SKU
							</label>
							<input
								value={form.sku}
								onChange={set("sku")}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm"
							/>
						</div>
					</div>

					{!isEdit && (
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Initial Queens Benchmark Price (ETB){" "}
								<span className="text-[#A41821]">*</span>
							</label>
							<input
								type="number"
								step="0.01"
								min="0.01"
								required
								value={form.initialQueensPrice}
								onChange={set("initialQueensPrice")}
								className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
							/>
						</div>
					)}

					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Description
						</label>
						<textarea
							rows={2}
							value={form.description}
							onChange={set("description")}
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
						/>
					</div>

					<label className="inline-flex items-center gap-2 text-slate-700 font-semibold">
						<input
							type="checkbox"
							checked={form.active}
							onChange={set("active")}
							className="accent-[#017C4D]"
						/>
						Active (visible in surveys)
					</label>

					<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
						<button
							type="button"
							onClick={onClose}
							className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSaving}
							className="rounded-xl bg-[#017C4D] hover:bg-[#01633D] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
						>
							{isSaving
								? "Saving..."
								: isEdit
									? "Save Changes"
									: "Create Product"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};