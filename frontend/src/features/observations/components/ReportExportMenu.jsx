// src/features/observations/components/ReportExportMenu.jsx
import React, { useEffect, useRef, useState } from "react";

const Spinner = () => (
  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
);

const FileIcon = ({ className = "" }) => (
  <svg
    className={`h-4 w-4 ${className}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 10v6m0 0l-3-3m3 3l3-3M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
    />
  </svg>
);

/**
 * Export dropdown (PDF / Excel).
 * Props:
 *  - surveyPeriodId: required to enable the menu
 *  - scopeLabel: e.g. "All stores" or the selected store's name
 *  - periodLabel: human-readable period name
 *  - onDownload(format): "pdf" | "excel"
 *  - downloading: null | "pdf" | "excel"
 *  - disabled: extra disable flag (e.g. offline)
 */
export const ReportExportMenu = ({
  surveyPeriodId,
  scopeLabel,
  periodLabel,
  onDownload,
  downloading = null,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const needsPeriod = !surveyPeriodId;
  const busy = Boolean(downloading);
  const isDisabled = disabled || needsPeriod || busy;

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handle = (format) => {
    setOpen(false);
    onDownload(format);
  };

  const options = [
    {
      format: "pdf",
      label: "Download PDF",
      hint: "Formatted report for printing",
      color: "text-[#A41821]",
    },
    {
      format: "excel",
      label: "Download Excel",
      hint: "Spreadsheet with all data",
      color: "text-emerald-700",
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isDisabled}
        aria-haspopup="menu"
        aria-expanded={open}
        title={needsPeriod ? "Select a survey period to export a report" : undefined}
        className="inline-flex items-center gap-2 rounded-xl bg-[#A41821] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#8a1219] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Spinner /> : <FileIcon />}
        {busy ? "Generating…" : "Export report"}
        {!busy && (
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Report scope
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">{periodLabel}</p>
            <p className="truncate text-[11px] text-slate-500">{scopeLabel}</p>
          </div>

          {options.map((opt) => (
            <button
              key={opt.format}
              type="button"
              role="menuitem"
              onClick={() => handle(opt.format)}
              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left transition hover:bg-slate-50"
            >
              <FileIcon className={`mt-0.5 ${opt.color}`} />
              <span>
                <span className="block text-xs font-bold text-slate-800">{opt.label}</span>
                <span className="block text-[11px] text-slate-500">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
