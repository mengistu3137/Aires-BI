import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useObservations } from "../hooks/useObservations.js";
import { useAuth } from "@/hooks/useAuth.js";
import { ObservationFilters } from "../components/ObservationFilters.jsx";
import { ObservationListTable } from "../components/ObservationListTable.jsx";
import { ObservationListItemGlobal } from "../components/ObservationListItemGlobal.jsx";
import { ObservationsSummaryBar } from "../components/ObservationsSummaryBar.jsx";
import { ObservationEmptyState } from "../components/ObservationEmptyState.jsx";
import { SurveyPeriodSelector } from "@/features/survey/components/SurveyPeriodSelector.jsx";
import { useStores } from "@/features/survey/hooks/useStores.js";

export const ObservationsPage = () => {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");

  // URL-backed filters
  const availability = searchParams.get("availability") || "";
  const reviewStatus = searchParams.get("reviewStatus") || "";
  const storeId = searchParams.get("storeId") || "";
  const surveyPeriodId = searchParams.get("surveyPeriodId") || "";
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
      storeId: storeId || undefined,
      surveyPeriodId: surveyPeriodId || undefined,
    }),
    [page, availability, reviewStatus, storeId, surveyPeriodId]
  );

  const { data, isLoading, isError, error } = useObservations(filters);

  const observations = data?.observations || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  // Stores — used to populate the store filter dropdown.
  // We use the shared stores hook (same cache key as elsewhere in the app).
  const { stores = [], isLoading: storesLoading } = useStores();

  // Client-side search across the loaded page
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

  const hasActiveFilters = Boolean(
    availability || reviewStatus || storeId || surveyPeriodId || search
  );

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

      {/* Context filters: Store + Survey period */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs sm:grid-cols-2">
        {/* Store filter */}
        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Store
          </label>
          <div className="relative">
            <select
              value={storeId}
              onChange={(e) => setFilter("storeId", e.target.value)}
              disabled={storesLoading}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 pr-9 text-xs font-semibold text-slate-800 focus:border-[#A41821] focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-[#A41821] disabled:opacity-50"
            >
              <option value="">{storesLoading ? "Loading stores…" : "All stores"}</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                  {store.area ? ` — ${store.area}` : ""}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Survey period filter */}
        <SurveyPeriodSelector
          value={surveyPeriodId}
          onChange={(value) => setFilter("surveyPeriodId", value)}
          label="Survey period"
          placeholder="All survey periods"
          className="sm:max-w-none"
        />
      </div>

      {/* Availability + review filters */}
      <ObservationFilters
        search={search}
        onSearchChange={setSearch}
        availability={availability}
        onAvailabilityChange={(v) => setFilter("availability", v)}
        reviewStatus={reviewStatus}
        onReviewStatusChange={(v) => setFilter("reviewStatus", v)}
      />

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Active:
          </span>
          {storeId && (
            <FilterChip
              label={`Store: ${stores.find((s) => s.id === storeId)?.name || storeId}`}
              onRemove={() => setFilter("storeId", "")}
            />
          )}
          {surveyPeriodId && (
            <FilterChip
              label={`Period: ${surveyPeriodId}`}
              onRemove={() => setFilter("surveyPeriodId", "")}
            />
          )}
          {availability && (
            <FilterChip
              label={`Availability: ${prettyEnum(availability)}`}
              onRemove={() => setFilter("availability", "")}
            />
          )}
          {reviewStatus && (
            <FilterChip
              label={`Review: ${prettyEnum(reviewStatus)}`}
              onRemove={() => setFilter("reviewStatus", "")}
            />
          )}
          {search.trim() && (
            <FilterChip label={`Search: "${search.trim()}"`} onRemove={() => setSearch("")} />
          )}
          <button
            type="button"
            onClick={handleClearFilters}
            className="ml-1 text-[11px] font-bold text-[#A41821] hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

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

const FilterChip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
      aria-label={`Remove ${label}`}
    >
      ✕
    </button>
  </span>
);

const prettyEnum = (value) => {
  if (!value) return "";
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};
