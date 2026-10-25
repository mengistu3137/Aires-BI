import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatProductName } from "@/utils/formatters.js";
import { generateClientObservationId } from "../utils/observation.utils.js";
import { enqueueObservation, syncObservation } from "../offline/observationQueue.js";

export const ObservationForm = ({
  auditId,
  product,
  existingObservation = null,
  onSaved,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const substituteInputRef = useRef(null);

  const [price, setPrice] = useState(
    existingObservation?.price !== null && existingObservation?.price !== undefined
      ? String(existingObservation.price)
      : ""
  );
  const [substituteProduct, setSubstituteProduct] = useState(
    existingObservation?.substituteProduct || ""
  );

  // Active unavailable state: null | 'OUT_OF_STOCK' | 'NOT_FOUND'
  const [unavailableMode, setUnavailableMode] = useState(
    existingObservation?.availability === "OUT_OF_STOCK" || existingObservation?.availability === "NOT_FOUND"
      ? existingObservation.availability
      : null
  );

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [product?.id]);

  // Focus substitute input when drawer appears
  useEffect(() => {
    if (unavailableMode) {
      setTimeout(() => substituteInputRef.current?.focus(), 80);
    }
  }, [unavailableMode]);

  const invalidateObservationQueries = () => {
    queryClient.invalidateQueries({
      queryKey: ["observations", "audit", auditId],
    });
    queryClient.invalidateQueries({ queryKey: ["observations", "list"] });
    queryClient.invalidateQueries({
      queryKey: ["audits", "detail", auditId],
    });
    queryClient.invalidateQueries({ queryKey: ["audits"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const persist = async ({ availability, price: priceValue, substitute = null }) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const capturedAt = new Date().toISOString();
      const clientObservationId =
        existingObservation?.clientObservationId || generateClientObservationId();

      const payload = {
        clientObservationId,
        auditId,
        productId: product.id,
        availability,
        price: priceValue,
        substituteProduct: substitute?.trim() || null,
        observedUnit: existingObservation?.observedUnit || null,
        packageSize: existingObservation?.packageSize || null,
        capturedAt,
        evidencePhotoUrl: existingObservation?.evidencePhotoUrl || null,
        notes: existingObservation?.notes || null,
      };

      const queued = await enqueueObservation(payload);

      syncObservation(queued).then((result) => {
        if (result.permanent) {
          toast.error(
            result.error?.response?.data?.message || "This observation could not be saved"
          );
        }
      });

      const label =
        availability === "AVAILABLE"
          ? `${formatProductName(product.name)}: ${Number(priceValue).toFixed(2)} ETB`
          : substitute
          ? `${formatProductName(product.name)} (${availability.replace("_", " ")}): Substitute recorded`
          : `${formatProductName(product.name)}: ${availability.replace("_", " ")}`;

      toast.success(label, { id: "observation-toast", duration: 1500 });

      invalidateObservationQueries();
      onSaved?.();
    } catch (err) {
      console.error("[ObservationForm] Save failed:", err);
      toast.error(err?.message || "Unable to save observation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceSubmit = (e) => {
    e?.preventDefault();
    setError("");

    const numeric = parseFloat(price);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError("Enter a valid price greater than 0");
      inputRef.current?.focus();
      return;
    }

    persist({ availability: "AVAILABLE", price: numeric, substitute: null });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (unavailableMode) {
        setUnavailableMode(null);
        setError("");
      } else {
        onCancel?.();
      }
    }
  };

  // Submit substitute with its shelf price
  const handleSaveWithSubstitute = (e) => {
    e?.preventDefault();
    setError("");

    if (!substituteProduct.trim()) {
      setError("Please describe the substitute product found on shelf");
      substituteInputRef.current?.focus();
      return;
    }

    const numeric = parseFloat(price);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError("Please enter the price of the substitute product above");
      inputRef.current?.focus();
      return;
    }

    persist({
      availability: unavailableMode,
      price: numeric,
      substitute: substituteProduct.trim(),
    });
  };

  // Submit plain out of stock without substitute
  const handleSaveWithoutSubstitute = () => {
    persist({
      availability: unavailableMode,
      price: null,
      substitute: null,
    });
  };

  return (
    <form
      onSubmit={handlePriceSubmit}
      className="rounded-2xl border-2 border-[#A41821] bg-white p-4 shadow-lg space-y-3"
    >
      {/* Product Title Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#A41821]">
            Active Item
          </span>
          <h3 className="mt-0.5 text-base font-bold leading-snug text-slate-900">
            {formatProductName(product.name)}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] text-slate-500">
            <span>CODE: {product.barcode || product.sku || product.id}</span>
            <span>•</span>
            <span>UNIT: {product.unit || "kg"}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          title="Cancel (Esc)"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>

      {/* Shelf Price Input (used for either benchmark or substitute) */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700">
          {unavailableMode ? "Substitute Shelf Price (ETB)" : "Observed Shelf Price"}
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            autoComplete="off"
            disabled={isSubmitting}
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
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500 font-mono">
            ETB
          </span>
        </div>
        {error && <p className="mt-1 text-xs font-semibold text-[#A41821]">{error}</p>}
      </div>

      {/* POPUP / DRAWER: Appears when clicking OUT OF STOCK or NOT CARRIED */}
      {unavailableMode ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-3 space-y-2.5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
              {unavailableMode === "OUT_OF_STOCK"
                ? "Record Shelf Substitute (Out of Stock)"
                : "Record Shelf Substitute (Not Carried)"}
            </span>
            <button
              type="button"
              onClick={() => {
                setUnavailableMode(null);
                setError("");
              }}
              className="text-[10px] font-bold text-slate-500 underline hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Substitute Product / Action Taken
            </label>
            <input
              ref={substituteInputRef}
              type="text"
              placeholder={
                unavailableMode === "OUT_OF_STOCK"
                  ? "e.g. Garlic OOS, captured imported garlic 250g"
                  : "e.g. Not carried, captured local garlic instead"
              }
              value={substituteProduct}
              onChange={(e) => {
                setSubstituteProduct(e.target.value);
                setError("");
              }}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#A41821] outline-hidden font-medium"
            />
          </div>

          <div className="pt-1 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={handleSaveWithSubstitute}
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#FE7914] hover:bg-[#D45F06] py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              Save with Substitute ({unavailableMode.replace("_", " ")})
            </button>

            <button
              type="button"
              onClick={handleSaveWithoutSubstitute}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-[11px] font-semibold text-slate-600 transition cursor-pointer disabled:opacity-50"
            >
              No Substitute on Shelf (Confirm {unavailableMode.replace("_", " ")})
            </button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="submit"
            disabled={isSubmitting || !price}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A41821] py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-[0.99] disabled:opacity-40 cursor-pointer"
          >
            <span>Save price observation</span>
            <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
              ↵ Enter
            </kbd>
          </button>

          {/* Clicking these buttons now opens the drawer immediately */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setUnavailableMode("OUT_OF_STOCK");
                setError("");
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2 text-xs font-bold text-[#FE7914] hover:bg-amber-100/60 transition cursor-pointer disabled:opacity-50"
            >
              OUT OF STOCK
            </button>
            <button
              type="button"
              onClick={() => {
                setUnavailableMode("NOT_FOUND");
                setError("");
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              NOT CARRIED
            </button>
          </div>
        </>
      )}

      <p className="mt-2 text-center text-[10px] text-slate-400">
        Enter to save • Esc to cancel
      </p>
    </form>
  );
};