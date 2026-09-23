import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSurveySessionStore } from "@/stores/survey/surveySession.store.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useAuth } from "@/hooks/useAuth.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import { FastProductSearch } from "../components/FastProductSearch.jsx";
import { RapidPriceInput } from "../components/RapidPriceInput.jsx";
import {
	calculateDistanceMeters,
	isWithinStoreRadius,
} from "@/features/stores/utils/distance.js";
import toast from "react-hot-toast";
import { formatProductName } from "@/utils/formatters.js";

export const Survey = () => {
	const { assignmentId } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { assignments, updateStatus } = useAssignments();
	const { activeAssignment, setActiveAssignment, getSessionContext } =
		useSurveySessionStore();
	const { submitEntry } = useSurveyStore();

	// Find assignment from URL param or active session
	const currentAssignment = useMemo(() => {
		if (
			activeAssignment &&
			(!assignmentId || activeAssignment.id === assignmentId)
		) {
			return activeAssignment;
		}
		return assignments.find((a) => a.id === assignmentId) || activeAssignment;
	}, [assignmentId, activeAssignment, assignments]);

	// Synchronize session store
	useEffect(() => {
		if (currentAssignment && currentAssignment.id !== activeAssignment?.id) {
			setActiveAssignment(currentAssignment);
		}
	}, [currentAssignment, activeAssignment, setActiveAssignment]);

	const sessionContext = getSessionContext();

	// Real assigned items list (e.g., 120 Queen's investigation items)
	const assignedProducts = useMemo(() => {
		return currentAssignment?.items || [];
	}, [currentAssignment]);

	// Local collection state mapped by productId
	const [observations, setObservations] = useState({});
	const [selectedProduct, setSelectedProduct] = useState(null);
	const [filterMode, setFilterMode] = useState("ALL"); // ALL | PENDING | COMPLETED
	const [isSaving, setIsSaving] = useState(false);

	// Background GPS coordinates
	const [gps, setGps] = useState({
		latitude: 8.998412,
		longitude: 38.78652,
		accuracy: 6,
		acquired: false,
	});

	// Background GPS acquisition on mount
	useEffect(() => {
		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					setGps({
						latitude: Number(pos.coords.latitude.toFixed(7)),
						longitude: Number(pos.coords.longitude.toFixed(7)),
						accuracy: Math.round(pos.coords.accuracy),
						acquired: true,
					});
				},
				() => {
					// Fallback to store coordinates if GPS permission is delayed indoors
					if (sessionContext?.storeLatitude) {
						setGps({
							latitude: Number(sessionContext.storeLatitude),
							longitude: Number(sessionContext.storeLongitude),
							accuracy: 8,
							acquired: true,
						});
					}
				},
				{ enableHighAccuracy: true, timeout: 7000 },
			);
		}
	}, [sessionContext]);

	// Compute live progress metrics
	const completedIds = useMemo(() => {
		return new Set(Object.keys(observations));
	}, [observations]);

	const totalCount = assignedProducts.length;
	const completedCount = completedIds.size;
	const remainingCount = Math.max(0, totalCount - completedCount);
	const percentDone =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Filter checklist
	const visibleProducts = useMemo(() => {
		if (filterMode === "PENDING") {
			return assignedProducts.filter(
				(p) => !completedIds.has(p.productId || p.id),
			);
		}
		if (filterMode === "COMPLETED") {
			return assignedProducts.filter((p) =>
				completedIds.has(p.productId || p.id),
			);
		}
		return assignedProducts;
	}, [assignedProducts, completedIds, filterMode]);

	// Save observation helper (Continuous Loop: Save -> Next ready)
	const handleSaveObservation = async ({ productId, price, availability }) => {
		setIsSaving(true);
		const prod = assignedProducts.find(
			(p) => (p.productId || p.id) === productId,
		);

		// Generate unique client observation ID for offline idempotency
		const clientObservationId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		const payload = {
			clientObservationId,
			itemId: productId,
			productId,
			competitorId: sessionContext?.competitorId || "allmart",
			storeId: sessionContext?.storeId,
			marketName: sessionContext?.storeName || "Retail Store",
			surveyPeriodId: sessionContext?.surveyPeriodId || "2026-W39",
			auditorId: user?.id,
			price: availability === "AVAILABLE" ? price : null,
			availability,
			unit: prod?.unit || "kg",
			latitude: gps.latitude,
			longitude: gps.longitude,
			accuracy: gps.accuracy,
			capturedAt: new Date().toISOString(),
		};

		try {
			await submitEntry(payload);

			// Record in local state
			setObservations((prev) => ({
				...prev,
				[productId]: {
					price: availability === "AVAILABLE" ? price : null,
					availability,
					timestamp: payload.capturedAt,
				},
			}));

			toast.success(
				availability === "AVAILABLE"
					? `${prod?.name || "Item"}: ${price.toFixed(2)} ETB`
					: `${prod?.name || "Item"} marked ${availability.replace("_", " ")}`,
				{ id: "observation-toast", duration: 2500 },
			);

			// Close price input & immediately ready for next product
			setSelectedProduct(null);
		} catch {
			toast.error("Failed to record observation");
		} finally {
			setIsSaving(false);
		}
	};

	const handleFinishAudit = async () => {
		if (currentAssignment?.id) {
			await updateStatus({ id: currentAssignment.id, status: "COMPLETED" });
			toast.success("Store Audit Completed!");
			navigate("/survey");
		}
	};

	if (!currentAssignment) {
		return (
			<div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
				<h2 className="text-base font-bold text-slate-900">
					No Store Audit Selected
				</h2>
				<p className="text-xs text-slate-500 mt-1 mb-4">
					Please select an assigned store from your assignments list.
				</p>
				<button
					type="button"
					onClick={() => navigate("/survey")}
					className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white shadow-xs"
				>
					← Return to My Assignments
				</button>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl space-y-4 pb-24">
			{/* 1. Sticky Store & Progress Header */}
			<div className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm backdrop-blur-md space-y-2.5">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						<button
							type="button"
							onClick={() => navigate("/survey")}
							className="text-[11px] font-bold text-[#A41821] hover:underline flex items-center gap-1 cursor-pointer mb-0.5"
						>
							← My Assignments
						</button>
						<h1 className="text-base font-black text-slate-900 truncate">
							{sessionContext?.storeName}
						</h1>
						<p className="text-[11px] text-slate-500 truncate">
							{sessionContext?.storeArea || "Addis Ababa"} • Cycle{" "}
							{sessionContext?.surveyPeriodId}
						</p>
					</div>

					<button
						type="button"
						onClick={handleFinishAudit}
						className="flex-none rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#017C4D] hover:bg-emerald-100 transition cursor-pointer"
					>
						Finish Audit
					</button>
				</div>

				{/* Progress Tracker Bar */}
				<div>
					<div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
						<span>
							Collected:{" "}
							<span className="text-[#017C4D]">{completedCount}</span> /{" "}
							{totalCount}
						</span>
						<span className="font-mono text-slate-500">
							{remainingCount} Left ({percentDone}%)
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
						<div
							className="h-full rounded-full bg-[#017C4D] transition-all duration-300"
							style={{ width: `${percentDone}%` }}
						/>
					</div>
				</div>
			</div>

			{/* 2. Rapid Search & Barcode Lookup */}
			<FastProductSearch
				products={assignedProducts}
				completedProductIds={completedIds}
				onSelectProduct={(p) => setSelectedProduct(p)}
				disabled={isSaving}
			/>

			{/* 3. Auto-Focused Price Input (Appears when item is selected) */}
			<RapidPriceInput
				selectedProduct={selectedProduct}
				onSavePrice={handleSaveObservation}
				onSaveAvailability={handleSaveObservation}
				onCancel={() => setSelectedProduct(null)}
				isSaving={isSaving}
			/>

			{/* 4. Assigned Products Checklist Header & Filter Tabs */}
			<div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3">
				<div className="flex items-center justify-between">
					<h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
						Assigned Products ({visibleProducts.length})
					</h2>

					<div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
						<button
							type="button"
							onClick={() => setFilterMode("ALL")}
							className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
								filterMode === "ALL"
									? "bg-white text-slate-900 shadow-2xs"
									: "text-slate-500"
							}`}
						>
							All ({totalCount})
						</button>
						<button
							type="button"
							onClick={() => setFilterMode("PENDING")}
							className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
								filterMode === "PENDING"
									? "bg-white text-[#A41821] shadow-2xs"
									: "text-slate-500"
							}`}
						>
							Pending ({remainingCount})
						</button>
						<button
							type="button"
							onClick={() => setFilterMode("COMPLETED")}
							className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
								filterMode === "COMPLETED"
									? "bg-white text-[#017C4D] shadow-2xs"
									: "text-slate-500"
							}`}
						>
							Done ({completedCount})
						</button>
					</div>
				</div>

				{/* Product Items List (One-tap select to enter price) */}
				<div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
					{visibleProducts.map((p) => {
						const pId = p.productId || p.id;
						const observation = observations[pId];
						const isDone = Boolean(observation);
						const isSelected =
							selectedProduct &&
							(selectedProduct.productId || selectedProduct.id) === pId;

						return (
							<div
								key={pId}
								onClick={() => setSelectedProduct(p)}
								className={`flex items-center justify-between p-3 transition cursor-pointer rounded-xl ${
									isSelected
										? "bg-red-50/50"
										: isDone
											? "bg-emerald-50/20 hover:bg-emerald-50/40"
											: "hover:bg-slate-50"
								}`}
							>
								<div className="min-w-0 flex-1 pr-3">
									<span
										className={`text-sm font-bold block truncate ${isDone ? "text-slate-800" : "text-slate-900"}`}
									>
									 {formatProductName(p.name)}
									</span>
									<div className="text-[11px] text-slate-400 font-mono mt-0.5">
										{p.barcode || p.sku || pId} • {p.category} ({p.unit})
									</div>
								</div>

								<div className="flex-none text-right">
									{isDone ? (
										<div>
											{observation.availability === "AVAILABLE" ? (
												<span className="font-mono font-black text-sm text-[#017C4D]">
													{Number(observation.price).toFixed(2)} ETB
												</span>
											) : (
												<span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-[#FE7914] border border-amber-200">
													{observation.availability.replace("_", " ")}
												</span>
											)}
											<span className="block text-[9px] text-emerald-600 font-bold">
												✓ Saved
											</span>
										</div>
									) : (
										<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-[#A41821] hover:text-white transition">
											+ Price
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};