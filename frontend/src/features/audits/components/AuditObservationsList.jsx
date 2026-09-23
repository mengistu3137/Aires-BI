import React from "react";
import { AuditObservationRow } from "./AuditObservationRow.jsx";

export const AuditObservationsList = ({ observations = [] }) => {
  if (observations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
        <p className="text-xs font-medium text-slate-400">No observations recorded yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {observations.map((observation) => (
        <AuditObservationRow key={observation.id} observation={observation} />
      ))}
    </div>
  );
};
