import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { observationFormSchema } from "../schemas/observation.schema.js";
import { AvailabilitySelector } from "./AvailabilitySelector.jsx";
import { PriceInput } from "./PriceInput.jsx";
import { EvidenceCapture } from "./EvidenceCapture.jsx";
import { generateClientObservationId } from "../utils/observation.utils.js";
import { enqueueObservation, syncObservation } from "../offline/observationQueue.js";

/**
 * Full observation entry form.
 * Handles local save + immediate sync attempt (falls back to queue if offline).
 * After a successful server sync, invalidates the audit observation queries
 * so the parent list refreshes without a page reload.
 */
export const ObservationForm = ({
  auditId,
  product,
  existingObservation = null,
  onSaved,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const [evidence, setEvidence] = useState(() => {
    if (existingObservation?.evidencePhotoUrl) {
      return {
        url: existingObservation.evidencePhotoUrl,
        previewUrl: existingObservation.evidencePhotoUrl,
      };
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(observationFormSchema),
    defaultValues: {
      productId: product.id,
      availability: existingObservation?.availability || "AVAILABLE",
      price:
        existingObservation?.price !== null && existingObservation?.price !== undefined
          ? String(existingObservation.price)
          : "",
      observedUnit: existingObservation?.observedUnit || product.unit || "",
      packageSize: existingObservation?.packageSize || "",
      notes: existingObservation?.notes || "",
    },
  });

  const availability = watch("availability");
  const isAvailable = availability === "AVAILABLE";

  // Clear price when availability changes away from AVAILABLE
  useEffect(() => {
    if (!isAvailable) {
      setValue("price", "");
    }
  }, [isAvailable, setValue]);

  /**
   * Invalidate every query the observation touches so the UI updates live.
   */
  const invalidateObservationQueries = () => {
    // Audit-scoped observation list (used by AuditObservationsPage)
    queryClient.invalidateQueries({
      queryKey: ["observations", "audit", auditId],
    });
    // Global observation list (used by ObservationsPage)
    queryClient.invalidateQueries({ queryKey: ["observations", "list"] });
    // Audit detail (contains observationsCount)
    queryClient.invalidateQueries({
      queryKey: ["audits", "detail", auditId],
    });
    // Audit list (may show counts / progress)
    queryClient.invalidateQueries({ queryKey: ["audits"] });
    // Dashboard KPIs (observation totals)
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const capturedAt = new Date().toISOString();
      const clientObservationId =
        existingObservation?.clientObservationId || generateClientObservationId();

      const payload = {
        clientObservationId,
        auditId,
        productId: product.id,
        availability: data.availability,
        price: data.availability === "AVAILABLE" && data.price !== null ? Number(data.price) : null,
        observedUnit: data.observedUnit?.trim() || null,
        packageSize: data.packageSize?.trim() || null,
        capturedAt,
        evidencePhotoUrl: evidence?.url || null,
        notes: data.notes?.trim() || null,
      };

      // 1. Always persist locally first (offline-first)
      const queued = await enqueueObservation(payload);

      // 2. Attempt immediate sync
      const result = await syncObservation(queued);

      if (result.success) {
        toast.success("Observation saved");
        invalidateObservationQueries();
        reset();
        onSaved?.();
      } else if (result.permanent) {
        toast.error(result.error?.response?.data?.message || "This observation could not be saved");
        setIsSubmitting(false);
        return;
      } else {
        // Saved offline — still invalidate so the queued observation
        // appears in the list (its sync status will be PENDING).
        toast.success("Observation saved offline");
        invalidateObservationQueries();
        reset();
        onSaved?.();
      }
    } catch (error) {
      console.error("[ObservationForm] Save failed:", error);
      toast.error(error?.message || "Unable to save observation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Product header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-black text-slate-800">{product.name}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {product.category}
              {product.sku && ` · SKU ${product.sku}`}
              {product.unit && ` · ${product.unit}`}
            </p>
          </div>
          {product.required && (
            <span className="shrink-0 rounded-sm bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FE7914]">
              Required
            </span>
          )}
        </div>
      </div>

      {/* Form body */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AvailabilitySelector
          value={availability}
          onChange={(val) => setValue("availability", val, { shouldValidate: true })}
          error={errors.availability?.message}
        />

        {isAvailable && (
          <PriceInput
            value={watch("price")}
            onChange={(val) => setValue("price", val, { shouldValidate: true })}
            error={errors.price?.message}
          />
        )}

        {isAvailable && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Observed unit
              </label>
              <input
                type="text"
                placeholder={product.unit || "kg"}
                {...register("observedUnit")}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Package size
              </label>
              <input
                type="text"
                placeholder="e.g. 500g"
                {...register("packageSize")}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
              />
            </div>
          </div>
        )}

        <EvidenceCapture
          value={evidence}
          onChange={setEvidence}
          error={errors.evidencePhotoUrl?.message}
        />

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Notes
          </label>
          <textarea
            rows={2}
            placeholder="Optional notes"
            {...register("notes")}
            className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821]"
          />
          {errors.notes && (
            <p className="mt-1 text-xs font-medium text-[#A41821]">{errors.notes.message}</p>
          )}
        </div>
      </div>

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
            {isSubmitting
              ? "Saving..."
              : existingObservation
                ? "Update observation"
                : "Save observation"}
          </button>
        </div>
      </div>
    </form>
  );
};
