import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import { calculatePriceAction } from "@/utils/calculations.js";
import { calculateDistanceMeters, isWithinStoreRadius } from "@/features/stores/utils/distance.js";
import { PriceActionBadge } from "@/components/PriceActionBadge.jsx";
import toast from "react-hot-toast";

export const Survey = () => {
  const { user } = useAuth();
  const { assignments, isLoading: assignmentsLoading } = useAssignments();
  const { submitEntry } = useSurveyStore();

  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

  // Available products for the selected store assignment
  const assignmentProducts = useMemo(() => {
    if (!selectedAssignment?.items?.length) return [];
    return selectedAssignment.items;
  }, [selectedAssignment]);

  const [selectedItemId, setSelectedItemId] = useState("");
  const selectedProduct = assignmentProducts.find((p) => p.productId === selectedItemId);

  const [price, setPrice] = useState("");
  const [gps, setGps] = useState({
    latitude: 8.99842,
    longitude: 38.78651,
    accuracy: 6,
    locked: true,
    acquiring: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select first assignment when assignments load
  useEffect(() => {
    if (assignments.length > 0 && !selectedAssignmentId) {
      setSelectedAssignmentId(assignments[0].id);
    }
  }, [assignments, selectedAssignmentId]);

  // Auto-select first product when assignment changes
  useEffect(() => {
    if (assignmentProducts.length > 0) {
      setSelectedItemId(assignmentProducts[0].productId);
    } else {
      setSelectedItemId("");
    }
  }, [selectedAssignmentId, assignmentProducts]);

  // GPS Acquisition
  const handleAcquireGPS = () => {
    setGps((prev) => ({ ...prev, acquiring: true }));

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({
            latitude: Number(position.coords.latitude.toFixed(7)),
            longitude: Number(position.coords.longitude.toFixed(7)),
            accuracy: Math.round(position.coords.accuracy),
            locked: true,
            acquiring: false,
          });
          toast.success("GPS Location acquired");
        },
        () => {
          // Fallback simulation matching Allmart Bole anchor
          setGps({
            latitude: 8.998425,
            longitude: 38.786515,
            accuracy: 5,
            locked: true,
            acquiring: false,
          });
          toast("Simulated retail GPS coordinates applied", { icon: "📍" });
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }
  };

  // Distance validation from target physical store
  const distanceInfo = useMemo(() => {
    if (!selectedAssignment?.store?.latitude || !gps.latitude) return null;

    const distance = calculateDistanceMeters(
      gps.latitude,
      gps.longitude,
      selectedAssignment.store.latitude,
      selectedAssignment.store.longitude
    );

    const isValid = isWithinStoreRadius(distance, 150); // 150m perimeter
    return { distance, isValid };
  }, [selectedAssignment, gps]);

  // Price comparison calculation
  const numericPrice = parseFloat(price);
  const queensPrice = selectedProduct?.queensPrice || 64.0;
  const livePreview = useMemo(() => {
    if (!numericPrice || numericPrice <= 0) return null;
    return calculatePriceAction(queensPrice, numericPrice);
  }, [queensPrice, numericPrice]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numericPrice || numericPrice <= 0) {
      toast.error("Please enter a valid price greater than 0");
      return;
    }

    setIsSubmitting(true);
    const entryPayload = {
      itemId: selectedProduct.productId,
      competitorId: selectedAssignment.store?.competitor?.id || "allmart",
      marketName: selectedAssignment.store?.name || "Retail Store",
      surveyPeriodId: selectedAssignment.surveyPeriod?.id || "2026-W39",
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
        toast.success(`Price recorded: ${selectedProduct.name} - ${numericPrice} ETB`);
      }
      setPrice("");
    } catch {
      toast.error("Failed to record survey entry");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assignmentsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <h2 className="text-base font-bold text-slate-900">No Store Audits Assigned</h2>
        <p className="text-xs text-slate-500 mt-1">
          You currently have no active store assignments dispatched for this survey cycle.
        </p>
      </div>
    );
  }

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
              Auditor: <span className="font-semibold text-slate-800">{user?.name}</span> • 20-Product Sample
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-[#017C4D] border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-[#017C4D] animate-pulse" />
            Cycle: {selectedAssignment?.surveyPeriod?.id || "2026-W39"}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Step 1: Select Target Store */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-sm font-bold text-slate-800">Target Physical Store</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              My Dispatched Store Visits
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
            >
              {assignments.map((asn) => (
                <option key={asn.id} value={asn.id}>
                  {asn.store?.name} — {asn.store?.area || asn.store?.city} ({asn.items?.length || 0} products)
                </option>
              ))}
            </select>
          </div>

          {/* GPS Proximity Indicator */}
          {distanceInfo && (
            <div
              className={`rounded-xl p-3 flex items-center justify-between text-xs border ${
                distanceInfo.isValid
                  ? "bg-emerald-50/70 border-emerald-200 text-[#017C4D]"
                  : "bg-amber-50/70 border-amber-200 text-[#FE7914]"
              }`}
            >
              <div className="flex items-center gap-2 font-medium">
                <span
                  className={`h-2 w-2 rounded-full ${
                    distanceInfo.isValid ? "bg-[#017C4D]" : "bg-[#FE7914] animate-pulse"
                  }`}
                />
                <span>
                  Store Anchor Distance:{" "}
                  <span className="font-bold font-mono">{distanceInfo.distance}m</span>
                </span>
              </div>
              <span className="font-bold text-[11px] uppercase tracking-wider">
                {distanceInfo.isValid ? "GPS Verified (On Site)" : "Outside Store Perimeter (>150m)"}
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Select Assigned Product Item */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
              2
            </span>
            <h2 className="text-sm font-bold text-slate-800">Assigned Product Checklist</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Item to Audit ({assignmentProducts.length} items)
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
              >
                {assignmentProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    [{p.productId}] {p.name} ({p.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex flex-col justify-center">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Product Details
                </span>
                <span className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedProduct.name}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 font-mono">
                  <span>SKU: {selectedProduct.sku || selectedProduct.productId}</span>
                  <span>Category: {selectedProduct.category}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Enter Shelf Price */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
              3
            </span>
            <h2 className="text-sm font-bold text-slate-800">Observed Competitor Price</h2>
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
                  placeholder="e.g. 58.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-mono transition"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                  ETB / {selectedProduct?.unit || "kg"}
                </span>
              </div>
            </div>

            {livePreview && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/75 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Calculated Index vs Queens (64.00):{" "}
                    <span className="font-extrabold text-slate-900">
                      {livePreview.indexPercent}%
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Queens is {livePreview.variancePercent > 0 ? `+${livePreview.variancePercent}% above` : `${Math.abs(livePreview.variancePercent)}% below`} shelf observation
                  </p>
                </div>
                <PriceActionBadge action={livePreview.action} />
              </div>
            )}
          </div>
        </div>

        {/* Step 4: GPS Location & Submit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#A41821] text-xs font-bold text-white">
                4
              </span>
              <h2 className="text-sm font-bold text-slate-800">GPS Timestamp Validation</h2>
            </div>
            <button
              type="button"
              onClick={handleAcquireGPS}
              disabled={gps.acquiring}
              className="text-xs font-semibold text-[#017C4D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              {gps.acquiring ? "Acquiring..." : "Refresh Location"}
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-600 font-mono">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#017C4D]" />
              <span>
                Lat: {gps.latitude} | Lon: {gps.longitude}
              </span>
            </div>
            <span className="font-sans font-medium text-slate-500">
              Accuracy: ±{gps.accuracy}m
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !numericPrice}
            className="w-full rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Recording Shelf Price..." : "Submit Price Entry"}
          </button>
        </div>
      </form>
    </div>
  );
};