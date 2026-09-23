import React, { useEffect, useMemo } from "react";
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

/**
 * Shared create/edit form for Queens prices.
 * - On create: product is selectable
 * - On edit: product is locked (backend does not allow productId change)
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
  const schema = mode === "create" ? createQueensPriceSchema : updateQueensPriceSchema;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: initialValues?.productId || "",
      price: initialValues?.price !== undefined ? String(initialValues.price) : "",
      effectiveFrom: toDateInputValue(initialValues?.effectiveFrom) || "",
      effectiveTo: toDateInputValue(initialValues?.effectiveTo) || "",
      source: initialValues?.source || "",
      notes: initialValues?.notes || "",
    },
  });

  const productId = watch("productId");
  const effectiveFrom = watch("effectiveFrom");
  const effectiveTo = watch("effectiveTo");

  // Detect overlap client-side (advisory only)
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

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Product */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <ProductSelector
          value={productId}
          onChange={(val) => setValue("productId", val, { shouldValidate: true })}
          disabled={mode === "edit" || Boolean(lockedProduct)}
          lockedProduct={lockedProduct}
          error={errors.productId?.message}
        />
      </div>

      {/* Price + dates */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {/* Price */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Price
          </label>
          <div className="relative mt-1.5">
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              {...register("price")}
              className={`w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 pr-14 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 ${
                errors.price
                  ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                  : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
              }`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              ETB
            </span>
          </div>
          {errors.price && (
            <p className="mt-1.5 text-xs font-medium text-[#A41821]">{errors.price.message}</p>
          )}
        </div>

        {/* Effective From */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Effective from
          </label>
          <input
            type="date"
            {...register("effectiveFrom")}
            className={`mt-1.5 w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 ${
              errors.effectiveFrom
                ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-400">When this benchmark price starts.</p>
          {errors.effectiveFrom && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">
              {errors.effectiveFrom.message}
            </p>
          )}
        </div>

        {/* Effective To */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Effective to
          </label>
          <input
            type="date"
            {...register("effectiveTo")}
            className={`mt-1.5 w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 ${
              errors.effectiveTo
                ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
                : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
            }`}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Leave empty if this price should remain current.
          </p>
          {errors.effectiveTo && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.effectiveTo.message}</p>
          )}
        </div>

        {/* Overlap warning (client hint) */}
        {overlappingPeriod && <QueensPricePeriodWarning overlappingPeriod={overlappingPeriod} />}

        {/* Source */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Source
          </label>
          <input
            type="text"
            placeholder="e.g. Queens Market"
            {...register("source")}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          {errors.source && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.source.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Notes
          </label>
          <textarea
            rows={3}
            placeholder="Optional notes"
            {...register("notes")}
            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          {errors.notes && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.notes.message}</p>
          )}
        </div>
      </div>

      {/* Backend error (e.g. overlap rejection, historical immutability) */}
      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-medium text-[#A41821]">{submitError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#7F1219] disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : mode === "create" ? "Create price" : "Update price"}
          </button>
        </div>
      </div>
    </form>
  );
};
