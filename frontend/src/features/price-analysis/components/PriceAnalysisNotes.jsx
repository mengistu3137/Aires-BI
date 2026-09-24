import React from "react";

export const PriceAnalysisNotes = ({ notes, className = "" }) => {
  if (!notes) return null;

  return (
    <div className={`rounded-xl bg-slate-50 p-3 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{notes}</p>
    </div>
  );
};
