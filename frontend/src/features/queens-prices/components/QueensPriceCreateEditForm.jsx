import React, { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createQueensPriceSchema,
  updateQueensPriceSchema,
} from "../schemas/queens-price.schema.js";
import { ProductSelector } from "./ProductSelector.jsx";
import { QueensPricePeriodWarning } from "./QueensPricePeriodWarning.jsx";
import {
  findOverlappingPeriod,
  fromDateInputValue,
  toDateInputValue,
} from "../utils/queens-price.utils.js";
import { humanizeBenchmarkError } from "@/features/stores/utils/humanize-errors.js";

/**
 * Modern, keyboard-first rapid data-entry form for Queen's benchmark prices.
 * Supports rapid "Select → Enter → Save → Next" workflow with Enter-to-submit.
 */
export const QueensPriceCreateEditForm = ({
  mode = "create",
  initialValues = null,
  lockedProduct = null,
  existingPeriods = [],
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitError = null,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(initialValues?.notes || initialValues?.source || initialValues?.effectiveTo)
  );

  const priceInputRef = useRef(null);
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const schema = mode === "create" ? createQueensPriceSchema : updateQueensPriceSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setFocus,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: initialValues?.productId || lockedProduct?.id || "",
      price: initialValues?.price !== undefined ? String(initialValues.price) : "",
      // Auto-default effectiveFrom to today for instant one-click saves
      effectiveFrom: toDateInputValue(initialValues?.effectiveFrom) || todayStr,
      effectiveTo: toDateInputValue(initialValues?.effectiveTo) || "",
      source: initialValues?.source || "Official Queen's Price Index",
      notes: initialValues?.notes || "",
    },
  });

  const productId = watch("productId");
  const effectiveFrom = watch("effectiveFrom");
  const effectiveTo = watch("effectiveTo");

  // Keep productId synced if lockedProduct loads asynchronously
  useEffect(() => {
    if (lockedProduct?.id && !productId) {
      setValue("productId", lockedProduct.id, { shouldValidate: true });
    }
  }, [lockedProduct, productId, setValue]);

  // Auto-focus price input once product is identified
  useEffect(() => {
    if (lockedProduct || productId) {
      const timer = setTimeout(() => {
        if (priceInputRef.current) {
          priceInputRef.current.focus();
          priceInputRef.current.select();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [lockedProduct, productId]);

  // Client-side advisory overlap detection
  const overlappingPeriod = useMemo(() => {
    if (!effectiveFrom) return null;
    return findOverlappingPeriod(
      {
        effectiveFrom: fromDateInputValue(effectiveFrom),
        effectiveTo: effectiveTo ? fromDateInputValue(effectiveTo) : null,
      },
      existingPeriods,
      initialValues?.id
    );
  }, [effectiveFrom, effectiveTo, existingPeriods, initialValues?.id]);

  const handleFormSubmit = (data) => {
    const payload = {
      price: Number(data.price),
      effectiveFrom: fromDateInputValue(data.effectiveFrom),
      effectiveTo: data.effectiveTo ? fromDateInputValue(data.effectiveTo) : null,
      source: data.source?.trim() || null,
      notes: data.notes?.trim() || null,
    };

    if (mode === "create") {
      payload.productId = data.productId;
    }

    onSubmit(payload);
  };

  // Keyboard shortcut listener: Ctrl+Enter or Cmd+Enter submits from anywhere
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(handleFormSubmit)();
    }
  };

  const { ref: priceFormRef, ...priceRegisterRest } = register("price");

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      onKeyDown={handleKeyDown}
      className="space-y-4"
    >
      {/* 1. Product Selection Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        

        <ProductSelector
          value={productId}
          onChange={(val) => {
            setValue("productId", val, { shouldValidate: true });
            // Auto-advance focus to price input upon selection
            setTimeout(() => priceInputRef.current?.focus(), 60);
          }}
          disabled={mode === "edit" || Boolean(lockedProduct)}
          lockedProduct={lockedProduct}
          error={errors.productId?.message}
        />
      </div>

      {/* 2. Rapid Price Entry Card (Hero Component) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Benchmark Rate
          </label>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            Press <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-600">Enter ↵</kbd> to save
          </span>
        </div>

        {/* Hero Price Input */}
        <div>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              {...priceRegisterRest}
              ref={(el) => {
                priceFormRef(el);
                priceInputRef.current = el;
              }}
              className={`w-full rounded-2xl border bg-slate-50/60 px-4 py-3.5 pr-16 font-mono text-2xl font-black text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-hidden focus:ring-2 transition ${
                errors.price
                  ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]/20"
                  : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]/20"
              }`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-black text-slate-400">
              ETB
            </span>
          </div>

          {errors.price && (
            <p className="mt-1.5 text-xs font-semibold text-[#A41821]">
              {errors.price.message}
            </p>
          )}
        </div>

        {/* Effective Date Fast-Preset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Effective From
            </label>
            <input
              type="date"
              {...register("effectiveFrom")}
              className={`w-full rounded-xl border bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 ${
                errors.effectiveFrom
                  ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                  : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
              }`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Starts today. Supersedes previous open benchmark.
            </p>
            {errors.effectiveFrom && (
              <p className="mt-1 text-xs font-medium text-[#A41821]">
                {errors.effectiveFrom.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Effective To (Optional)
            </label>
            <input
              type="date"
              placeholder="Open-ended"
              {...register("effectiveTo")}
              className={`w-full rounded-xl border bg-slate-50/60 px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 ${
                errors.effectiveTo
                  ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                  : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
              }`}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Leave blank to keep active indefinitely.
            </p>
            {errors.effectiveTo && (
              <p className="mt-1 text-xs font-medium text-[#A41821]">
                {errors.effectiveTo.message}
              </p>
            )}
          </div>
        </div>

        {/* Overlap Advisory Hint */}
        {overlappingPeriod && (
          <div className="pt-1">
            <QueensPricePeriodWarning overlappingPeriod={overlappingPeriod} />
          </div>
        )}
      </div>

      {/* 3. Progressive Disclosure: Additional Audit Details */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowAdvanced((prev) => !prev)}
          className="flex w-full items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <svg
              className={`h-3.5 w-3.5 text-slate-400 transition-transform ${showAdvanced ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Audit Source & Reference Notes
          </span>
          <span className="text-[10px] font-semibold text-slate-400">
            {showAdvanced ? "Hide details" : "Show details"}
          </span>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Price Source Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Queen's Supermarket Official Shelf Tag"
                {...register("source")}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#A41821] focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
              />
              {errors.source && (
                <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.source.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Internal Operational Notes
              </label>
              <textarea
                rows={2}
                placeholder="Optional notes regarding price changes or seasonal adjustments..."
                {...register("notes")}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#A41821] focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
              />
              {errors.notes && (
                <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.notes.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

     {submitError && (() => {
  const err = humanizeBenchmarkError(submitError);
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FE7914] text-white text-[11px] font-bold">
          !
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-slate-900">{err.title}</h4>
          <p className="mt-0.5 text-xs text-slate-700">{err.message}</p>
          {err.hint && (
            <p className="mt-1 text-[11px] font-medium text-amber-800">
              {err.hint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
})()}

      {/* 4. Fixed / Sticky Action Controls */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 backdrop-blur-xs px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving Benchmark...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{mode === "create" ? "Save Benchmark Price" : "Update Benchmark Price"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};