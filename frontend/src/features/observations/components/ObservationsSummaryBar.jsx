import React from "react";

/**
 * Compact per-page summary of observations.
 * Counts only what's loaded on the current page.
 */
export const ObservationsSummaryBar = ({ observations = [], meta = null }) => {
  const counts = {
    total: observations.length,
    available: 0,
    outOfStock: 0,
    notFound: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    needsReview: 0,
  };

  for (const o of observations) {
    if (o.availability === "AVAILABLE") counts.available += 1;
    if (o.availability === "OUT_OF_STOCK") counts.outOfStock += 1;
    if (o.availability === "NOT_FOUND") counts.notFound += 1;

    if (o.review?.status === "PENDING") counts.pending += 1;
    if (o.review?.status === "APPROVED") counts.approved += 1;
    if (o.review?.status === "REJECTED") counts.rejected += 1;
    if (o.review?.status === "NEEDS_REVIEW") counts.needsReview += 1;
  }

  const showPageNote = meta && meta.total > observations.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          This page
        </span>
        <Stat label="Available" value={counts.available} tone="text-[#017C4D]" />
        <Stat label="Out of stock" value={counts.outOfStock} tone="text-[#A41821]" />
        <Stat label="Not found" value={counts.notFound} tone="text-slate-600" />
        <Stat label="Pending" value={counts.pending} tone="text-[#FE7914]" />
        <Stat label="Approved" value={counts.approved} tone="text-[#017C4D]" />
        <Stat label="Rejected" value={counts.rejected} tone="text-[#A41821]" />
        {showPageNote && (
          <span className="ml-auto text-[10px] text-slate-400">
            {observations.length} of {meta.total}
          </span>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-[10px] font-semibold text-slate-500">{label}</span>
    <span className={`text-xs font-black ${tone}`}>{value}</span>
  </div>
);
