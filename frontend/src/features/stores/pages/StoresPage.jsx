import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import { useStores } from "@/features/survey/hooks/useStores.js";
import { DataTable } from "@/components/DataTable.jsx";
import { Can } from "@/components/Can.jsx";

const DEFAULT_FORM_STATE = {
	competitorId: "",
	name: "",
	address: "",
	area: "",
	city: "Addis Ababa",
	type: "FMCG",
	latitude: 9.0012,
	longitude: 38.7712,
};

export const StoresPage = () => {
	// Query all physical stores (both active and archived)
	const {
		stores = [],
		isLoading,
		createStore,
		updateStore,
		deleteStore,
		isDeleting,
	} = useStores();

	// View mode: 'ACTIVE' or 'ARCHIVED'
	const [activeTab, setActiveTab] = useState("ACTIVE");
	const [selectedType, setSelectedType] = useState("ALL");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingStore, setEditingStore] = useState(null);
	const [deleteCandidate, setDeleteCandidate] = useState(null);
	const [formData, setFormData] = useState(DEFAULT_FORM_STATE);

	// Fetch real database competitors for modal selection
	const { data: competitors = [] } = useQuery({
		queryKey: ["competitors", "all"],
		queryFn: async () => {
			const res = await apiClient.get("/competitors");
			return res.data?.data?.competitors || res.data?.competitors || [];
		},
		staleTime: 5 * 60 * 1000,
	});

	// Pre-select first competitor when loaded
	useEffect(() => {
		if (competitors.length > 0 && !formData.competitorId) {
			setFormData((prev) => ({ ...prev, competitorId: competitors[0].id }));
		}
	}, [competitors, formData.competitorId]);

	const handleOpenCreateModal = () => {
		setEditingStore(null);
		setFormData({
			...DEFAULT_FORM_STATE,
			competitorId: competitors[0]?.id || "",
		});
		setIsModalOpen(true);
	};

	const handleOpenEditModal = (store) => {
		setEditingStore(store);
		setFormData({
			competitorId:
				store.competitorId || store.competitor?.id || competitors[0]?.id || "",
			name: store.name || "",
			address: store.address || "",
			area: store.area || "",
			city: store.city || "Addis Ababa",
			type: store.type || "FMCG",
			latitude: store.latitude !== null ? Number(store.latitude) : 9.0012,
			longitude: store.longitude !== null ? Number(store.longitude) : 38.7712,
		});
		setIsModalOpen(true);
	};

	// Toggle active/inactive state (Activate or Deactivate)
	const handleToggleActive = async (store) => {
		try {
			await updateStore({
				id: store.id,
				payload: { active: !store.active },
			});
		} catch {
			// Handled by mutation hook toast
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		try {
			const payload = {
				competitorId: formData.competitorId,
				name: formData.name.trim(),
				address: formData.address?.trim() || null,
				area: formData.area?.trim() || null,
				city: formData.city?.trim() || "Addis Ababa",
				type: formData.type,
				latitude: parseFloat(formData.latitude),
				longitude: parseFloat(formData.longitude),
			};

			if (editingStore) {
				await updateStore({ id: editingStore.id, payload });
			} else {
				await createStore(payload);
			}

			setIsModalOpen(false);
			setEditingStore(null);
			setFormData(DEFAULT_FORM_STATE);
		} catch {
			// Handled by mutation hook toast
		}
	};

	const handleConfirmDelete = async () => {
		if (!deleteCandidate) return;
		try {
			await deleteStore(deleteCandidate.id);
			setDeleteCandidate(null);
		} catch {
			// Handled by mutation hook toast
		}
	};

	// Separate active vs archived counts
	const activeStoresCount = useMemo(
		() => (stores || []).filter((s) => s.active !== false).length,
		[stores],
	);

	const archivedStoresCount = useMemo(
		() => (stores || []).filter((s) => s.active === false).length,
		[stores],
	);

	// Filter stores by Tab (Active vs Archived) and Type (ALL, FMCG, FRESH)
	const filteredStores = useMemo(() => {
		const byStatus = (stores || []).filter((s) =>
			activeTab === "ACTIVE" ? s.active !== false : s.active === false,
		);

		if (selectedType === "ALL") return byStatus;
		return byStatus.filter((s) => s.type === selectedType);
	}, [stores, activeTab, selectedType]);

	const tableColumns = [
		{
			header: "Store Name",
			key: "name",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-bold text-slate-900">{row.name}</span>
					<span className="block text-[11px] text-slate-500">
						{row.competitor?.name || "Competitor Market"}
					</span>
				</div>
			),
		},
		{
			header: "Type",
			key: "type",
			sortable: true,
			render: (row) => (
				<span
					className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
						row.type === "FRESH"
							? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
							: "bg-red-50 text-[#A41821] border border-red-200"
					}`}
				>
					{row.type}
				</span>
			),
		},
		{
			header: "Location & Area",
			key: "area",
			sortable: true,
			render: (row) => (
				<div>
					<span className="font-medium text-slate-800">
						{row.area || "Addis Ababa"}
					</span>
					<span className="block text-[10px] text-slate-400">
						{row.address || row.city}
					</span>
				</div>
			),
		},
		{
			header: "GPS Anchor Coordinates",
			key: "gps",
			render: (row) =>
				row.latitude ? (
					<div className="font-mono text-[11px] text-slate-600">
						Lat: {Number(row.latitude).toFixed(5)} | Lon:{" "}
						{Number(row.longitude).toFixed(5)}
					</div>
				) : (
					<span className="text-slate-400 italic">No GPS Anchor</span>
				),
		},
		{
			header: "Status",
			key: "active",
			render: (row) => (
				<span
					className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
						row.active
							? "bg-emerald-50 text-[#017C4D]"
							: "bg-slate-100 text-slate-500 border border-slate-200"
					}`}
				>
					<span
						className={`h-1.5 w-1.5 rounded-full ${
							row.active ? "bg-[#017C4D]" : "bg-slate-400"
						}`}
					/>
					{row.active ? "Active" : "Archived"}
				</span>
			),
		},
		{
			header: "Actions",
			key: "actions",
			align: "right",
			render: (row) => (
				<div className="flex items-center justify-end gap-2.5">
					<button
						type="button"
						onClick={() => handleOpenEditModal(row)}
						className="text-xs font-semibold text-slate-700 hover:text-[#A41821] transition cursor-pointer"
					>
						Edit
					</button>

					<span className="text-slate-300">|</span>

					{/* Dynamic Activate / Deactivate Toggle */}
					<button
						type="button"
						onClick={() => handleToggleActive(row)}
						className={`text-xs font-bold transition cursor-pointer ${
							row.active
								? "text-slate-600 hover:text-slate-900 underline"
								: "text-[#017C4D] hover:underline"
						}`}
						title={
							row.active
								? "Deactivate and move to Archived tab"
								: "Reactivate and restore to Active tab"
						}
					>
						{row.active ? "Deactivate" : "Activate"}
					</button>

					<span className="text-slate-300">|</span>

					<button
						type="button"
						onClick={() => setDeleteCandidate(row)}
						className="text-xs font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
					>
						Delete
					</button>
				</div>
			),
		},
	];

	return (
		<div className="mx-auto max-w-6xl space-y-6 pb-12">
			{/* Header Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-xl font-black text-slate-900 tracking-tight">
						Competitor Store Locations
					</h1>
					<p className="text-xs text-slate-500 mt-0.5">
						Target physical supermarket branches and fresh produce markets with
						GPS audit anchors
					</p>
				</div>

				<Can role={["ADMIN", "MANAGER"]}>
					<button
						type="button"
						onClick={handleOpenCreateModal}
						className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
					>
						<span className="text-sm">+</span>
						Register Physical Store
					</button>
				</Can>
			</div>

			{/* Main Content Area */}
			<div className="space-y-3">
				{/* Status Navigation Tabs (Active vs Archived) & Type Filters */}
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					{/* Status Mode Tabs */}
					<div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold flex-none">
						<button
							type="button"
							onClick={() => setActiveTab("ACTIVE")}
							className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
								activeTab === "ACTIVE"
									? "bg-white text-slate-900 shadow-2xs"
									: "text-slate-500 hover:text-slate-800"
							}`}
						>
							Active Stores ({activeStoresCount})
						</button>
						<button
							type="button"
							onClick={() => setActiveTab("ARCHIVED")}
							className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
								activeTab === "ARCHIVED"
									? "bg-white text-slate-900 shadow-2xs"
									: "text-slate-500 hover:text-slate-800"
							}`}
						>
							Archived ({archivedStoresCount})
						</button>
					</div>

					{/* Store Type Filters */}
					<div className="flex items-center gap-1.5">
						{["ALL", "FMCG", "FRESH"].map((type) => (
							<button
								key={type}
								type="button"
								onClick={() => setSelectedType(type)}
								className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
									selectedType === type
										? "bg-[#A41821] text-white"
										: "bg-slate-100 text-slate-600 hover:bg-slate-200"
								}`}
							>
								{type}
							</button>
						))}
					</div>
				</div>

				{/* DataTable */}
				<DataTable
					columns={tableColumns}
					data={filteredStores}
					searchKey="name"
					searchPlaceholder="Search store name, area, or competitor..."
					pageSize={8}
					emptyMessage={
						isLoading
							? "Loading physical stores..."
							: activeTab === "ARCHIVED"
								? "No archived stores found."
								: "No active stores match the filter."
					}
				/>
			</div>

			{/* Register / Edit Store Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
					<div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<div className="flex items-center justify-between border-b border-slate-100 pb-3">
							<h2 className="text-base font-bold text-slate-900">
								{editingStore
									? "Edit Target Store Location"
									: "Register Target Store Location"}
							</h2>
							<button
								type="button"
								onClick={() => {
									setIsModalOpen(false);
									setEditingStore(null);
								}}
								className="text-slate-400 hover:text-slate-600 cursor-pointer"
							>
								✕
							</button>
						</div>

						<form onSubmit={handleSubmit} className="space-y-3 text-xs">
							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Parent Competitor Business
								</label>
								<select
									value={formData.competitorId}
									onChange={(e) =>
										setFormData({ ...formData, competitorId: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden cursor-pointer"
								>
									{competitors.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name} ({c.type})
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Store Branch Name
								</label>
								<input
									type="text"
									required
									placeholder="e.g. Allmart - Bole"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">
										Area / Subcity
									</label>
									<input
										type="text"
										required
										placeholder="e.g. Bole"
										value={formData.area}
										onChange={(e) =>
											setFormData({ ...formData, area: e.target.value })
										}
										className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">
										Store Type
									</label>
									<select
										value={formData.type}
										onChange={(e) =>
											setFormData({ ...formData, type: e.target.value })
										}
										className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden cursor-pointer"
									>
										<option value="FMCG">FMCG</option>
										<option value="FRESH">FRESH</option>
										<option value="BOTH">BOTH</option>
									</select>
								</div>
							</div>

							<div>
								<label className="block font-semibold text-slate-700 mb-1">
									Street Address
								</label>
								<input
									type="text"
									placeholder="e.g. Bole Medhanialem Road, Addis Ababa"
									value={formData.address}
									onChange={(e) =>
										setFormData({ ...formData, address: e.target.value })
									}
									className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block font-semibold text-slate-700 mb-1">
										Latitude
									</label>
									<input
										type="number"
										step="0.0000001"
										required
										value={formData.latitude}
										onChange={(e) =>
											setFormData({ ...formData, latitude: e.target.value })
										}
										className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
									/>
								</div>
								<div>
									<label className="block font-semibold text-slate-700 mb-1">
										Longitude
									</label>
									<input
										type="number"
										step="0.0000001"
										required
										value={formData.longitude}
										onChange={(e) =>
											setFormData({ ...formData, longitude: e.target.value })
										}
										className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
									/>
								</div>
							</div>

							<div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
								<button
									type="button"
									onClick={() => {
										setIsModalOpen(false);
										setEditingStore(null);
									}}
									className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
								>
									Cancel
								</button>
								<button
									type="submit"
									className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer"
								>
									{editingStore
										? "Update Store Location"
										: "Save Store Location"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteCandidate && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
					<div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
						<h3 className="text-base font-bold text-slate-900">
							Confirm Deletion
						</h3>
						<p className="text-xs text-slate-600 leading-relaxed">
							Are you sure you want to remove{" "}
							<strong className="text-slate-900">{deleteCandidate.name}</strong>
							? If historical audits or assignments reference this location, the
							store will be deactivated and moved to the Archived tab instead of
							deleted to protect audit history integrity.
						</p>
						<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
							<button
								type="button"
								onClick={() => setDeleteCandidate(null)}
								className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleConfirmDelete}
								disabled={isDeleting}
								className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
							>
								{isDeleting ? "Removing..." : "Yes, Remove"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};