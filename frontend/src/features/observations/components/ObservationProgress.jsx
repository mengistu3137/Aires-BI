import React from "react";

export const ObservationProgress = ({ observed = 0, total = 0, className = "" }) => {
  const percentage = total > 0 ? Math.min(100, Math.round((observed / total) * 100)) : 0;
  const isComplete = total > 0 && observed >= total;

  return (
    <div className={className}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-600">
          {observed} of {total} products observed
        </span>
        <span className={`font-bold ${isComplete ? "text-[#017C4D]" : "text-slate-700"}`}>
          {percentage}%
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isComplete ? "bg-[#017C4D]" : "bg-[#A41821]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
