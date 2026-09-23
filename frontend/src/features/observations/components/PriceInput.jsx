import React from "react";

export const PriceInput = ({ value, onChange, disabled = false, error, currency = "ETB" }) => {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Price
      </label>
      <div className="relative mt-1.5">
        <input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className={`w-full rounded-xl border bg-slate-50/70 px-3.5 py-2.5 pr-14 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition focus:bg-white focus:outline-hidden focus:ring-1 disabled:opacity-50 ${
            error
              ? "border-[#A41821] focus:border-[#A41821] focus:ring-[#A41821]"
              : "border-slate-200 focus:border-[#A41821] focus:ring-[#A41821]"
          }`}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
          {currency}
        </span>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-[#A41821]">{error}</p>}
    </div>
  );
};
