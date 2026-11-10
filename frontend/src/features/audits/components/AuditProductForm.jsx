import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const observationSchema = z.object({
  availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"]),
  price: z.coerce
    .number()
    .min(0, "Price cannot be negative")
    .optional()
    .nullable(),
  substituteProduct: z.string().max(255).optional().nullable(),
  observedUnit: z.string().optional().nullable(),
  packageSize: z.string().optional().nullable(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional().nullable(),
});

export const AuditProductForm = ({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialData = null,
}) => {
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(observationSchema),
    defaultValues: initialData || {
      availability: "AVAILABLE",
      price: "",
      substituteProduct: "",
      observedUnit: product?.unit || "",
      packageSize: "",
      notes: "",
    },
  });

  const availability = watch("availability");
  const isAvailable = availability === "AVAILABLE";
  const isUnavailable = availability === "OUT_OF_STOCK" || availability === "NOT_FOUND";

  const handleFormSubmit = async (data) => {
    setIsSubmittingLocal(true);
    try {
      const hasSub = Boolean(data.substituteProduct?.trim());
      const numPrice = parseFloat(data.price);
      const finalPrice = isAvailable
        ? numPrice
        : hasSub && !isNaN(numPrice) && numPrice > 0
          ? numPrice
          : null;

      await onSubmit({
        ...data,
        productId: product.id,
        price: finalPrice,
        substituteProduct: data.substituteProduct?.trim() || null,
      });
    } catch (error) {
      toast.error(error?.message || "Failed to submit observation");
    } finally {
      setIsSubmittingLocal(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4"
    >
      {/* Product Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{product.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {product.category} • {product.unit}
            {product.sku && ` • SKU: ${product.sku}`}
            {product.barcode && ` • Barcode: ${product.barcode}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Availability Selector Buttons */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
          Availability
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "AVAILABLE", label: "Available" },
            { value: "OUT_OF_STOCK", label: "Out of Stock" },
            { value: "NOT_FOUND", label: "Not Found" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-xs font-semibold transition text-center ${
                availability === option.value
                  ? option.value === "AVAILABLE"
                    ? "border-[#017C4D] bg-emerald-50 text-[#017C4D] font-bold"
                    : "border-[#FE7914] bg-orange-50 text-[#FE7914] font-bold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                value={option.value}
                {...register("availability")}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {/* Progressive Disclosure: When OUT_OF_STOCK or NOT_FOUND is clicked */}
      {isUnavailable && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3.5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
              Substitute Product / Action Taken
            </span>
            <span className="text-[10px] text-amber-700">Optional shelf alternative</span>
          </div>

          <div>
            <input
              type="text"
              placeholder={
                availability === "OUT_OF_STOCK"
                  ? "e.g. Dove OOS, captured Lux 150g as substitute"
                  : "e.g. Not carried, captured closest local brand"
              }
              {...register("substituteProduct")}
              className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Substitute Shelf Price (ETB)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                {...register("price")}
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 pr-12 text-sm font-bold font-mono text-slate-900 focus:border-[#A41821] outline-hidden"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                ETB
              </span>
            </div>
            <p className="mt-1 text-[10px] text-slate-500">
              Leave price empty if no substitute was found on shelf.
            </p>
          </div>
        </div>
      )}

      {/* Price (if Available) */}
      {isAvailable && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
            Price (ETB)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              {...register("price", { required: isAvailable ? "Price is required" : false })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-14 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition font-mono"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
              ETB
            </span>
          </div>
          {errors.price && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.price.message}</p>
          )}
        </div>
      )}

      {/* Unit & Package Size (if Available) */}
      {isAvailable && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Observed Unit
            </label>
            <input
              type="text"
              placeholder={product.unit || "kg"}
              {...register("observedUnit")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
              Package Size
            </label>
            <input
              type="text"
              placeholder="e.g., 500g"
              {...register("packageSize")}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
          Notes (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Any additional observations..."
          {...register("notes")}
          className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmittingLocal || isSubmitting}
          className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-5 py-2 text-xs font-bold text-white transition disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {isSubmittingLocal ? "Saving..." : "Save Observation"}
        </button>
      </div>
    </form>
  );
};