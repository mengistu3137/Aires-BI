import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatProductName } from "@/utils/formatters.js";
import { apiClient } from "@/services/client.js";
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
  const photoInputRef = useRef(null);

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

  // Proof / Evidence Photo State
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState(
    existingObservation?.evidencePhotoUrl || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);

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

  // Photo Upload Handler
  const handlePhotoSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Maximum size is 10MB.");
      return;
    }

    setIsUploadingPhoto(true);
    const toastId = toast.loading("Uploading photo evidence...");

    try {
      const formData = new FormData();
      formData.append("proof", file);

      const res = await apiClient.post("/observations/upload-evidence", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = res.data?.data?.url;
      setEvidencePhotoUrl(url);
      toast.success("Photo attached successfully!", { id: toastId });
    } catch (err) {
      console.error("Photo upload failed:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to upload photo", {
        id: toastId,
      });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEvidencePhotoUrl(null);
    toast("Photo removed", { icon: "🗑️" });
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
        evidencePhotoUrl: evidencePhotoUrl || null,
        observedUnit: existingObservation?.observedUnit || null,
        packageSize: existingObservation?.packageSize || null,
        capturedAt,
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

  const fullImageUrl = evidencePhotoUrl
    ? evidencePhotoUrl.startsWith("http")
      ? evidencePhotoUrl
      : `${apiClient.defaults.baseURL.replace(/\/api\/v1$/, "")}${evidencePhotoUrl}`
    : null;

  return (
    <div className="rounded-2xl border-2 border-[#A41821] bg-white p-4 shadow-lg space-y-3">
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
            <span>UNIT: {product.unit || "pcs"}</span>
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

      {/* Hidden Native File & Camera Input */}
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoSelected}
        accept="image/jpeg,image/png,image/webp,image/heic"
        capture="environment"
        className="hidden"
      />

      {/* Shelf Price Input */}
      <div>
        <label className="mb-1 block text-xs font-bold text-slate-700">
          {unavailableMode ? "Substitute Shelf Price (ETB)" : "Observed shelf price"}
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

      {/* Camera & Proof Photo Attachment Box */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={isUploadingPhoto}
            onClick={() => photoInputRef.current?.click()}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-50"
          >
            <span className="text-base">📸</span>
            <span>
              {isUploadingPhoto
                ? "Uploading photo..."
                : evidencePhotoUrl
                ? "Replace Shelf Photo"
                : "+ Snap Shelf / Receipt Photo"}
            </span>
          </button>

          {evidencePhotoUrl && (
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>

        {/* Thumbnail Preview */}
        {evidencePhotoUrl && (
          <div className="mt-2 flex items-center gap-2.5">
            <img
              src={fullImageUrl}
              alt="Shelf Evidence"
              onClick={() => setPreviewZoom(true)}
              className="h-14 w-14 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition shadow-2xs"
            />
            <div className="text-[11px] text-slate-500">
              <span className="font-bold text-emerald-700 block">✓ Photo Attached</span>
              <span className="text-[10px] text-slate-400">Tap thumbnail to zoom</span>
            </div>
          </div>
        )}
      </div>

      {/* DRAWER STATE: Appears when clicking OUT OF STOCK or NOT CARRIED */}
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
              Substitute Product / Action Taken *
            </label>
            <input
              ref={substituteInputRef}
              type="text"
              placeholder={
                unavailableMode === "OUT_OF_STOCK"
                  ? "e.g. Dove OOS, captured Lux 150g as substitute"
                  : "e.g. Not carried, captured local salt instead"
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
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full rounded-xl bg-[#FE7914] hover:bg-[#D45F06] py-2.5 text-xs font-bold text-white shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              Save with Substitute ({unavailableMode.replace("_", " ")})
            </button>

            <button
              type="button"
              onClick={handleSaveWithoutSubstitute}
              disabled={isSubmitting || isUploadingPhoto}
              className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 py-2 text-[11px] font-semibold text-slate-600 transition cursor-pointer disabled:opacity-50"
            >
              No Substitute on Shelf (Confirm {unavailableMode.replace("_", " ")})
            </button>
          </div>
        </div>
      ) : (
        /* NORMAL STATE: Save Price & Stock Buttons */
        <>
          <button
            type="button"
            onClick={handlePriceSubmit}
            disabled={isSubmitting || !price || isUploadingPhoto}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#A41821] py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-[0.99] disabled:opacity-40 cursor-pointer"
          >
            <span>Save price observation</span>
            <kbd className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">
              ↵ Enter
            </kbd>
          </button>

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setUnavailableMode("OUT_OF_STOCK");
                setError("");
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-amber-200 bg-amber-50/60 py-2.5 text-xs font-bold text-[#FE7914] hover:bg-amber-100/60 transition cursor-pointer disabled:opacity-50"
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
              className="flex-1 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50"
            >
              NOT CARRIED
            </button>
          </div>
        </>
      )}

      {/* Fullscreen Photo Lightbox Modal */}
      {previewZoom && evidencePhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setPreviewZoom(false)}
        >
          <div className="relative max-h-[85vh] max-w-lg overflow-hidden rounded-2xl bg-black p-2">
            <img
              src={fullImageUrl}
              alt="Evidence Zoom"
              className="max-h-[80vh] w-auto object-contain mx-auto rounded-lg"
            />
            <button
              type="button"
              onClick={() => setPreviewZoom(false)}
              className="absolute top-4 right-4 rounded-full bg-black/60 p-2 text-white hover:bg-black"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <p className="mt-2 text-center text-[10px] text-slate-400">
        Enter to save • Esc to cancel
      </p>
    </div>
  );
};