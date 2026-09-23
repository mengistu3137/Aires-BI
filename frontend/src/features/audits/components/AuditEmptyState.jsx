import React from "react";

export const AuditEmptyState = ({
  title = "No audits found",
  description = "There are no audit records matching your current filters.",
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
