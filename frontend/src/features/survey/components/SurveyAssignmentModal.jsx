import React, { useState } from "react";
import { useStores } from "../hooks/useStores.js";
import { useAssignments } from "../hooks/useAssignments.js";
import { useUsers } from "@/features/users/hooks/useUsers.js";
import { useSurveyStore } from "@/stores/survey/survey.store.js";
import toast from "react-hot-toast";

export const SurveyAssignmentModal = ({ isOpen, onClose }) => {
  const { stores, isLoading: storesLoading } = useStores();
  const { users } = useUsers();
  const { products } = useSurveyStore();
  const { createAssignment, isCreating } = useAssignments();

  // Filter auditors from users list
  const auditors = (users || []).filter(
    (u) => u.role === "FIELD_AUDITOR" && u.active !== false
  );

  const [auditorId, setAuditorId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [surveyPeriodId] = useState("2026-W39");

  // Auto-initialize first options when data loads
  React.useEffect(() => {
    if (auditors.length > 0 && !auditorId) setAuditorId(auditors[0].id);
    if (stores.length > 0 && !storeId) setStoreId(stores[0].id);
    if (products.length > 0 && selectedProductIds.length === 0) {
      setSelectedProductIds(products.slice(0, 10).map((p) => p.id));
    }
  }, [auditors, stores, products, auditorId, storeId, selectedProductIds]);

  if (!isOpen) return null;

  const handleToggleProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
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

    if (!auditorId) {
      toast.error("Please select a field auditor");
      return;
    }
    if (!storeId) {
      toast.error("Please select a physical store location");
      return;
    }
    if (selectedProductIds.length === 0) {
      toast.error("Please select at least one product to audit");
      return;
    }

    try {
      await createAssignment({
        auditorId,
        storeId,
        surveyPeriodId,
        productIds: selectedProductIds,
        status: "NOT_STARTED",
      });

      onClose();
    } catch {
      // Error toast is handled globally in useAssignments
    }
  };

  const selectedStore = stores.find((s) => s.id === storeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Dispatch Field Survey Assignment
            </h2>
            <p className="text-xs text-slate-500">
              Assign an auditor to a physical retail store for cycle {surveyPeriodId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Field Auditor */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Assigned Field Auditor
            </label>
            <select
              value={auditorId}
              onChange={(e) => setAuditorId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
            >
              {auditors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Physical Store Location with GPS */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Target Store & Location
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={storesLoading}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.area || s.city} ({s.type})
                </option>
              ))}
            </select>

            {selectedStore && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                GPS Anchor: Lat {selectedStore.latitude || "N/A"}, Lon{" "}
                {selectedStore.longitude || "N/A"}
              </p>
            )}
          </div>

          {/* Products Checklist */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">
                Products to Audit ({selectedProductIds.length}/{products.length})
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[11px] font-bold text-[#017C4D] hover:underline"
              >
                {selectedProductIds.length === products.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
              {products.map((p) => {
                const checked = selectedProductIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between rounded-lg p-2 transition cursor-pointer ${
                      checked
                        ? "bg-white shadow-2xs font-semibold text-slate-900"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleProduct(p.id)}
                        className="rounded border-slate-300 text-[#A41821] focus:ring-[#A41821]"
                      />
                      <span>
                        {p.name} ({p.unit})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {p.sku || p.id}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
            >
              {isCreating ? "Dispatching..." : "Dispatch Assignment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};