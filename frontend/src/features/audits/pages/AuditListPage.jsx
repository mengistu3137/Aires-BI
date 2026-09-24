import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAudits } from "../hooks/useAudits.js";
import { AuditCard } from "../components/AuditCard.jsx";
import { AuditEmptyState } from "../components/AuditEmptyState.jsx";
import { AuditSummaryBar } from "../components/AuditSummaryBar.jsx";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const AuditListPage = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useAudits({
    status: statusFilter || undefined,
    page,
    limit: 20,
  });

  const audits = data?.audits || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-800">Audit visits</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Field audit visits and price collection records across survey periods.
          </p>
        </div>
      </div>

      {/* Summary */}
      <AuditSummaryBar audits={audits} />

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || "all"}
            type="button"
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
            }}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === filter.value
                ? "bg-[#A41821] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

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
            {error?.message || "Unable to load audits"}
          </p>
        </div>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <>
          {audits.length === 0 ? (
            <AuditEmptyState
              title="No audits found"
              description={
                statusFilter
                  ? `No audits with status "${statusFilter}".`
                  : "Start your first field audit from the assignments page."
              }
              action={
                <button
                  type="button"
                  onClick={() => navigate("/progress")}
                  className="rounded-xl bg-[#A41821] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#7F1219]"
                >
                  Go to assignments
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {audits.map((audit) => (
                <AuditCard key={audit.id} audit={audit} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
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
