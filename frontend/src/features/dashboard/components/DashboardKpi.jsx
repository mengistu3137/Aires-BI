import React from "react";

/**
 * Compact KPI tile — not a large card.
 */
export const DashboardKpi = ({ label, value, support, tone = "default", onClick }) => {
  const toneClasses = {
    default: "text-slate-800",
    danger: "text-[#A41821]",
    warning: "text-[#FE7914]",
    success: "text-[#017C4D]",
    info: "text-blue-700",
  };

  const isClickable = typeof onClick === "function";
  const Wrapper = isClickable ? "button" : "div";

  return (
    <Wrapper
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition ${
        isClickable ? "hover:border-slate-300 hover:bg-slate-50" : ""
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-black ${toneClasses[tone] || toneClasses.default}`}>
        {value}
      </p>
      {support && <p className="mt-0.5 text-[10px] font-medium text-slate-400">{support}</p>}
    </Wrapper>
  );
};
