import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import { calculatePriceAction } from "@/utils/calculations.js";
import { PriceActionBadge } from "@/components/PriceActionBadge.jsx";
import toast from "react-hot-toast";

export const Survey = () => {
	const { user } = useAuth();
	const { assignments, products, competitors, submitEntry } = useSurveyStore();

	// 1. Filter assignments relevant to current auditor
	const auditorAssignments = useMemo(() => {
		return assignments.filter(
			(a) =>
				!a.auditorId ||
				a.auditorId === user?.id ||
				user?.role !== "FIELD_AUDITOR",
		);
	}, [assignments, user]);

	const [selectedAssignmentId, setSelectedAssignmentId] = useState(
		auditorAssignments[0]?.id || "",
	);
	const selectedAssignment = assignments.find(
		(a) => a.id === selectedAssignmentId,
	);

	// 2. Resolve items for current assignment
	const assignmentProducts = useMemo(() => {
		if (!selectedAssignment?.items?.length) return products;
		return products.filter((p) => selectedAssignment.items.includes(p.id));
	}, [selectedAssignment, products]);

	const [selectedItemId, setSelectedItemId] = useState(
		assignmentProducts[0]?.id || "",
	);
	const selectedProduct = products.find((p) => p.id === selectedItemId);

	const [price, setPrice] = useState("");
	const [gps, setGps] = useState({
		latitude: 9.032,
		longitude: 38.7469,
		accuracy: 8,
		locked: true,
		acquiring: false,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Auto-select first item when assignment changes
	useEffect(() => {
		if (assignmentProducts.length > 0) {
			setSelectedItemId(assignmentProducts[0].id);
		}
	}, [selectedAssignmentId, assignmentProducts]);

	// GPS Acquisition
	const handleAcquireGPS = () => {
		setGps((prev) => ({ ...prev, acquiring: true }));

		if ("geolocation" in navigator) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					setGps({
						latitude: Number(position.coords.latitude.toFixed(5)),
						longitude: Number(position.coords.longitude.toFixed(5)),
						accuracy: Math.round(position.coords.accuracy),
						locked: true,
						acquiring: false,
					});
					toast.success("GPS Location locked");
				},
				() => {
					// Fallback simulation for local development / indoors
					setGps({
						latitude: 9.032,
						longitude: 38.7469,
						accuracy: 6,
						locked: true,
						acquiring: false,
					});
					toast("Simulated retail GPS coordinates applied", { icon: "📍" });
				},
				{ enableHighAccuracy: true, timeout: 7000 },
			);
		}
	};

	// Instant inline price calculation
	const numericPrice = parseFloat(price);
	const livePreview = useMemo(() => {
		if (!selectedProduct || !numericPrice || numericPrice <= 0) return null;
		return calculatePriceAction(selectedProduct.queensPrice, numericPrice);
	}, [selectedProduct, numericPrice]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!numericPrice || numericPrice <= 0) {
			toast.error("Please enter a valid price greater than 0");
			return;
		}

		setIsSubmitting(true);
		const entryPayload = {
			itemId: selectedProduct.id,
			competitorId: selectedAssignment?.competitorId || "shoa",
			marketName: selectedAssignment?.marketName || "Shoa Supermarket",
			auditorId: user?.id || "USR-001",
			surveyPeriodId: selectedAssignment?.surveyPeriodId || "2026-W39",
			price: numericPrice,
			unit: selectedProduct.unit || "kg",
			latitude: gps.latitude,
			longitude: gps.longitude,
			accuracy: gps.accuracy,
			timestamp: new Date().toISOString(),
		};

		try {
			const res = await submitEntry(entryPayload);
			if (res.offline) {
				toast("Saved to Offline Queue (No connection)", { icon: "📥" });
			} else {
				toast.success(
					`Price recorded: ${selectedProduct.name} - ${numericPrice} ETB`,
				);
			}
			setPrice("");
		} catch {
			toast.error("Failed to record survey entry");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="mx-auto max-w-3xl space-y-6 pb-12">
			{/* Header Banner */}
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
					<div>
						<h1 className="text-xl font-black text-slate-900 tracking-tight">
							Field Price Collection
						</h1>
						<p className="text-xs text-slate-500 mt-0.5">
							Record verified competitor shelf prices with GPS timestamping
						</p>
					</div>
					<span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#017C4D] border border-emerald-200">
						<span className="h-2 w-2 rounded-full bg-[#017C4D] animate-pulse" />
						Active Cycle: 2026-W39
					</span>
				</div>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5">
				{/* Step 1: Select Assignment & Market */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
							1
						</span>
						<h2 className="text-sm font-bold text-slate-800">
							Target Competitor & Market
						</h2>
					</div>

					<div>
						<label className="block text-xs font-semibold text-slate-700 mb-1.5">
							Assigned Store / Competitor
						</label>
						<select
							value={selectedAssignmentId}
							onChange={(e) => setSelectedAssignmentId(e.target.value)}
							className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
						>
							{auditorAssignments.map((asn) => {
								const comp = competitors.find((c) => c.id === asn.competitorId);
								return (
									<option key={asn.id} value={asn.id}>
										{comp?.name || asn.competitorId} — {asn.marketName} (
										{asn.items?.length || 0} items)
									</option>
								);
							})}
						</select>
					</div>
				</div>

				{/* Step 2: Select Product Item */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
							2
						</span>
						<h2 className="text-sm font-bold text-slate-800">
							Product Selection & Queens Reference
						</h2>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-semibold text-slate-700 mb-1.5">
								Item to Audit
							</label>
							<select
								value={selectedItemId}
								onChange={(e) => setSelectedItemId(e.target.value)}
								className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
							>
								{assignmentProducts.map((p) => (
									<option key={p.id} value={p.id}>
										[{p.id}] {p.name} ({p.unit})
									</option>
								))}
							</select>
						</div>

						{/* Queens Benchmark Badge */}
						{selectedProduct && (
							<div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-center">
								<span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
									Queens Reference Benchmark
								</span>
								<div className="flex items-baseline gap-2 mt-0.5">
									<span className="text-2xl font-black text-slate-900">
										{selectedProduct.queensPrice.toFixed(2)}
									</span>
									<span className="text-xs font-bold text-slate-500">
										ETB / {selectedProduct.unit}
									</span>
								</div>
								<span className="text-[11px] font-medium text-[#017C4D] mt-1">
									Category: {selectedProduct.category}
								</span>
							</div>
						)}
					</div>
				</div>

				{/* Step 3: Enter Competitor Shelf Price */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
					<div className="flex items-center gap-2">
						<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
							3
						</span>
						<h2 className="text-sm font-bold text-slate-800">
							Observed Competitor Price
						</h2>
					</div>

					<div className="space-y-3">
						<div>
							<label className="block text-xs font-semibold text-slate-700 mb-1.5">
								Observed Shelf Price (ETB)
							</label>
							<div className="relative">
								<input
									type="number"
									step="0.01"
									min="0.1"
									required
									placeholder="e.g. 62.00"
									value={price}
									onChange={(e) => setPrice(e.target.value)}
									className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
								/>
								<span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
									ETB / {selectedProduct?.unit || "kg"}
								</span>
							</div>
						</div>

						{/* Live Algorithm Preview */}
						{livePreview && (
							<div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
								<div>
									<p className="text-xs font-medium text-slate-600">
										Calculated Price Index:{" "}
										<span className="font-extrabold text-slate-900">
											{livePreview.indexPercent}%
										</span>{" "}
										(Index: {livePreview.index})
									</p>
									<p className="text-[11px] text-slate-500">
										Queens is{" "}
										{livePreview.variancePercent > 0
											? `+${livePreview.variancePercent}% above`
											: `${Math.abs(livePreview.variancePercent)}% below`}{" "}
										observed price
									</p>
								</div>
								<PriceActionBadge action={livePreview.action} />
							</div>
						)}
					</div>
				</div>

				{/* Step 4: GPS Audit & Submission */}
				<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
								4
							</span>
							<h2 className="text-sm font-bold text-slate-800">
								GPS Location Lock
							</h2>
						</div>
						<button
							type="button"
							onClick={handleAcquireGPS}
							disabled={gps.acquiring}
							className="text-xs font-semibold text-[#017C4D] hover:underline flex items-center gap-1"
						>
							{gps.acquiring ? "Acquiring..." : "Refresh Location"}
						</button>
					</div>

					<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
						<div className="flex items-center gap-2">
							<span className="h-2 w-2 rounded-full bg-[#017C4D]" />
							<span>
								Lat:{" "}
								<span className="font-mono font-bold text-slate-800">
									{gps.latitude}
								</span>{" "}
								| Lon:{" "}
								<span className="font-mono font-bold text-slate-800">
									{gps.longitude}
								</span>
							</span>
						</div>
						<span className="font-medium text-slate-500">
							Accuracy: ±{gps.accuracy}m
						</span>
					</div>

					<button
						type="submit"
						disabled={isSubmitting || !numericPrice}
						className="w-full rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
					>
						{isSubmitting ? "Recording Shelf Price..." : "Submit Price Entry"}
					</button>
				</div>
			</form>
		</div>
	);
};