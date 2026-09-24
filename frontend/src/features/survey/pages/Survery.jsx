import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useSurveySessionStore } from "@/stores/survey/surveySession.store.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";

// Developer 2's API Clients
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
  const { activeAssignment, setActiveAssignment, getSessionContext } = useSurveySessionStore();
  const { submitEntry } = useSurveyStore();

  // 1. Resolve Assignment from URL param or active session
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

  // Real assigned items from database (120 Queen's investigation items)
  const assignedProducts = useMemo(() => {
    return currentAssignment?.items || [];
  }, [currentAssignment]);

  // Active Audit State
  const [activeAudit, setActiveAudit] = useState(null);
  const [isInitializingAudit, setIsInitializingAudit] = useState(false);

  // Background GPS coordinates
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
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  }, [sessionContext]);

  // 2. Initialize or Recover Audit for this assignment
  useEffect(() => {
    if (!currentAssignment?.id || activeAudit?.id) return;

    let isMounted = true;
    setIsInitializingAudit(true);

    const initAudit = async () => {
      try {
        // createAuditForAssignment is idempotent: returns active audit if one already exists
        const res = await createAuditRequest({
          assignmentId: currentAssignment.id,
          notes: "In-store retail price audit session",
        });

        const audit = res?.data;
        if (!isMounted) return;

        // If the visit hasn't been started yet, start it with GPS coordinates
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
  }, [currentAssignment?.id, activeAudit?.id, gps.latitude, gps.longitude, gps.accuracy]);

  // 3. Fetch Real Observations from Backend for this Audit (PERSISTS ACROSS REFRESH)
  const {
    data: observationsResponse,
    isLoading: observationsLoading,
  } = useQuery({
    queryKey: ["auditObservations", activeAudit?.id],
    queryFn: () =>
      listAuditObservationsRequest({
        auditId: activeAudit.id,
        params: { limit: 150 },
      }),
    enabled: Boolean(activeAudit?.id),
    staleTime: 30 * 1000,
  });

  // Map real backend observations by productId for instant O(1) status lookup
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

  // Completed metrics derived directly from real backend records
  const completedIds = useMemo(() => new Set(Object.keys(observationsMap)), [observationsMap]);
  const totalCount = assignedProducts.length;
  const completedCount = completedIds.size;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const percentDone = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const visibleProducts = useMemo(() => {
    if (filterMode === "PENDING") {
      return assignedProducts.filter((p) => !completedIds.has(p.productId || p.id));
    }
    if (filterMode === "COMPLETED") {
      return assignedProducts.filter((p) => completedIds.has(p.productId || p.id));
    }
    return assignedProducts;
  }, [assignedProducts, completedIds, filterMode]);

  // 4. Save Observation directly to Developer 2's PriceObservation table
  const handleSaveObservation = async ({ productId, price, availability }) => {
    if (!activeAudit?.id) {
      toast.error("Active store audit is not ready yet. Please wait...");
      return;
    }

    setIsSaving(true);
    const prod = assignedProducts.find((p) => (p.productId || p.id) === productId);

    const clientObservationId = `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const payload = {
      clientObservationId,
      productId,
      availability,
      price: availability === "AVAILABLE" ? price : null,
      observedUnit: prod?.unit || "kg",
      capturedAt: new Date().toISOString(),
      notes: null,
    };

    try {
      // 1. Post to Developer 2's backend PriceObservation API
      await createObservationRequest({
        auditId: activeAudit.id,
        payload,
      });

      // 2. Also keep offline backup in surveyStore if connection fails in the future
      await submitEntry({
        ...payload,
        itemId: productId,
        competitorId: sessionContext?.competitorId || "allmart",
        storeId: sessionContext?.storeId,
        surveyPeriodId: sessionContext?.surveyPeriodId || "2026-W39",
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy,
      });

      // Invalidate query to pull the latest list from PostgreSQL
      queryClient.invalidateQueries({ queryKey: ["auditObservations", activeAudit.id] });

      toast.success(
        availability === "AVAILABLE"
          ? `${formatProductName(prod?.name || "Item")}: ${price.toFixed(2)} ETB`
          : `${formatProductName(prod?.name || "Item")} marked ${availability.replace("_", " ")}`,
        { id: "observation-toast", duration: 2500 }
      );

      setSelectedProduct(null);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to record observation";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

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
      navigate("/survey");
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
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs space-y-4 my-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-[#FE7914]">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            No Store Audits Assigned
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Your account currently has no active store visits assigned in this survey period.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => navigate("/survey")}
            className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            ← View My Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 pb-24">
      <SyncStatusBanner />

      {/* Sticky Store & Progress Header */}
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
              {sessionContext?.storeArea || "Addis Ababa"} • Cycle {sessionContext?.surveyPeriodId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Review ({completedCount})
            </button>

            <button
              type="button"
              onClick={handleFinishAudit}
              className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-[#017C4D] hover:bg-emerald-100 transition cursor-pointer"
            >
              Finish Audit
            </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
            <span>
              Collected:{" "}
              <span className="text-[#017C4D]">{completedCount}</span> / {totalCount}
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

      {/* Rapid Search & Barcode Lookup */}
      <FastProductSearch
        products={assignedProducts}
        completedProductIds={completedIds}
        onSelectProduct={(p) => setSelectedProduct(p)}
        disabled={isSaving}
      />

      {/* Auto-Focused Price Input */}
      <RapidPriceInput
        selectedProduct={selectedProduct}
        onSavePrice={handleSaveObservation}
        onSaveAvailability={handleSaveObservation}
        onCancel={() => setSelectedProduct(null)}
        isSaving={isSaving}
      />

      {/* Assigned Products Checklist Header & Filter Tabs */}
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
                filterMode === "ALL" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("PENDING")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                filterMode === "PENDING" ? "bg-white text-[#A41821] shadow-2xs" : "text-slate-500"
              }`}
            >
              Pending ({remainingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("COMPLETED")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                filterMode === "COMPLETED" ? "bg-white text-[#017C4D] shadow-2xs" : "text-slate-500"
              }`}
            >
              Done ({completedCount})
            </button>
          </div>
        </div>

        {/* Product Items List */}
        <div className="divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
          {observationsLoading ? (
            <p className="text-xs text-slate-400 text-center py-6">
              Checking database for previously collected prices...
            </p>
          ) : (
            visibleProducts.map((p) => {
              const pId = p.productId || p.id;
              const observation = observationsMap[pId];
              const isDone = Boolean(observation);
              const isSelected = selectedProduct && (selectedProduct.productId || selectedProduct.id) === pId;

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
                    <span className={`text-sm font-bold block truncate ${isDone ? "text-slate-800" : "text-slate-900"}`}>
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
                        <span className="block text-[9px] text-emerald-600 font-bold">✓ Saved</span>
                      </div>
                    ) : (
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-[#A41821] hover:text-white transition">
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

      {/* In-Field Observation Review Drawer */}
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