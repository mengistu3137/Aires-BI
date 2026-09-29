import React, {
	useState,
	useEffect,
	useMemo,
	useRef,
	useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useSurveySessionStore } from "@/stores/survey/surveySession.store.js";

// Developer 2's Authoritative API Clients
import {
	createAuditRequest,
	startAuditRequest,
	completeAuditRequest,
} from "@/services/api/audit.api.js";
import {
	createObservationRequest,
	listAuditObservationsRequest,
} from "@/services/api/observations.api.js";

// Components
import { FastProductSearch } from "../components/FastProductSearch.jsx";
import { RapidPriceInput } from "../components/RapidPriceInput.jsx";
import { SyncStatusBanner } from "../components/SyncStatusBanner.jsx";
import { ObservationAuditDrawer } from "../components/ObservationAuditDrawer.jsx";
import { formatProductName } from "@/utils/formatters.js";
import toast from "react-hot-toast";

export const Survey = () => {
	const { assignmentId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { user } = useAuth();

	const { assignments, isLoading: assignmentsLoading } = useAssignments();
	const { activeAssignment, setActiveAssignment, getSessionContext } =
		useSurveySessionStore();

	// 1. Resolve Assignment
	const currentAssignment = useMemo(() => {
		if (assignmentId) {
			return assignments.find((a) => a.id === assignmentId) || activeAssignment;
		}
		if (activeAssignment) {
			return activeAssignment;
		}
		if (assignments.length > 0) {
			return assignments[0];
		}
		return null;
	}, [assignmentId, activeAssignment, assignments]);

	useEffect(() => {
		if (currentAssignment && currentAssignment.id !== activeAssignment?.id) {
			setActiveAssignment(currentAssignment);
		}
	}, [currentAssignment, activeAssignment, setActiveAssignment]);

	const sessionContext = getSessionContext();

	const assignedProducts = useMemo(() => {
		return currentAssignment?.items || [];
	}, [currentAssignment]);

	// Active Audit State
	const [activeAudit, setActiveAudit] = useState(null);
	const [isInitializingAudit, setIsInitializingAudit] = useState(false);

	// Background GPS
	const [gps, setGps] = useState({
		latitude: 8.998412,
		longitude: 38.78652,
		accuracy: 6,
		acquired: false,
	});

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

	// 2. Initialize or Recover Audit
	useEffect(() => {
		if (!currentAssignment?.id || activeAudit?.id) return;

		let isMounted = true;
		setIsInitializingAudit(true);

		const initAudit = async () => {
			try {
				const res = await createAuditRequest({
					assignmentId: currentAssignment.id,
					notes: "In-store retail price audit session",
				});

				const audit = res?.data;
				if (!isMounted) return;

				if (audit && audit.status === "NOT_STARTED") {
					const startedRes = await startAuditRequest({
						auditId: audit.id,
						payload: {
							latitude: gps.latitude,
							longitude: gps.longitude,
							accuracyMeters: gps.accuracy,
						},
					});
					if (isMounted) setActiveAudit(startedRes?.data || audit);
				} else if (audit) {
					if (isMounted) setActiveAudit(audit);
				}
			} catch (err) {
				console.warn("Audit initialization note:", err.message);
			} finally {
				if (isMounted) setIsInitializingAudit(false);
			}
		};

		initAudit();

		return () => {
			isMounted = false;
		};
	}, [
		currentAssignment?.id,
		activeAudit?.id,
		gps.latitude,
		gps.longitude,
		gps.accuracy,
	]);

	// 3. Fetch Observations
	const { data: observationsResponse, isLoading: observationsLoading } =
		useQuery({
			queryKey: ["auditObservations", activeAudit?.id],
			queryFn: () =>
				listAuditObservationsRequest({
					auditId: activeAudit.id,
					params: { limit: 150 },
				}),
			enabled: Boolean(activeAudit?.id),
			staleTime: 30 * 1000,
		});

	const observationsMap = useMemo(() => {
		const map = {};
		const records = observationsResponse?.data || [];
		records.forEach((obs) => {
			map[obs.productId] = {
				id: obs.id,
				price: obs.price !== null ? Number(obs.price) : null,
				availability: obs.availability,
				timestamp: obs.capturedAt,
			};
		});
		return map;
	}, [observationsResponse]);

	const [selectedProduct, setSelectedProduct] = useState(null);
	const [filterMode, setFilterMode] = useState("ALL");
	const [isSaving, setIsSaving] = useState(false);
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [autoAdvance, setAutoAdvance] = useState(true); // Sequential Mode default ON
	const searchRef = useRef(null);

	const completedIds = useMemo(
		() => new Set(Object.keys(observationsMap)),
		[observationsMap],
	);
	const totalCount = assignedProducts.length;
	const completedCount = completedIds.size;
	const remainingCount = Math.max(0, totalCount - completedCount);
	const percentDone =
		totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

	// Next Pending Product (First Uncollected Item in Sequence)
	const firstPendingProduct = useMemo(() => {
		return (
			assignedProducts.find((p) => !completedIds.has(p.productId || p.id)) ||
			null
		);
	}, [assignedProducts, completedIds]);

	const resumeIndex = useMemo(() => {
		if (!firstPendingProduct) return totalCount;
		return (
			assignedProducts.findIndex(
				(p) =>
					(p.productId || p.id) ===
					(firstPendingProduct.productId || firstPendingProduct.id),
			) + 1
		);
	}, [assignedProducts, firstPendingProduct, totalCount]);

	// Active product position within sequence
	const currentProductPosition = useMemo(() => {
		if (!selectedProduct) return 1;
		const pId = selectedProduct.productId || selectedProduct.id;
		return assignedProducts.findIndex((p) => (p.productId || p.id) === pId) + 1;
	}, [selectedProduct, assignedProducts]);

	// Sequential Step Helpers
	const findNextProduct = useCallback(
		(currentPId, onlyUncompleted = true) => {
			const currentIdx = assignedProducts.findIndex(
				(p) => (p.productId || p.id) === currentPId,
			);
			if (currentIdx === -1) return null;

			// 1. Look forward from current item
			for (let i = currentIdx + 1; i < assignedProducts.length; i++) {
				const candidate = assignedProducts[i];
				const cId = candidate.productId || candidate.id;
				if (!onlyUncompleted || !completedIds.has(cId)) {
					return candidate;
				}
			}

			// 2. Wrap around from beginning
			for (let i = 0; i < currentIdx; i++) {
				const candidate = assignedProducts[i];
				const cId = candidate.productId || candidate.id;
				if (!onlyUncompleted || !completedIds.has(cId)) {
					return candidate;
				}
			}

			return null;
		},
		[assignedProducts, completedIds],
	);

	const handleSkipNext = () => {
		if (!selectedProduct) return;
		const next = findNextProduct(
			selectedProduct.productId || selectedProduct.id,
			false,
		);
		if (next) setSelectedProduct(next);
	};

	const handleSkipPrev = () => {
		if (!selectedProduct) return;
		const currentIdx = assignedProducts.findIndex(
			(p) =>
				(p.productId || p.id) ===
				(selectedProduct.productId || selectedProduct.id),
		);
		const prevIdx =
			currentIdx > 0 ? currentIdx - 1 : assignedProducts.length - 1;
		setSelectedProduct(assignedProducts[prevIdx]);
	};

	// 4. Save Observation with Auto-Advance Conveyor Belt Logic
	const handleSaveObservation = async (payload) => {
		if (!activeAudit?.id) {
			toast.error("Audit session is not ready yet. Please wait...");
			return;
		}

		setIsSaving(true);
		const clientObservationId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		try {
			await createObservationRequest({
				auditId: activeAudit.id,
				payload: {
					clientObservationId,
					productId: payload.productId,
					availability: payload.availability,
					price: payload.availability === "AVAILABLE" ? payload.price : null,
					capturedAt: new Date().toISOString(),
				},
			});

			// Update TanStack query cache
			await queryClient.invalidateQueries({
				queryKey: ["auditObservations", activeAudit.id],
			});
			await queryClient.invalidateQueries({ queryKey: ["audits"] });

			toast.success(
				payload.availability === "AVAILABLE"
					? `Saved: ${Number(payload.price).toFixed(2)} ETB`
					: `Marked: ${payload.availability.replace("_", " ")}`,
				{ id: "observation-toast", duration: 1800 },
			);

			// AUTO-ADVANCE: Stay inside the price modal, immediately display next product
			if (autoAdvance) {
				const nextItem = findNextProduct(payload.productId, true);
				if (nextItem) {
					setSelectedProduct(nextItem);
				} else {
					setSelectedProduct(null);
					toast.success("All assigned products completed!", { icon: "🎉" });
					setTimeout(() => searchRef.current?.focusInput(), 60);
				}
			} else {
				setSelectedProduct(null);
				setTimeout(() => searchRef.current?.focusInput(), 60);
			}
		} catch (err) {
			const msg =
				err.response?.data?.message ||
				err.message ||
				"Failed to record observation";
			toast.error(msg);
		} finally {
			setIsSaving(false);
		}
	};

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

	// Complete Audit Visit
	const handleFinishAudit = async () => {
		if (!activeAudit?.id) return;

		try {
			await completeAuditRequest({
				auditId: activeAudit.id,
				payload: {
					latitude: gps.latitude,
					longitude: gps.longitude,
					accuracyMeters: gps.accuracy,
					notes: `Audit completed with ${completedCount}/${totalCount} observed items.`,
				},
			});

			toast.success("Store Audit Completed Successfully!");
			navigate("/audits");
		} catch (err) {
			const msg = err.response?.data?.message || "Failed to complete audit.";
			toast.error(msg);
		}
	};

	if (assignmentsLoading || isInitializingAudit) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<div className="h-9 w-9 animate-spin rounded-full border-3 border-[#A41821] border-t-transparent" />
					<p className="text-xs font-semibold text-slate-500">
						{isInitializingAudit
							? "Connecting to active store audit..."
							: "Loading assigned store from server..."}
					</p>
				</div>
			</div>
		);
	}

	if (!currentAssignment) {
		return (
			<div className="mx-auto my-8 max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
				<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#FE7914]">
					<svg
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<div>
					<h2 className="text-base font-bold text-slate-900">
						No Store Audits Assigned
					</h2>
					<p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
						Your account currently has no active store visits assigned in this
						survey period.
					</p>
				</div>
				<div className="flex items-center justify-center gap-2 pt-2">
					<button
						type="button"
						onClick={() => navigate("/audits")}
						className="cursor-pointer rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#7F1219]"
					>
						← View My Audits
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl space-y-4 pb-24">
			<SyncStatusBanner />

			{/* Sticky Header with Progress */}
			<div className="sticky top-16 z-20 space-y-2.5 rounded-2xl border border-slate-200 bg-white/95 p-3.5 shadow-sm backdrop-blur-md">
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0 flex-1">
						<button
							type="button"
							onClick={() => navigate("/audits")}
							className="mb-0.5 flex cursor-pointer items-center gap-1 text-[11px] font-bold text-[#A41821] hover:underline"
						>
							← My Store Visits
						</button>
						<h1 className="truncate text-base font-black text-slate-900">
							{sessionContext?.storeName}
						</h1>
						<p className="truncate text-[11px] text-slate-500">
							{sessionContext?.storeArea || "Addis Ababa"} • Cycle{" "}
							{sessionContext?.surveyPeriodId}
						</p>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setIsDrawerOpen(true)}
							className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
						>
							Review ({completedCount})
						</button>

						<button
							type="button"
							onClick={handleFinishAudit}
							className="cursor-pointer rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#017C4D] transition hover:bg-emerald-100"
						>
							Finish Audit
						</button>
					</div>
				</div>

				{/* Progress Tracker Bar */}
				<div>
					<div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-700">
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

			{/* Sequential Resume Banner (Day 2 or Auditor Handoff Continuation) */}
			{firstPendingProduct && completedCount > 0 && !selectedProduct && (
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-2xs">
					<div className="min-w-0 flex-1">
						<span className="block text-[9px] font-bold uppercase tracking-wider text-[#017C4D]">
							Next Item to Audit (#{resumeIndex} of {totalCount})
						</span>
						<p className="truncate text-xs font-bold text-slate-900">
							{formatProductName(firstPendingProduct.name)}
						</p>
					</div>

					<button
						type="button"
						onClick={() => setSelectedProduct(firstPendingProduct)}
						className="flex-none cursor-pointer rounded-xl bg-[#017C4D] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#015E3A]"
					>
						Start Sequential Flow ➔
					</button>
				</div>
			)}

			{/* Auto-Focused Price Input (Conveyor Belt Mode: Stays open, auto-advances) */}
			<RapidPriceInput
				selectedProduct={selectedProduct}
				currentIndex={currentProductPosition}
				totalItems={totalCount}
				autoAdvance={autoAdvance}
				onToggleAutoAdvance={() => setAutoAdvance((prev) => !prev)}
				onSavePrice={handleSaveObservation}
				onSaveAvailability={handleSaveObservation}
				onNext={handleSkipNext}
				onPrev={handleSkipPrev}
				onCancel={() => {
					setSelectedProduct(null);
					setTimeout(() => searchRef.current?.focusInput(), 60);
				}}
				isSaving={isSaving}
			/>

			{/* Rapid Search & Barcode Lookup */}
			<FastProductSearch
				ref={searchRef}
				products={assignedProducts}
				completedProductIds={completedIds}
				onSelectProduct={(p) => setSelectedProduct(p)}
				disabled={isSaving}
			/>

			{/* Assigned Products Checklist */}
			<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
				<div className="flex items-center justify-between">
					<h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
						Assigned Products ({visibleProducts.length})
					</h2>

					<div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-[11px] font-bold">
						<button
							type="button"
							onClick={() => setFilterMode("ALL")}
							className={`cursor-pointer rounded-md px-2 py-0.5 transition ${
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
							className={`cursor-pointer rounded-md px-2 py-0.5 transition ${
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
							className={`cursor-pointer rounded-md px-2 py-0.5 transition ${
								filterMode === "COMPLETED"
									? "bg-white text-[#017C4D] shadow-2xs"
									: "text-slate-500"
							}`}
						>
							Done ({completedCount})
						</button>
					</div>
				</div>

				{/* Product Items List */}
				<div className="max-h-[50vh] divide-y divide-slate-100 overflow-y-auto">
					{observationsLoading ? (
						<p className="py-6 text-center text-xs text-slate-400">
							Checking database for previously collected prices...
						</p>
					) : (
						visibleProducts.map((p, pIdx) => {
							const pId = p.productId || p.id;
							const observation = observationsMap[pId];
							const isDone = Boolean(observation);
							const isSelected =
								selectedProduct &&
								(selectedProduct.productId || selectedProduct.id) === pId;

							return (
								<div
									key={pId}
									onClick={() => setSelectedProduct(p)}
									className={`flex cursor-pointer items-center justify-between p-3 transition ${
										isSelected
											? "bg-red-50/50"
											: isDone
												? "bg-emerald-50/20 hover:bg-emerald-50/40"
												: "hover:bg-slate-50"
									}`}
								>
									<div className="min-w-0 flex-1 pr-3">
										<div className="flex items-center gap-1.5">
											<span className="font-mono text-xs font-semibold text-slate-400">
												#{pIdx + 1}
											</span>
											<span
												className={`block truncate text-sm font-bold ${isDone ? "text-slate-800" : "text-slate-900"}`}
											>
												{formatProductName(p.name)}
											</span>
										</div>
										<div className="mt-0.5 font-mono text-[11px] text-slate-400 pl-5">
											{p.barcode || p.sku || pId} • {p.category} ({p.unit})
										</div>
									</div>

									<div className="flex-none text-right">
										{isDone ? (
											<div>
												{observation.availability === "AVAILABLE" ? (
													<span className="font-mono text-sm font-black text-[#017C4D]">
														{Number(observation.price).toFixed(2)} ETB
													</span>
												) : (
													<span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-[#FE7914]">
														{observation.availability.replace("_", " ")}
													</span>
												)}
												<span className="block text-[9px] font-bold text-emerald-600">
													✓ Saved
												</span>
											</div>
										) : (
											<span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 transition hover:bg-[#A41821] hover:text-white">
												+ Price
											</span>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Observation Audit Drawer */}
			<ObservationAuditDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				observations={observationsMap}
				products={assignedProducts}
				onEditPrice={handleSaveObservation}
			/>
		</div>
	);
};