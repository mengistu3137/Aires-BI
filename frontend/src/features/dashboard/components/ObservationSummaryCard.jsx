import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Observation summary from backend `byAvailability` and `byReviewStatus`.
 */
export const ObservationSummaryCard = ({ observations }) => {
  const navigate = useNavigate();

  if (!observations) return null;

  const byAvailability = observations.byAvailability || {};
  const byReview = observations.byReviewStatus || {};

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Observations
        </h2>
        <button
          type="button"
          onClick={() => navigate("/audits")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          Review observations
        </button>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Availability
        </p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          <div>
            <p className="text-[10px] font-medium text-slate-500">Available</p>
            <p className="mt-0.5 text-sm font-black text-[#017C4D]">
              {byAvailability.AVAILABLE ?? 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500">Out of stock</p>
            <p className="mt-0.5 text-sm font-black text-[#A41821]">
              {byAvailability.OUT_OF_STOCK ?? 0}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500">Not found</p>
            <p className="mt-0.5 text-sm font-black text-slate-700">
              {byAvailability.NOT_FOUND ?? 0}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Review</p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          <div>
            <p className="text-[10px] font-medium text-slate-500">Pending</p>
            <p className="mt-0.5 text-sm font-black text-[#FE7914]">{byReview.PENDING ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500">Approved</p>
            <p className="mt-0.5 text-sm font-black text-[#017C4D]">{byReview.APPROVED ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500">Rejected</p>
            <p className="mt-0.5 text-sm font-black text-[#A41821]">{byReview.REJECTED ?? 0}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500">Review</p>
            <p className="mt-0.5 text-sm font-black text-[#FE7914]">{byReview.NEEDS_REVIEW ?? 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
