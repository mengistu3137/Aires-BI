import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueensPrice } from "../hooks/useQueensPrice.js";
import { useCreateQueensPrice } from "../hooks/useQueensPriceMutations.js";
import { useProducts } from "@/features/products/hooks/useProducts.js";
import {
  formatDate,
  formatDateRange,
  formatPrice,
  getQueensPriceStatus,
} from "../utils/queens-price.utils.js";
import { QueensPriceStatusBadge } from "../components/QueensPriceStatusBadge.jsx";
import { useAuth } from "@/hooks/useAuth.js";
import { formatProductName } from "@/utils/formatters.js";
import toast from "react-hot-toast";

export const QueensPriceDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const { data: queensPrice, isLoading, isError, error } = useQueensPrice(id);
  const { products = [] } = useProducts();
  const createQueensPrice = useCreateQueensPrice();

  // Rapid Price Entry State
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [activeProductIndex, setActiveProductIndex] = useState(0);
  const [quickPrice, setQuickPrice] = useState("");
  const [quickDate, setQuickDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [inputError, setInputError] = useState("");
  const quickInputRef = useRef(null);

  // Sync initial index with current product when opening modal
  useEffect(() => {
    if (isQuickEntryOpen && products.length > 0 && queensPrice) {
      const targetProdId = queensPrice.productId || queensPrice.product?.id;
      const initialIdx = products.findIndex((p) => p.id === targetProdId);
      setActiveProductIndex(initialIdx !== -1 ? initialIdx : 0);
    }
  }, [isQuickEntryOpen, products, queensPrice]);

  const currentProduct = products[activeProductIndex] || queensPrice?.product;
  const totalCatalogItems = Math.max(products.length, 1);

  // Sync price input whenever active product index changes in conveyor flow
  useEffect(() => {
    if (isQuickEntryOpen && currentProduct) {
      const existingBenchmarkPrice =
        currentProduct.activePrice?.price ??
        currentProduct.currentPrice ??
        (currentProduct.id === queensPrice?.productId ? queensPrice?.price : null) ??
        "";
      setQuickPrice(existingBenchmarkPrice ? String(existingBenchmarkPrice) : "");
      setInputError("");
      const timer = setTimeout(() => {
        if (quickInputRef.current) {
          quickInputRef.current.focus();
          quickInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isQuickEntryOpen, activeProductIndex, currentProduct, queensPrice]);

  // Sequential Conveyor Navigation Across the Full Product Catalog
  const handleSkipNext = useCallback(() => {
    setActiveProductIndex((prev) =>
      prev < products.length - 1 ? prev + 1 : 0
    );
  }, [products.length]);

  const handleSkipPrev = useCallback(() => {
    setActiveProductIndex((prev) =>
      prev > 0 ? prev - 1 : products.length - 1
    );
  }, [products.length]);

  const handleQuickSubmit = async (e) => {
    e?.preventDefault();
    setInputError("");

    const numeric = parseFloat(quickPrice);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setInputError("Please enter a valid price greater than 0");
      quickInputRef.current?.focus();
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const effectiveFromDate =
      quickDate === todayStr ? new Date() : new Date(`${quickDate}T00:00:00.000Z`);

   try {
      await createQueensPrice.mutateAsync({
        productId: currentProduct.id,
        price: numeric,
        effectiveFrom: effectiveFromDate,
        source: "Rapid Benchmark Engine (Manager)",
        notes: `Rapidly updated from product catalog`,
        skipToast: true, // ← Suppresses generic toast
      });

      toast.success(
        `${formatProductName(currentProduct.name)}: ${formatPrice(numeric)}`,
        { id: "queens-price-quick-toast", duration: 1500 }
      );

      // Continuous Conveyor Belt: Advance to the next product in the catalog
      if (autoAdvance) {
        if (activeProductIndex < products.length - 1) {
          setActiveProductIndex((prev) => prev + 1);
        } else {
          toast.success("All catalog products completed!", { icon: "🎉" });
          setIsQuickEntryOpen(false);
        }
      }
    } catch (err) {
      setInputError(
        err?.response?.data?.message || err?.message || "Failed to update price"
      );
    }
  };

  const handleCloseRapid = () => {
    setIsQuickEntryOpen(false);
    // If the active product has an existing benchmark, synchronize route
    const activePriceId = currentProduct?.activePrice?.id || currentProduct?.queensPrices?.[0]?.id;
    if (activePriceId && activePriceId !== id) {
      navigate(`/queens-prices/${activePriceId}`, { replace: true });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleCloseRapid();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
      </div>
    );
  }

  if (isError || !queensPrice) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-bold text-[#A41821]">
          {error?.message || "Queens price not found"}
        </p>
        <button
          type="button"
          onClick={() => navigate("/queens-prices")}
          className="mt-3 cursor-pointer rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white shadow-xs"
        >
          Back to Queens prices
        </button>
      </div>
    );
  }

  const status = getQueensPriceStatus(queensPrice);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Back Button */}
      <button
        type="button"
        onClick={() => {
          if (isQuickEntryOpen) {
            handleCloseRapid();
          } else {
            navigate(-1);
          }
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {isQuickEntryOpen ? "Exit Rapid Mode" : "Back"}
      </button>

      {/* A. STANDARD STATIC BENCHMARK CARD (Visible ONLY when Rapid Mode is Closed) */}
      {!isQuickEntryOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-slate-900 truncate">
                {formatProductName(queensPrice.product?.name) || "Unknown product"}
              </h1>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                {queensPrice.product?.category}
                {queensPrice.product?.sku && ` · SKU ${queensPrice.product.sku}`}
                {queensPrice.product?.barcode && ` · Barcode ${queensPrice.product.barcode}`}
              </p>
            </div>
            <QueensPriceStatusBadge status={status} />
          </div>

          {/* Current Active Price Presentation */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Active Benchmark Price
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {formatDateRange(queensPrice.effectiveFrom, queensPrice.effectiveTo)}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-slate-900">
                {formatPrice(queensPrice.price)}
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                per {queensPrice.product?.unit || "unit"}
              </span>
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            {isManager && (
              <button
                type="button"
                onClick={() => setIsQuickEntryOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs active:scale-95"
              >
                <span>Rapid Price Update</span>
              </button>
            )}

            {isManager && (
              <button
                type="button"
                onClick={() => navigate(`/queens-prices/${id}/edit`)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Manual Edit
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate(`/products/${queensPrice.productId}/queens-prices`)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Price Timeline
            </button>
          </div>
        </div>
      )}

      {/* B. DEDICATED RAPID BENCHMARK ENTRY WORKSPACE (Visible ONLY when Rapid Mode is Open) */}
      {isQuickEntryOpen && currentProduct && (
        <div className="rounded-2xl border-2 border-[#A41821] bg-white p-5 sm:p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Step Tracker across Catalog Products */}
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#A41821] font-mono">
                  Catalog Item #{activeProductIndex + 1} of {totalCatalogItems}
                </span>

                {/* Auto-Advance Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setAutoAdvance((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold font-mono transition cursor-pointer ${
                    autoAdvance
                      ? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
                      : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}
                  title="Toggle automatic next-product flow"
                >
                  <span>Auto-advance</span>
                  <span>{autoAdvance ? "⚡ ON" : "OFF"}</span>
                </button>
              </div>

              <h2 className="mt-1.5 text-base sm:text-lg font-black text-slate-900 truncate">
                {formatProductName(currentProduct.name)}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {currentProduct.category} • {currentProduct.unit}
                {currentProduct.sku && ` • SKU: ${currentProduct.sku}`}
                {currentProduct.barcode && ` • ${currentProduct.barcode}`}
              </p>
            </div>

            {/* Prev / Skip / Exit Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleSkipPrev}
                disabled={createQueensPrice.isPending}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-30"
                title="Previous product in catalog"
              >
                ◀
              </button>
              <button
                type="button"
                onClick={handleSkipNext}
                disabled={createQueensPrice.isPending}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer disabled:opacity-30"
                title="Skip to next product in catalog"
              >
                ▶
              </button>
              <button
                type="button"
                onClick={handleCloseRapid}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                title="Exit rapid mode (Esc)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Current Benchmark Badge for the Active Catalog Item */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50/80 px-3.5 py-2.5 border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Current Benchmark Baseline
            </span>
            <span className="font-mono text-xs font-black text-slate-700">
              {currentProduct.activePrice?.price
                ? formatPrice(currentProduct.activePrice.price)
                : currentProduct.currentPrice
                ? formatPrice(currentProduct.currentPrice)
                : "Not yet set"}
            </span>
          </div>

          <form onSubmit={handleQuickSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  New Shelf Benchmark Price
                </label>
                <span className="text-[10px] text-slate-400">
                  Press <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-slate-600">Enter ↵</kbd> to save &amp; advance
                </span>
              </div>

              {/* Hero Numeric Input */}
              <div className="relative">
                <input
                  ref={quickInputRef}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  autoComplete="off"
                  required
                  disabled={createQueensPrice.isPending}
                  value={quickPrice}
                  onChange={(e) => {
                    const val = e.target.value.replace(",", ".");
                    if (/^\d*\.?\d{0,2}$/.test(val)) {
                      setQuickPrice(val);
                      setInputError("");
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3.5 pl-4 pr-16 text-2xl sm:text-3xl font-black text-slate-900 placeholder:text-slate-300 focus:border-[#A41821] focus:bg-white focus:ring-2 focus:ring-[#A41821]/15 outline-hidden font-mono transition"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 font-mono">
                  ETB
                </span>
              </div>
              {inputError && (
                <p className="text-xs font-semibold text-[#A41821] mt-1.5">{inputError}</p>
              )}
            </div>

            {/* Effective Start Date */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-slate-50 p-2.5 border border-slate-100">
              <span className="text-[11px] font-bold text-slate-600">
                Effective From Date:
              </span>
              <input
                type="date"
                value={quickDate}
                onChange={(e) => setQuickDate(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 focus:border-[#A41821] outline-hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleSkipNext}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Skip Item
              </button>

              <button
                type="submit"
                disabled={createQueensPrice.isPending || !quickPrice}
                className="flex-2 flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-40 cursor-pointer"
              >
                <span>
                  {createQueensPrice.isPending
                    ? "Saving..."
                    : autoAdvance
                    ? "Save & Next Item"
                    : "Save Price"}
                </span>
                <kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-mono font-bold">
                  ↵ Enter
                </kbd>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* C. RECORD AUDIT DETAILS CARD (Visible ONLY when Rapid Mode is Closed) */}
      {!isQuickEntryOpen && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Record Metadata &amp; Continuity
          </h3>
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Effective from" value={formatDate(queensPrice.effectiveFrom)} />
            <DetailRow
              label="Effective to"
              value={queensPrice.effectiveTo ? formatDate(queensPrice.effectiveTo) : "Present (Active Open-Ended)"}
            />
            <DetailRow label="Benchmark source" value={queensPrice.source || "—"} />
            <DetailRow label="Auditor / System notes" value={queensPrice.notes || "—"} />
            <DetailRow label="Created on" value={formatDate(queensPrice.createdAt)} />
            <DetailRow label="Last modified" value={formatDate(queensPrice.updatedAt)} />
          </dl>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-start justify-between gap-3 py-2.5">
    <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="max-w-[60%] text-right text-xs font-semibold text-slate-700">{value}</dd>
  </div>
);