import React from "react";

export const AuditSummaryBar = ({ audits = [] }) => {
  const stats = audits.reduce(
    (acc, audit) => {
      acc.total += 1;
      if (audit.status === "COMPLETED") acc.completed += 1;
      else if (audit.status === "IN_PROGRESS") acc.inProgress += 1;
      else if (audit.status === "NEEDS_REVIEW") acc.needsReview += 1;
      else if (audit.status === "CANCELLED") acc.cancelled += 1;
      else acc.notStarted += 1;
      return acc;
    },
    { total: 0, completed: 0, inProgress: 0, needsReview: 0, cancelled: 0, notStarted: 0 }
  );

  const items = [
    { label: "Total", value: stats.total, color: "text-slate-800" },
    { label: "In Progress", value: stats.inProgress, color: "text-blue-600" },
    { label: "Completed", value: stats.completed, color: "text-[#017C4D]" },
    { label: "Needs Review", value: stats.needsReview, color: "text-[#FE7914]" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {item.label}
          </p>
          <p className={`mt-0.5 text-xl font-black ${item.color}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
};
