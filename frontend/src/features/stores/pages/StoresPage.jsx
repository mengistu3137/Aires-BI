import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/client.js";
import { useStores } from "@/features/survey/hooks/useStores.js";
import { DataTable } from "@/components/DataTable.jsx";
import { Can } from "@/components/Can.jsx";

const DEFAULT_FORM_STATE = {
  competitorId: "",
  name: "",
  address: "",
  area: "",
  city: "Addis Ababa",
  type: "FMCG",
  latitude: 9.0012,
  longitude: 38.7712,
};

export const StoresPage = () => {
  const { stores, isLoading, createStore, updateStore, deleteStore, isDeleting } = useStores();
  const [selectedType, setSelectedType] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM_STATE);

  // Fetch real database competitors: { status: "success", data: { competitors: [...] } }
  const { data: competitors = [] } = useQuery({
    queryKey: ["competitors", "all"],
    queryFn: async () => {
      const res = await apiClient.get("/competitors");
      return res.data?.data?.competitors || res.data?.competitors || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Pre-select first real competitor when loaded
  useEffect(() => {
    if (competitors.length > 0 && !formData.competitorId) {
      setFormData((prev) => ({ ...prev, competitorId: competitors[0].id }));
    }
  }, [competitors, formData.competitorId]);

  const handleOpenCreateModal = () => {
    setEditingStore(null);
    setFormData({
      ...DEFAULT_FORM_STATE,
      competitorId: competitors[0]?.id || "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (store) => {
    setEditingStore(store);
    setFormData({
      competitorId: store.competitorId || store.competitor?.id || competitors[0]?.id || "",
      name: store.name || "",
      address: store.address || "",
      area: store.area || "",
      city: store.city || "Addis Ababa",
      type: store.type || "FMCG",
      latitude: store.latitude !== null ? Number(store.latitude) : 9.0012,
      longitude: store.longitude !== null ? Number(store.longitude) : 38.7712,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (store) => {
    try {
      await updateStore({
        id: store.id,
        payload: { active: !store.active },
      });
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        competitorId: formData.competitorId,
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        area: formData.area?.trim() || null,
        city: formData.city?.trim() || "Addis Ababa",
        type: formData.type,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      if (editingStore) {
        await updateStore({ id: editingStore.id, payload });
      } else {
        await createStore(payload);
      }

      setIsModalOpen(false);
      setEditingStore(null);
      setFormData(DEFAULT_FORM_STATE);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteStore(deleteCandidate.id);
      setDeleteCandidate(null);
    } catch {
      // Error handled by mutation hook toast
    }
  };

  const filteredStores =
    selectedType === "ALL"
      ? stores
      : stores.filter((s) => s.type === selectedType);

  const tableColumns = [
    {
      header: "Store Name",
      key: "name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900">{row.name}</span>
          <span className="block text-[11px] text-slate-500">
            {row.competitor?.name || "Competitor Market"}
          </span>
        </div>
      ),
    },
    {
      header: "Type",
      key: "type",
      sortable: true,
      render: (row) => (
        <span
          className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${
            row.type === "FRESH"
              ? "bg-emerald-50 text-[#017C4D] border border-emerald-200"
              : "bg-red-50 text-[#A41821] border border-red-200"
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: "Location & Area",
      key: "area",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-medium text-slate-800">{row.area || "Addis Ababa"}</span>
          <span className="block text-[10px] text-slate-400">
            {row.address || row.city}
          </span>
        </div>
      ),
    },
    {
      header: "GPS Anchor Coordinates",
      key: "gps",
      render: (row) =>
        row.latitude ? (
          <div className="font-mono text-[11px] text-slate-600">
            Lat: {Number(row.latitude).toFixed(5)} | Lon: {Number(row.longitude).toFixed(5)}
          </div>
        ) : (
          <span className="text-slate-400 italic">No GPS Anchor</span>
        ),
    },
    {
      header: "Status",
      key: "active",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            row.active
              ? "bg-emerald-50 text-[#017C4D]"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              row.active ? "bg-[#017C4D]" : "bg-slate-400"
            }`}
          />
          {row.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="text-xs font-semibold text-slate-700 hover:text-[#A41821] transition cursor-pointer"
          >
            Edit
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => handleToggleActive(row)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition underline cursor-pointer"
          >
            {row.active ? "Deactivate" : "Activate"}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() => setDeleteCandidate(row)}
            className="text-xs font-semibold text-red-600 hover:text-red-800 transition cursor-pointer"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Competitor Store Locations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Target physical supermarket branches and fresh produce markets with GPS audit anchors
          </p>
        </div>

        <Can role={["ADMIN", "MANAGER"]}>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
          >
            <span className="text-sm">+</span>
            Register Physical Store
          </button>
        </Can>
      </div>

      {/* Filter Tabs & DataTable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Registered Store Anchors ({filteredStores.length})
          </h2>

          <div className="flex items-center gap-1.5">
            {["ALL", "FMCG", "FRESH"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  selectedType === type
                    ? "bg-[#A41821] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={tableColumns}
          data={filteredStores}
          searchKey="name"
          searchPlaceholder="Search store name, area, or competitor..."
          pageSize={8}
          emptyMessage={isLoading ? "Loading physical stores..." : "No stores match the filter."}
        />
      </div>

      {/* Register / Edit Store Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingStore ? "Edit Target Store Location" : "Register Target Store Location"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingStore(null);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Parent Competitor Business
                </label>
                <select
                  value={formData.competitorId}
                  onChange={(e) =>
                    setFormData({ ...formData, competitorId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                >
                  {competitors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Store Branch Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Allmart - Bole"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Area / Subcity</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bole"
                    value={formData.area}
                    onChange={(e) =>
                      setFormData({ ...formData, area: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Store Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                  >
                    <option value="FMCG">FMCG</option>
                    <option value="FRESH">FRESH</option>
                    <option value="BOTH">BOTH</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bole Medhanialem Road, Addis Ababa"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    required
                    value={formData.latitude}
                    onChange={(e) =>
                      setFormData({ ...formData, latitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0000001"
                    required
                    value={formData.longitude}
                    onChange={(e) =>
                      setFormData({ ...formData, longitude: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingStore(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer"
                >
                  {editingStore ? "Update Store Location" : "Save Store Location"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{" "}
              <strong className="text-slate-900">{deleteCandidate.name}</strong>?
              If historical audits or assignments reference this location, the store will be deactivated instead of deleted to protect audit history integrity.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteCandidate(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 text-xs font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};