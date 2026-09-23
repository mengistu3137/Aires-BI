import React, { useEffect, useState } from "react";
import { useProducts } from "../hooks/useProducts.js";
import { DataTable } from "@/components/DataTable.jsx";
import { Can } from "@/components/Can.jsx";
import toast from "react-hot-toast";

export const ProductsPage = () => {
  const { products, isLoading, addPrice, isUpdatingPrice } = useProducts();
  console.log("the products,",products)
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [activeProductForPrice, setActiveProductForPrice] = useState(null);
  const [newPrice, setNewPrice] = useState("");
  const [priceNotes, setPriceNotes] = useState("");
  useEffect(()=>{
  console.log("the products,", products);

  },[])

  const categories = [
    "ALL",
    "Fresh",
    "Ultra-Sensitive",
    "Sensitive",
    "Non-Sensitive",
    "Dry",
  ];

  const filteredProducts =
    selectedCategory === "ALL"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleUpdatePriceSubmit = async (e) => {
    e.preventDefault();
    if (!newPrice || parseFloat(newPrice) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    try {
      await addPrice({
        productId: activeProductForPrice.id,
        price: parseFloat(newPrice),
        effectiveFrom: new Date().toISOString(),
        notes: priceNotes || "Manual Manager Update",
      });
      setActiveProductForPrice(null);
      setNewPrice("");
      setPriceNotes("");
    } catch {
      // Error handled in hook
    }
  };

  const tableColumns = [
    {
      header: "Product Item",
      key: "name",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900">{row.name}</span>
          <span className="block text-[10px] font-mono text-slate-400">
            ID: {row.id} • Unit: {row.unit}
          </span>
        </div>
      ),
    },
    {
      header: "Category",
      key: "category",
      sortable: true,
      render: (row) => (
        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
          {row.category}
        </span>
      ),
    },
    {
      header: "SKU / Barcode",
      key: "sku",
      render: (row) => (
        <div className="font-mono text-[11px] text-slate-600">
          <span>{row.sku || "N/A"}</span>
          <span className="block text-[10px] text-slate-400">
            {row.barcode ? `Barcode: ${row.barcode}` : ""}
          </span>
        </div>
      ),
    },
    {
      header: "Active Queens Benchmark",
      key: "currentQueensPrice",
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-black text-slate-900 text-sm">
            {Number(row.currentQueensPrice).toFixed(2)} ETB
          </span>
          <span className="block text-[10px] text-slate-400">
            {row.priceHistoryCount || 1} price revision(s)
          </span>
        </div>
      ),
    },
    {
      header: "Action",
      key: "actions",
      align: "right",
      render: (row) => (
        <Can role={["ADMIN", "MANAGER"]}>
          <button
            type="button"
            onClick={() => {
              setActiveProductForPrice(row);
              setNewPrice(row.currentQueensPrice || "");
            }}
            className="text-xs font-semibold text-[#017C4D] hover:underline cursor-pointer"
          >
            Update Price
          </button>
        </Can>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            Master Product Catalog & Benchmark Pricing
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            20-item representative pilot sample with historical Queens pricing benchmarks
          </p>
        </div>
      </div>

      {/* Category Pills & Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Product Catalog ({filteredProducts.length})
          </h2>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#A41821] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={tableColumns}
          data={filteredProducts}
          searchKey="name"
          searchPlaceholder="Search product by name, SKU, or ID..."
          pageSize={10}
          emptyMessage={
            isLoading ? "Loading product catalog..." : "No products found."
          }
        />
      </div>

      {/* Update Queens Benchmark Price Modal */}
      {activeProductForPrice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Queens Benchmark
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {activeProductForPrice.name} ({activeProductForPrice.unit})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveProductForPrice(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdatePriceSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  New Queens Benchmark Price (ETB)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.1"
                  placeholder="e.g. 68.00"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-base font-bold text-slate-900 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Change Note / ERP Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Supplier cost increase Week 39"
                  value={priceNotes}
                  onChange={(e) => setPriceNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-[#A41821] focus:ring-1 focus:ring-[#A41821] outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveProductForPrice(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPrice}
                  className="rounded-xl bg-[#A41821] hover:bg-[#7F1219] px-4 py-2 font-bold text-white shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingPrice ? "Saving..." : "Save Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};