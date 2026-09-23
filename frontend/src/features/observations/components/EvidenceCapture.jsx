import React, { useRef } from "react";

export const EvidenceCapture = ({ value, onChange, disabled = false, error }) => {
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create a local object URL for preview
    // In production, upload to storage and store the returned URL
    const objectUrl = URL.createObjectURL(file);
    onChange({
      file,
      previewUrl: objectUrl,
      // In a real implementation, this would be the uploaded URL
      url: objectUrl,
    });
    // Reset input so the same file can be re-selected
    event.target.value = "";
  };

  const handleRemove = () => {
    if (value?.previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange(null);
  };

  const handleRetake = () => {
    if (value?.previewUrl) {
      URL.revokeObjectURL(value.previewUrl);
    }
    inputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Evidence
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!value ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-xs font-semibold text-slate-600 transition hover:border-[#A41821] hover:bg-red-50/50 hover:text-[#A41821] disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Take photo or choose from device
        </button>
      ) : (
        <div className="mt-1.5">
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img
              src={value.previewUrl || value.url}
              alt="Evidence preview"
              className="h-48 w-full object-cover"
            />
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleRetake}
              disabled={disabled}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Retake
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#A41821] transition hover:bg-red-100 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1.5 text-xs font-medium text-[#A41821]">{error}</p>}
    </div>
  );
};
