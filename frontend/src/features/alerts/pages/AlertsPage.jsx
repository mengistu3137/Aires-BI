import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAlerts } from "../hooks/useAlerts.js";
import { useAuth } from "@/hooks/useAuth.js";
import { AlertFilters } from "../components/AlertFilters.jsx";
import { AlertListTable } from "../components/AlertListTable.jsx";
import { AlertMobileList } from "../components/AlertMobileList.jsx";
import { AlertEmptyState } from "../components/AlertEmptyState.jsx";
import { AlertSummaryBar } from "../components/AlertSummaryBar.jsx";

export const AlertsPage = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");

  // URL-driven filters
  const statusFilter = searchParams.get("resolved") || "";
  const severityFilter = searchParams.get("severity") || "";
  const typeFilter = searchParams.get("type") || "";
  const page = Number(searchParams.get("page") || 1);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "" || value === null || value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key !== "page") next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const filters = useMemo(
    () => ({
      page,
      limit: 20,
      resolved: statusFilter || undefined,
      severity: severityFilter || undefined,
      type: typeFilter || undefined,
    }),
    [page, statusFilter, severityFilter, typeFilter]
  );

  const { data, isLoading, isError, error } = useAlerts(filters);

  const alerts = data?.alerts || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  // Client-side search across the loaded page (message + product name)
  const visibleAlerts = useMemo(() => {
    if (!search.trim()) return alerts;
    const term = search.toLowerCase();
    return alerts.filter((a) => {
      const name = a.product?.name?.toLowerCase() || "";
      const message = a.message?.toLowerCase() || "";
      const sku = a.product?.sku?.toLowerCase() || "";
      return name.includes(term) || message.includes(term) || sku.includes(term);
    });
  }, [alerts, search]);

  const hasActiveFilters = Boolean(statusFilter || severityFilter || typeFilter || search);

  const handleClearFilters = () => {
    setSearch("");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">Alerts</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Review pricing alerts that require attention across survey periods.
          </p>
        </div>
      </div>

      {/* Filters */}
      <AlertFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={(val) => setFilter("resolved", val)}
        severityFilter={severityFilter}
        onSeverityFilterChange={(val) => setFilter("severity", val)}
        typeFilter={typeFilter}
        onTypeFilterChange={(val) => setFilter("type", val)}
      />

      {/* Summary */}
      {!isLoading && !isError && alerts.length > 0 && (
        <AlertSummaryBar alerts={alerts} meta={meta} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-[#A41821]">
            {error?.message || "Unable to load alerts"}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {visibleAlerts.length === 0 ? (
            hasActiveFilters ? (
              <AlertEmptyState
                title="No alerts match your filters"
                description="Try adjusting or clearing the current filters."
                action={
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                }
              />
            ) : (
              <AlertEmptyState
                title="No alerts found"
                description="Alerts appear here when the backend identifies a pricing action requiring attention."
              />
            )
          ) : (
            <>
              <div className="hidden md:block">
                <AlertListTable alerts={visibleAlerts} />
              </div>
              <div className="md:hidden">
                <AlertMobileList alerts={visibleAlerts} />
              </div>
            </>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setFilter("page", String(Math.max(1, page - 1)))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setFilter("page", String(page + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
