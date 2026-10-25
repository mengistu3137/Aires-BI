// frontend/src/features/products/ProductsPage.jsx
import React, { useState, useRef } from "react";
import { DataTable } from "@/components/DataTable.jsx";
import { Can } from "@/components/Can.jsx";
import { ConfirmDialog } from "@/components/ConfirmDialog.jsx";
import toast from "react-hot-toast";
import { formatProductName } from "@/utils/formatters.js";
import { useProducts } from "../hooks/useProducts.js";
import { parseItemMasterWorkbook } from "../utils/parseItemMaster.js";
import { ProductFormModal } from "../components/ProductFormModal .jsx";

const TIER_FILTERS = [
	{ label: "ALL", frequency: null },
	{ label: "Fresh (Daily)", frequency: "DAILY" },
	{ label: "Ultra-Sensitive (Weekly)", frequency: "WEEKLY" },
	{ label: "Sensitive (Monthly)", frequency: "MONTHLY" },
	{ label: "Non-Sensitive (Bi-yearly)", frequency: "BI_YEARLY" },
];

const CHUNK_SIZE = 200;

const extractStats = (res) => {
	const candidates = [res?.data?.data, res?.data, res?.data?.result, res];
	return (
		candidates.find((c) => c && typeof c.insertedCount === "number") || null
	);
};

export const ProductsPage = () => {
	const {
		products,
		isLoading,
		addPrice,
		isUpdatingPrice,
		bulkImport,
		isImporting,
		createProduct,
		isCreating,
		updateProduct,
		isUpdating,
		deleteProduct,
		isDeleting,
	} = useProducts();

	const [selectedTier, setSelectedTier] = useState("ALL");
	const [activeProductForPrice, setActiveProductForPrice] = useState(null);
	const [newPrice, setNewPrice] = useState("");
	const [priceNotes, setPriceNotes] = useState("");

	// Import
	const fileInputRef = useRef(null);
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [importProgress, setImportProgress] = useState({
		current: 0,
		total: 0,
		percentage: 0,
	});
	const [importSummary, setImportSummary] = useState(null);

	// CRUD
	const [formModal, setFormModal] = useState({
		open: false,
		mode: "create",
		product: null,
	});
	const [deleteTarget, setDeleteTarget] = useState(null);
	const [deleteError, setDeleteError] = useState(null); // 409 → archive prompt

	const activeFilter = TIER_FILTERS.find((t) => t.label === selectedTier);
	const filteredProducts = activeFilter?.frequency
		? products.filter((p) => p.frequency === activeFilter.frequency)
		: products;

	// ------------------------------ CRUD ------------------------------
	const openCreate = () =>
		setFormModal({ open: true, mode: "create", product: null });
	const openEdit = (product) =>
		setFormModal({ open: true, mode: "edit", product });

	const handleFormSubmit = async (payload) => {
		try {
			if (formModal.mode === "create") {
				await createProduct(payload);
			} else {
				await updateProduct({ id: formModal.product.id, data: payload });
			}
			setFormModal({ open: false, mode: "create", product: null });
		} catch {
			/* toast already handled by mutation */
		}
	};

	const handleConfirmDelete = async () => {
		if (!deleteTarget) return;
		setDeleteError(null);
		try {
			await deleteProduct(deleteTarget.id);
			setDeleteTarget(null);
		} catch (err) {
			// If backend refuses because of linked survey history → switch dialog
			// to "Archive instead" mode. Otherwise leave the toast-only error.
			if (isLinkedHistoryError(err)) {
				setDeleteError(err);
			} else {
				setDeleteTarget(null);
			}
		}
	};

	const handleArchive = async () => {
		if (!deleteTarget) return;
		try {
			await updateProduct({ id: deleteTarget.id, data: { active: false } });
			setDeleteTarget(null);
			setDeleteError(null);
		} catch {
			/* toast already handled by mutation */
		}
	};

	// ------------------------------ PRICE ------------------------------
	const handleUpdatePriceSubmit = async (e) => {
		e.preventDefault();
		if (!newPrice || parseFloat(newPrice) <= 0) {
			toast.error("Please enter a valid price");
			return;
		}
		try {
			await addPrice({
				productId: activeProductForPrice.id,
				price: parseFloat(newPrice),
				effectiveFrom: new Date().toISOString(),
				notes: priceNotes || "Manual Manager Update",
			});
			setActiveProductForPrice(null);
			setNewPrice("");
			setPriceNotes("");
		} catch {
			/* handled by mutation */
		}
	};

	// ------------------------------ IMPORT ------------------------------
	const handleFileChange = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			const buffer = await file.arrayBuffer();
			const parsed = parseItemMasterWorkbook(buffer);
			const {
				items = [],
				invalid = 0,
				renamedDuplicates = [],
				crossSheetDuplicates = [],
			} = parsed;

			if (!items.length) {
				toast.error(
					"No valid products found. Check that 'Item Code' and 'Article Name' have values.",
				);
				return;
			}

			setImportSummary(null);
			setImportProgress({ current: 0, total: items.length, percentage: 0 });
			setIsImportModalOpen(true);

			let totalInserted = 0;
			let totalSkipped = invalid;

			for (let i = 0; i < items.length; i += CHUNK_SIZE) {
				const chunk = items.slice(i, i + CHUNK_SIZE);
				const res = await bulkImport(chunk);
				const stats = extractStats(res);

				if (stats) {
					totalInserted += stats.insertedCount;
					totalSkipped += stats.skippedCount;
				}

				const current = Math.min(i + CHUNK_SIZE, items.length);
				setImportProgress({
					current,
					total: items.length,
					percentage: Math.round((current / items.length) * 100),
				});
			}

			setImportSummary({
				total: items.length + invalid,
				inserted: totalInserted,
				skipped: totalSkipped,
				renamedDuplicates: renamedDuplicates.length,
				crossSheetDuplicates: crossSheetDuplicates.length,
			});

			toast.success(`Import complete! ${totalInserted} items added.`);
		} catch (err) {
			console.error("Import failed:", err);
			setIsImportModalOpen(false);
			toast.error(
				err?.response?.data?.message ||
					err?.message ||
					"Failed to parse and import Excel file",
			);
		} finally {
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	// ------------------------------ TABLE ------------------------------
	const tableColumns = [
		{
			header: "Product Item",
			key: "name",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-bold text-slate-900">
						{formatProductName(row.name)}
					</span>
					<span className="block text-[10px] font-mono text-slate-500">
						Item Code:{" "}
						<strong className="text-slate-800">
							{row.barcode || row.sku || row.id}
						</strong>
						{row.frequency ? ` • [${row.frequency}]` : ""}
						{` • Unit: ${row.unit}`}
						{row.active === false && (
							<span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
								Archived
							</span>
						)}
					</span>
				</div>
			),
		},
		{
			header: "Category",
			key: "category",
			sortable: true,
			render: (row) => (
				<span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
					{row.category}
				</span>
			),
		},
		{
			header: "Active Queens Benchmark",
			key: "currentQueensPrice",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-mono font-black text-slate-900 text-sm">
						{Number(row.currentQueensPrice || 0).toFixed(2)} ETB
					</span>
					<span className="block text-[10px] text-slate-400">
						{row.priceHistoryCount || 1} price revision(s)
					</span>
				</div>
			),
		},
		{
			header: "Action",
			key: "actions",
			align: "right",
			render: (row) => (
				<Can role={["ADMIN", "MANAGER"]}>
					<div className="flex items-center justify-end gap-3">
						<button
							type="button"
							onClick={() => {
								setActiveProductForPrice(row);
								setNewPrice(row.currentQueensPrice || "");
							}}
							className="text-xs font-semibold text-[#017C4D] hover:underline cursor-pointer"
						>
							Update Price
						</button>
						<button
							type="button"
							onClick={() => openEdit(row)}
							className="text-xs font-semibold text-slate-700 hover:underline cursor-pointer"
						>
							Edit
						</button>
						<Can role={["ADMIN"]}>
							<button
								type="button"
								onClick={() => {
									setDeleteTarget(row);
									setDeleteError(null);
								}}
								disabled={isDeleting}
								className="text-xs font-semibold text-[#A41821] hover:underline cursor-pointer disabled:opacity-50"
							>
								Delete
							</button>
						</Can>
					</div>
				</Can>
			),
		},
	];

	return (
		<div className="mx-auto max-w-6xl space-y-6 pb-12">
			{/* Top banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl font-black text-slate-900 tracking-tight">
						Master Product Catalog & Benchmark Pricing
					</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Full Item Master database ({products.length} products loaded)
					</p>
				</div>

				<Can role={["ADMIN", "MANAGER"]}>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={openCreate}
							className="flex items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer transition"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							New Product
						</button>

						<input
							type="file"
							ref={fileInputRef}
							onChange={handleFileChange}
							accept=".xlsx,.xls,.xlsm"
							className="hidden"
						/>
						<button
							type="button"
							disabled={isImporting}
							onClick={() => fileInputRef.current?.click()}
							className="flex items-center gap-2 rounded-xl bg-[#017C4D] hover:bg-[#01633D] px-4 py-2.5 text-xs font-bold text-white shadow-xs cursor-pointer transition disabled:opacity-50"
						>
							<svg
								className="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
								/>
							</svg>
							<span>
								{isImporting ? "Importing..." : "Import Item Master (Excel)"}
							</span>
						</button>
					</div>
				</Can>
			</div>

			{/* Tier filter pills & table */}
			<div className="space-y-3">
				<div className="flex items-center justify-between gap-3">
					<h2 className="text-sm font-bold text-slate-800 whitespace-nowrap">
						Product Catalog ({filteredProducts.length})
					</h2>

					<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
						{TIER_FILTERS.map((t) => (
							<button
								key={t.label}
								type="button"
								onClick={() => setSelectedTier(t.label)}
								className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
									selectedTier === t.label
										? "bg-[#A41821] text-white"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>

				<DataTable
					columns={tableColumns}
					data={filteredProducts}
					searchKey="name"
					searchPlaceholder="Search product by name, barcode, SKU, or ID..."
					pageSize={15}
					emptyMessage={
						isLoading
							? "Loading product catalog..."
							: "No products found in catalog."
					}
				/>
			</div>

			{/* Import Progress Modal */}
			{isImportModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
						<h3 className="text-base font-black text-slate-900">
							{importSummary
								? "Item Master Import Completed"
								: "Importing Item Master Database..."}
						</h3>

						{!importSummary ? (
							<div className="space-y-3">
								<p className="text-xs text-slate-600">
									Processing {importProgress.total.toLocaleString()} items in
									safe batches of {CHUNK_SIZE}. Please keep this browser window
									open.
								</p>
								<div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
									<div
										className="bg-[#017C4D] h-full transition-all duration-300"
										style={{ width: `${importProgress.percentage}%` }}
									/>
								</div>
								<div className="flex justify-between text-xs font-mono text-slate-500 font-bold">
									<span>
										{importProgress.current} / {importProgress.total} items
									</span>
									<span>{importProgress.percentage}%</span>
								</div>
							</div>
						) : (
							<div className="space-y-3">
								<div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-xs">
									<div className="flex justify-between">
										<span className="text-slate-600">Total in File:</span>
										<span className="font-bold font-mono">
											{importSummary.total}
										</span>
									</div>
									<div className="flex justify-between text-[#017C4D]">
										<span className="font-semibold">
											Successfully Inserted:
										</span>
										<span className="font-bold font-mono">
											+{importSummary.inserted}
										</span>
									</div>
									<div className="flex justify-between text-slate-500">
										<span>Skipped (Existing / Invalid):</span>
										<span className="font-bold font-mono">
											{importSummary.skipped}
										</span>
									</div>
									{importSummary.renamedDuplicates > 0 && (
										<div className="flex justify-between text-amber-700">
											<span>Same-sheet codes auto-suffixed:</span>
											<span className="font-bold font-mono">
												{importSummary.renamedDuplicates}
											</span>
										</div>
									)}
									{importSummary.crossSheetDuplicates > 0 && (
										<div className="flex justify-between text-amber-700">
											<span>Codes reused across sheets:</span>
											<span className="font-bold font-mono">
												{importSummary.crossSheetDuplicates}
											</span>
										</div>
									)}
								</div>

								<div className="flex justify-end pt-2">
									<button
										type="button"
										onClick={() => {
											setIsImportModalOpen(false);
											setImportSummary(null);
										}}
										className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-5 py-2 font-bold text-white text-xs cursor-pointer"
									>
										Close
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Benchmark Price Modal */}
			{activeProductForPrice && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<div>
								<h3 className="text-base font-bold text-slate-900">
									Update Queens Benchmark
								</h3>
								<p className="text-xs text-slate-500 font-medium">
									{activeProductForPrice.name} ({activeProductForPrice.unit})
								</p>
							</div>
							<button
								type="button"
								onClick={() => setActiveProductForPrice(null)}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
							>
								✕
							</button>
						</div>

						<form
							onSubmit={handleUpdatePriceSubmit}
							className="space-y-3 text-xs"
						>
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									New Queens Benchmark Price (ETB)
								</label>
								<input
									type="number"
									step="0.01"
									required
									min="0.1"
									placeholder="e.g. 68.00"
									value={newPrice}
									onChange={(e) => setNewPrice(e.target.value)}
									className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-mono"
								/>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Change Note / ERP Reference
								</label>
								<input
									type="text"
									placeholder="e.g. Supplier cost increase Week 39"
									value={priceNotes}
									onChange={(e) => setPriceNotes(e.target.value)}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
								<button
									type="button"
									onClick={() => setActiveProductForPrice(null)}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isUpdatingPrice}
									className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
								>
									{isUpdatingPrice ? "Saving..." : "Save Revision"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create / Edit Product Modal */}
			{formModal.open && (
				<ProductFormModal
					mode={formModal.mode}
					product={formModal.product}
					isSaving={formModal.mode === "create" ? isCreating : isUpdating}
					onClose={() =>
						setFormModal({ open: false, mode: "create", product: null })
					}
					onSubmit={handleFormSubmit}
				/>
			)}

			{/* Delete / Archive Confirmation */}
			<ConfirmDialog
				open={!!deleteTarget}
				title={deleteError ? "Cannot delete product" : "Delete product?"}
				message={
					deleteTarget
						? deleteError
							? `"${deleteTarget.name}" (${deleteTarget.id}) already has linked history and cannot be permanently deleted.`
							: `"${deleteTarget.name}" (${deleteTarget.id}) will be permanently removed.`
						: ""
				}
				details={
					deleteError
						? deleteError?.response?.data?.message ||
							deleteError?.message ||
							"Archive this product instead to keep the sales / observation history intact."
						: "If this product has linked survey history (assignments, observations, price analysis, alerts), the server will refuse to delete it and offer to archive it instead."
				}
				confirmLabel={deleteError ? "Archive Instead" : "Delete"}
				cancelLabel="Cancel"
				variant={deleteError ? "primary" : "danger"}
				isConfirming={deleteError ? isUpdating : isDeleting}
				onCancel={() => {
					setDeleteTarget(null);
					setDeleteError(null);
				}}
				onConfirm={deleteError ? handleArchive : handleConfirmDelete}
			/>
		</div>
	);
};