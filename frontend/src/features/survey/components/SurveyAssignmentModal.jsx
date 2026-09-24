import React, { useState, useEffect } from "react";
import { useStores } from "../hooks/useStores.js";
import { useCreateAssignment, useUpdateAssignment } from "../hooks/useAssignments.js";
import { usePeriods } from "../hooks/usePeriods.js";
import { useUsers } from "@/features/users/hooks/useUsers.js";
import { useProducts } from "@/features/products/hooks/useProducts.js";
import { formatProductName } from "@/utils/formatters.js";
import toast from "react-hot-toast";

export const SurveyAssignmentModal = ({
  isOpen,
  onClose,
  assignment = null, // ← when present, edit mode
}) => {
  const isEditMode = Boolean(assignment);

  const { stores, isLoading: storesLoading } = useStores();
  const { users } = useUsers();
  const { products, isLoading: productsLoading } = useProducts();
  const { activePeriod, periods } = usePeriods();

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const openPeriods = (periods || []).filter((p) => p.status === "OPEN");

  const auditors = (users || []).filter((u) => u.role === "FIELD_AUDITOR" && u.active !== false);

  const [auditorId, setAuditorId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [surveyPeriodId, setSurveyPeriodId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Prefill on open
  useEffect(() => {
    if (!isOpen) return;

    if (isEditMode && assignment) {
      setAuditorId(assignment.auditor?.id || assignment.auditorId || "");
      setStoreId(assignment.store?.id || assignment.storeId || "");
      setSurveyPeriodId(assignment.surveyPeriod?.id || assignment.surveyPeriodId || "");
      const itemIds = (assignment.items || []).map((it) => it.productId || it.id).filter(Boolean);
      setSelectedProductIds(itemIds);
    } else {
      setAuditorId(auditors[0]?.id || "");
      setStoreId(stores[0]?.id || "");
      setSurveyPeriodId(activePeriod?.id || openPeriods[0]?.id || "");
      setSelectedProductIds(products.map((p) => p.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, assignment]);

  // Late defaults for create mode
  useEffect(() => {
    if (isEditMode || !isOpen) return;
    if (!auditorId && auditors.length > 0) setAuditorId(auditors[0].id);
    if (!storeId && stores.length > 0) setStoreId(stores[0].id);
    if (!surveyPeriodId && (activePeriod?.id || openPeriods[0]?.id)) {
      setSurveyPeriodId(activePeriod?.id || openPeriods[0]?.id);
    }
    if (selectedProductIds.length === 0 && products.length > 0) {
      setSelectedProductIds(products.map((p) => p.id));
    }
  }, [
    isEditMode,
    isOpen,
    auditors,
    stores,
    products,
    activePeriod,
    openPeriods,
    auditorId,
    storeId,
    surveyPeriodId,
    selectedProductIds.length,
  ]);

  if (!isOpen) return null;

  const handleToggleProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === products.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(products.map((p) => p.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!auditorId) return toast.error("Please select a field auditor");
    if (!storeId) return toast.error("Please select a target store");
    if (!surveyPeriodId)
      return toast.error("No open survey cycle found. Please open a cycle first.");
    if (selectedProductIds.length === 0) return toast.error("Please select at least one product");

    // Payload matches backend createAssignmentSchema
    const payload = {
      auditorId,
      storeId,
      surveyPeriodId,
      productIds: selectedProductIds,
      status: isEditMode ? assignment.status : "NOT_STARTED",
    };

    try {
      if (isEditMode) {
        await updateAssignment.mutateAsync({ id: assignment.id, payload });
      } else {
        await createAssignment.mutateAsync(payload);
      }
      onClose();
    } catch {
      // toast handled in mutation
    }
  };

  const selectedStore = stores.find((s) => s.id === storeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        <div className="flex flex-none items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-black text-slate-900">
              {isEditMode ? "Edit assignment" : "Dispatch survey assignment"}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditMode
                ? "Update the auditor, store, cycle, or product list"
                : "Assign an auditor to a store for an open survey cycle"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer p-1 text-slate-400 transition hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-3.5 overflow-y-auto pr-1 text-xs">
          <div>
            <label className="mb-1 block font-bold text-slate-700">Active survey cycle</label>
            {openPeriods.length > 0 ? (
              <select
                value={surveyPeriodId}
                onChange={(e) => setSurveyPeriodId(e.target.value)}
                disabled={isEditMode}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] disabled:bg-slate-100"
              >
                {openPeriods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (OPEN)
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-bold text-[#A41821]">
                ⚠️ No survey cycle is currently OPEN.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">Assigned field auditor</label>
            <select
              value={auditorId}
              onChange={(e) => setAuditorId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821]"
            >
              {auditors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block font-bold text-slate-700">
              Target store &amp; location
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={storesLoading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-hidden focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821]"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.area || s.city} ({s.type})
                </option>
              ))}
            </select>
            {selectedStore && (
              <p className="mt-1 font-mono text-[11px] text-slate-500">
                GPS: {selectedStore.latitude || "N/A"}, {selectedStore.longitude || "N/A"}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Products to audit ({selectedProductIds.length}/{products.length})
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="cursor-pointer text-[11px] font-bold text-[#017C4D] hover:underline"
              >
                {selectedProductIds.length === products.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
              {productsLoading ? (
                <p className="py-2 text-center text-xs text-slate-400">Loading products...</p>
              ) : (
                products.map((p) => {
                  const checked = selectedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition ${
                        checked
                          ? "bg-white font-bold text-slate-900 shadow-xs"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2 pr-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleProduct(p.id)}
                          className="cursor-pointer rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
                        />
                        <span className="truncate">
                          {formatProductName(p.name)} ({p.unit})
                        </span>
                      </div>
                      <span className="flex-none font-mono text-[10px] text-slate-400">
                        {p.barcode || p.sku || p.id}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-none justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                createAssignment.isPending || updateAssignment.isPending || !openPeriods.length
              }
              className="cursor-pointer rounded-xl bg-[#A41821] px-4 py-2 font-bold text-white shadow-xs transition hover:bg-[#7F1219] active:scale-95 disabled:opacity-50"
            >
              {createAssignment.isPending || updateAssignment.isPending
                ? isEditMode
                  ? "Saving..."
                  : "Dispatching..."
                : isEditMode
                  ? "Save changes"
                  : "Dispatch assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
