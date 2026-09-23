import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useObservations } from "../hooks/useObservations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ObservationFilters } from "../components/ObservationFilters.jsx";
import { ObservationListTable } from "../components/ObservationListTable.jsx";
import { ObservationListItemGlobal } from "../components/ObservationListItemGlobal.jsx";
import { ObservationsSummaryBar } from "../components/ObservationsSummaryBar.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";

/**
 * Global Observations page.
 * Lists observations across all audits (role-scoped by backend).
 * Admin / Manager see everything; Field Auditor sees only their own.
 */
export const ObservationsPage = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");

  const availability = searchParams.get("availability") || "";
  const reviewStatus = searchParams.get("reviewStatus") || "";
  const page = Number(searchParams.get("page") || 1);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.set("page", "1");
    setSearchParams(next, { replace: true });
  };

  const filters = useMemo(
    () => ({
      page,
      limit: 20,
      availability: availability || undefined,
      reviewStatus: reviewStatus || undefined,
    }),
    [page, availability, reviewStatus]
  );

  const { data, isLoading, isError, error } = useObservations(filters);

  const observations = data?.observations || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  // Client-side search across the loaded page (product / store / auditor / SKU)
  const visibleObservations = useMemo(() => {
    if (!search.trim()) return observations;
    const term = search.toLowerCase();
    return observations.filter((o) => {
      const name = o.product?.name?.toLowerCase() || "";
      const sku = o.product?.sku?.toLowerCase() || "";
      const store = o.audit?.store?.name?.toLowerCase() || "";
      const auditor = o.auditor?.name?.toLowerCase() || "";
      return (
        name.includes(term) || sku.includes(term) || store.includes(term) || auditor.includes(term)
      );
    });
  }, [observations, search]);

  const hasActiveFilters = Boolean(availability || reviewStatus || search);

  const handleClearFilters = () => {
    setSearch("");
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">Observations</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {isManager
              ? "All competitor price observations collected across field audits."
              : "Your price observations collected during field audits."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <ObservationFilters
        search={search}
        onSearchChange={setSearch}
        availability={availability}
        onAvailabilityChange={(v) => setFilter("availability", v)}
        reviewStatus={reviewStatus}
        onReviewStatusChange={(v) => setFilter("reviewStatus", v)}
      />

      {/* Summary */}
      {!isLoading && !isError && observations.length > 0 && (
        <ObservationsSummaryBar observations={observations} meta={meta} />
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
            {error?.message || "Unable to load observations"}
          </p>
        </div>
      )}

      {/* Content */}
      {!isLoading && !isError && (
        <>
          {visibleObservations.length === 0 ? (
            hasActiveFilters ? (
              <ObservationEmptyState
                title="No observations match your filters"
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
              <ObservationEmptyState
                title="No observations recorded yet"
                description="Observations appear here once auditors collect them during field visits."
              />
            )
          ) : (
            <>
              <div className="hidden md:block">
                <ObservationListTable observations={visibleObservations} />
              </div>
              <div className="space-y-2 md:hidden">
                {visibleObservations.map((o) => (
                  <ObservationListItemGlobal key={o.id} observation={o} />
                ))}
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
