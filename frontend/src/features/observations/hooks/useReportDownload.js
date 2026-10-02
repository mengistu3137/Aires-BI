// src/features/observations/hooks/useReportDownload.js
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { downloadReportRequest, readReportError } from "@/services/api/report.api.js";

const EXTENSIONS = { pdf: "pdf", excel: "xlsx" };
const LABELS = { pdf: "PDF", excel: "Excel" };

const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before revoking
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

/**
 * Handles PDF / Excel report downloads for a survey period (+ optional store
 * and optional reportType: "FRESH_CORNER" | "ULTRA_SENSITIVE", omit for both).
 * `downloading` is null | "pdf" | "excel" so the UI can show per-format spinners.
 */
export const useReportDownload = () => {
  const [downloading, setDownloading] = useState(null);

  const download = useCallback(
    async (format, { surveyPeriodId, storeId, reportType }) => {
      if (!surveyPeriodId) {
        toast.error("Select a survey period first");
        return;
      }
      if (downloading) return; // one download at a time

      setDownloading(format);
      const toastId = toast.loading(`Generating ${LABELS[format]} report…`);

      try {
        const { blob, filename } = await downloadReportRequest(format, {
          surveyPeriodId,
          storeId,
          reportType,
        });
        const typeSlug = reportType ? `_${reportType.toLowerCase().replace(/_/g, "-")}` : "";
        const fallback = `price-report${typeSlug}_${new Date().toISOString().slice(0, 10)}.${EXTENSIONS[format]}`;
        saveBlob(blob, filename || fallback);
        toast.success(`${LABELS[format]} report downloaded`, { id: toastId });
      } catch (err) {
        toast.error(await readReportError(err), { id: toastId });
      } finally {
        setDownloading(null);
      }
    },
    [downloading]
  );

  return { download, downloading, isDownloading: Boolean(downloading) };
};
