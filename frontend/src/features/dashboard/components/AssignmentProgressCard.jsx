import React from "react";
import { useNavigate } from "react-router-dom";
import { formatCompletionRate } from "../utils/dashboard.utils.js";

/**
 * Assignment progress. Uses backend-provided `completionRate`.
 */
export const AssignmentProgressCard = ({ assignments }) => {
  const navigate = useNavigate();

  if (!assignments) return null;

  const byStatus = assignments.byStatus || {};
  const rows = [
    { key: "NOT_STARTED", label: "Not started", tone: "bg-slate-400" },
    { key: "IN_PROGRESS", label: "In progress", tone: "bg-blue-500" },
    { key: "COMPLETED", label: "Completed", tone: "bg-[#017C4D]" },
    { key: "CANCELLED", label: "Cancelled", tone: "bg-[#A41821]" },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Assignment progress
        </h2>
        <button
          type="button"
          onClick={() => navigate("/progress")}
          className="text-[11px] font-bold text-[#A41821] hover:underline"
        >
          View assignments
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-800">
          {formatCompletionRate(assignments.completionRate)}
        </span>
        <span className="text-[11px] font-medium text-slate-500">completed</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${row.tone}`} />
            <span className="text-[10px] font-medium text-slate-500">{row.label}</span>
            <span className="ml-auto text-xs font-black text-slate-700">
              {byStatus[row.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
