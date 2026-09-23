import React, { useState, useEffect, useRef } from "react";
import { formatProductName } from "@/utils/formatters.js";

export const RapidPriceInput = ({
  selectedProduct,
  onSavePrice,
  onSaveAvailability,
  onCancel,
  isSaving = false,
}) => {
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (selectedProduct) {
      setPrice("");
      setError("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const numeric = parseFloat(price);
    if (isNaN(numeric) || numeric <= 0) {
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

  return (
    <div className="rounded-2xl border-2 border-[#A41821] bg-white p-4 shadow-lg space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
        <div className="min-w-0 flex-1">
          {/* Uppercase reserved strictly for micro-label */}
          <span className="text-[10px] font-black uppercase tracking-wider text-[#A41821]">
            ACTIVE ITEM
          </span>
          {/* Title Case Product Typography */}
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {formatProductName(selectedProduct.name)}
          </h3>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
            <span>CODE: {selectedProduct.barcode || selectedProduct.sku || selectedProduct.productId}</span>
            <span>•</span>
            <span>UNIT: {selectedProduct.unit || "kg"}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          title="Cancel (Esc)"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Observed Shelf Price
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
              className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3.5 pl-4 pr-16 text-2xl font-black text-slate-900 placeholder:text-slate-300 focus:border-[#A41821] focus:bg-white focus:ring-2 focus:ring-[#A41821]/15 outline-hidden font-mono transition"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-500">
              ETB
            </span>
          </div>
          {error && <p className="text-xs font-semibold text-[#A41821] mt-1">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={isSaving || !price}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] py-3.5 text-sm font-bold text-white shadow-xs transition active:scale-[0.99] disabled:opacity-40 cursor-pointer"
        >
          <span>Save Price Observation</span>
          <kbd className="rounded-md bg-white/20 px-2 py-0.5 text-xs font-mono font-bold">
            ↵ Enter
          </kbd>
        </button>
      </form>

      {/* Micro-badges for status */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button
          type="button"
          onClick={handleSetOutOfStock}
          disabled={isSaving}
          className="flex-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2 text-xs font-bold text-[#FE7914] hover:bg-amber-100/60 transition cursor-pointer"
        >
          OUT OF STOCK
        </button>

        <button
          type="button"
          onClick={handleSetNotFound}
          disabled={isSaving}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
        >
          NOT CARRIED
        </button>
      </div>
    </div>
  );
};