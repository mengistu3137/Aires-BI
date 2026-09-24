import React, { useState, useEffect, useRef } from "react";
import { formatProductName } from "@/utils/formatters.js";

/**
 * RapidPriceInput
 *
 * Ultra-fast price entry panel for the field auditor.
 *
 * Behavior:
 *  - When a product is selected, focus the price input immediately.
 *  - If the product already has an observation (attached as `_existingObservation`),
 *    pre-fill the price input with the previous value and select it so typing replaces it.
 *  - Enter saves. Esc cancels.
 *  - OUT OF STOCK / NOT CARRIED buttons save with no price.
 *
 * The `_existingObservation` prop is attached by the parent
 * (AuditObservationsPage) when handling product selection.
 */
export const RapidPriceInput = ({
  selectedProduct,
  onSavePrice,
  onSaveAvailability,
  onCancel,
  isSaving = false,
}) => {
  const existingObservation = selectedProduct?._existingObservation || null;
  const initialPrice =
    existingObservation?.price !== null && existingObservation?.price !== undefined
      ? String(existingObservation.price)
      : "";

  const [price, setPrice] = useState(initialPrice);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Load price from the selected product's previous observation.
  // Re-runs only when the selected product changes, not on every render.
  useEffect(() => {
    if (!selectedProduct) return;

    const existing = selectedProduct._existingObservation || null;
    const nextPrice =
      existing?.price !== null && existing?.price !== undefined ? String(existing.price) : "";

    setPrice(nextPrice);
    setError("");

    const timer = setTimeout(() => {
      inputRef.current?.focus();
      // Select text so typing replaces it on desktop.
      // On mobile the value is still visible and editable.
      inputRef.current?.select?.();
    }, 50);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  if (!selectedProduct) return null;

  const isEditing = Boolean(existingObservation);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const numeric = parseFloat(price);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError("Please enter a valid price greater than 0");
      inputRef.current?.focus();
      return;
    }

    onSavePrice({
      productId: selectedProduct.productId || selectedProduct.id,
      price: numeric,
      availability: "AVAILABLE",
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSetOutOfStock = () => {
    onSaveAvailability({
      productId: selectedProduct.productId || selectedProduct.id,
      availability: "OUT_OF_STOCK",
      price: null,
    });
  };

  const handleSetNotFound = () => {
    onSaveAvailability({
      productId: selectedProduct.productId || selectedProduct.id,
      availability: "NOT_FOUND",
      price: null,
    });
  };

  const previousLabel = existingObservation
    ? existingObservation.availability === "AVAILABLE" &&
      existingObservation.price !== null &&
      existingObservation.price !== undefined
      ? `${Number(existingObservation.price).toFixed(2)} ETB`
      : existingObservation.availability.replace("_", " ")
    : null;

  return (
    <div className="animate-in fade-in zoom-in-95 space-y-3.5 rounded-2xl border-2 border-[#A41821] bg-white p-4 shadow-lg duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#A41821]">
            {isEditing ? "Editing observation" : "Active item"}
          </span>
          <h3 className="text-base font-bold leading-snug text-slate-900">
            {formatProductName(selectedProduct.name)}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-xs text-slate-500">
            <span>
              CODE: {selectedProduct.barcode || selectedProduct.sku || selectedProduct.productId}
            </span>
            <span>•</span>
            <span>UNIT: {selectedProduct.unit || "kg"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Cancel (Esc)"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>

      {/* Previously saved chip */}
      {isEditing && previousLabel && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[11px]">
          <span className="font-bold text-[#017C4D]">Previously saved:</span>{" "}
          <span className="text-slate-700">{previousLabel}</span>
        </div>
      )}

      {/* Price input */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            Observed shelf price
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              autoComplete="off"
              required
              disabled={isSaving}
              value={price}
              onChange={(e) => {
                const val = e.target.value.replace(",", ".");
                if (/^\d*\.?\d{0,2}$/.test(val)) {
                  setPrice(val);
                  setError("");
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="0.00"
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3.5 pl-4 pr-16 font-mono text-2xl font-black text-slate-900 placeholder:text-slate-300 outline-hidden transition focus:border-[#A41821] focus:bg-white focus:ring-2 focus:ring-[#A41821]/15"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
              ETB
            </span>
          </div>
          {error && <p className="mt-1 text-xs font-semibold text-[#A41821]">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isSaving || !price}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A41821] py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-[0.99] disabled:opacity-40"
        >
          <span>{isEditing ? "Update observation" : "Save price observation"}</span>
          <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
            ↵ Enter
          </kbd>
        </button>
      </form>

      {/* Quick status buttons */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleSetOutOfStock}
          disabled={isSaving}
          className="flex-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2 text-xs font-bold text-[#FE7914] transition hover:bg-amber-100/60 disabled:opacity-50"
        >
          OUT OF STOCK
        </button>

        <button
          type="button"
          onClick={handleSetNotFound}
          disabled={isSaving}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
        >
          NOT CARRIED
        </button>
      </div>
    </div>
  );
};
