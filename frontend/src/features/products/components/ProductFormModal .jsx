// frontend/src/features/products/components/ProductFormModal.jsx
import React, { useEffect, useState } from "react";

const FREQUENCIES = [
	{ value: "DAILY", label: "Daily Fresh" },
	{ value: "WEEKLY", label: "Weekly Ultra" },
	{ value: "MONTHLY", label: "Monthly Sensitive" },
	{ value: "BI_YEARLY", label: "Bi-Yearly" },
];

const EMPTY = {
	id: "",
	name: "",
	barcode: "",
	sku: "",
	category: "",
	unit: "pcs",
	frequency: "WEEKLY",
	sortOrder: "",
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
				sortOrder: product.sortOrder > 0 ? String(product.sortOrder) : "",
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

		const sortText = String(form.sortOrder).trim();
		const sortOrder = Number(sortText);
		const base = {
			name: form.name.trim(),
			description: form.description.trim() || null,
			category: form.category.trim() || "General",
			unit: form.unit.trim() || "pcs",
			frequency: form.frequency,
			active: form.active,
			...(sortText !== "" && Number.isInteger(sortOrder) && sortOrder >= 0
				? { sortOrder }
				: {}),
		};

		if (isEdit) {
			const payload = { ...base };
			if (form.barcode.trim()) payload.barcode = form.barcode.trim();
			if (form.sku.trim()) payload.sku = form.sku.trim();
			onSubmit(payload);
			return;
		}

		const priceNum = Number(form.initialQueensPrice);
		if (!Number.isFinite(priceNum) || priceNum <= 0) return;
		onSubmit({
			...base,
			id: form.id.trim(),
			barcode: form.barcode.trim() || null,
			sku: form.sku.trim() || null,
			initialQueensPrice: priceNum,
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
			<div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
				<div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
					<div>
						<h3 className="text-base font-black text-slate-900">
							{isEdit ? "Edit Product" : "Add Product"}
						</h3>
						<p className="mt-0.5 text-[11px] font-medium text-slate-500">
							{isEdit
								? "Update the catalog record. The item code stays the same."
								: "Adds the item to the catalog and sets its first Queens benchmark price."}
						</p>
					</div>
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
							Item code <span className="text-[#A41821]">*</span>
						</label>
						<input
							required
							disabled={isEdit}
							value={form.id}
							onChange={set("id")}
							placeholder="e.g. 6291105766388 or VEG-01"
							className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm disabled:bg-slate-100 disabled:text-slate-500"
						/>
						<p className="mt-1 text-[10px] text-slate-400">
							Catalog id. Barcode can be the same value, or left blank.
						</p>
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
								<option key={f.value} value={f.value}>
									{f.label}
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

					<div>
						<label className="block font-semibold text-slate-700 mb-1">
							Catalog sequence
						</label>
						<input
							type="number"
							min="0"
							step="1"
							value={form.sortOrder}
							onChange={set("sortOrder")}
							placeholder="Optional. Lower numbers appear first."
							className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono"
						/>
					</div>

					{!isEdit && (
						<div>
							<label className="block font-semibold text-slate-700 mb-1">
								Initial Queens benchmark price (ETB){" "}
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
									: "Add Product"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};