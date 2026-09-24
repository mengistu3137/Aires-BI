import React, { useState } from "react";
import { useAuditHistory } from "../hooks/useAudits.js";
import { AuditCard } from "../components/AuditCard.jsx";
import { AuditEmptyState } from "../components/AuditEmptyState.jsx";

export const AuditHistoryPage = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error } = useAuditHistory({
    page,
    limit: 20,
  });

  const audits = data?.audits || [];
  const meta = data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-black text-slate-800">Audit history</h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Completed field audit visits across all survey periods.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#A41821] border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-[#A41821]">
            {error?.message || "Unable to load audit history"}
          </p>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {audits.length === 0 ? (
            <AuditEmptyState
              title="No completed audits"
              description="Completed field visits will appear here."
            />
          ) : (
            <div className="space-y-3">
              {audits.map((audit) => (
                <AuditCard key={audit.id} audit={audit} />
              ))}
            </div>
          )}

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
