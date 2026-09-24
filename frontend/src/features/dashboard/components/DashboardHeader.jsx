import React from "react";

export const DashboardHeader = ({ roleScope }) => {
  const isAuditor = roleScope === "FIELD_AUDITOR";

  return (
    <div>
      <h1 className="text-lg font-black text-slate-800">Dashboard</h1>
      <p className="mt-0.5 text-xs text-slate-500">
        {isAuditor
          ? "Your active assignments, audits, and field progress."
          : "Monitor field activity, pricing intelligence, and alerts from one place."}
      </p>
    </div>
  );
};
