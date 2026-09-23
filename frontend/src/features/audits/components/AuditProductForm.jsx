import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";

const observationSchema = z.object({
  price: z.coerce
    .number({ required_error: "Price is required" })
    .min(0, "Price cannot be negative"),
  availability: z.enum(["AVAILABLE", "OUT_OF_STOCK", "NOT_FOUND"]),
  observedUnit: z.string().optional(),
  packageSize: z.string().optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
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
    formState: { errors },
  } = useForm({
    resolver: zodResolver(observationSchema),
    defaultValues: initialData || {
      availability: "AVAILABLE",
      price: "",
      observedUnit: product?.unit || "",
      packageSize: "",
      notes: "",
    },
  });

  const availability = watch("availability");
  const isAvailable = availability === "AVAILABLE";

  const handleFormSubmit = async (data) => {
    setIsSubmittingLocal(true);
    try {
      await onSubmit({
        ...data,
        productId: product.id,
        price: isAvailable ? Number(data.price) : null,
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
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
    >
      {/* Product Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{product.name}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {product.category} • {product.unit}
            {product.sku && ` • SKU: ${product.sku}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Availability */}
      <div className="mt-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Availability
        </label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { value: "AVAILABLE", label: "Available" },
            { value: "OUT_OF_STOCK", label: "Out of Stock" },
            { value: "NOT_FOUND", label: "Not Found" },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${
                availability === option.value
                  ? "border-[#A41821] bg-red-50 text-[#A41821]"
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

      {/* Price (only if available) */}
      {isAvailable && (
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Price (ETB)
          </label>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            {...register("price")}
            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
          />
          {errors.price && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.price.message}</p>
          )}
        </div>
      )}

      {/* Unit & Package Size */}
      {isAvailable && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Observed Unit
            </label>
            <input
              type="text"
              placeholder={product.unit || "kg"}
              {...register("observedUnit")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Package Size
            </label>
            <input
              type="text"
              placeholder="e.g., 500g"
              {...register("packageSize")}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
            />
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mt-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Notes (optional)
        </label>
        <textarea
          rows={2}
          placeholder="Any additional observations..."
          {...register("notes")}
          className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:ring-1 focus:ring-[#A41821] outline-hidden transition"
        />
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmittingLocal || isSubmitting}
          className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219] disabled:opacity-50"
        >
          {isSubmittingLocal ? "Saving..." : "Save Observation"}
        </button>
      </div>
    </form>
  );
};
