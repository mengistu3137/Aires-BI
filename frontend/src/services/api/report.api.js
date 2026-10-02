// src/services/api/report.api.js
// ⚠️ Adjust this import to your project's configured axios instance
// (the one that already adds the auth token / base URL "/api/v1").
import { apiClient } from "../client.js";

// Matches the backend router mount: /api/v1/reports/(summary|pdf|excel)
// If you mounted it as "/reports/observations", change it here only.
const REPORTS_BASE = "/reports";

const FILE_ENDPOINTS = {
  pdf: "pdf",
  excel: "excel",
};

const parseFilename = (contentDisposition) => {
  if (!contentDisposition) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(contentDisposition);
  return plain ? plain[1] : null;
};

/**
 * Downloads a report file as a Blob.
 * @param {"pdf"|"excel"} format
 * @param {{
 *   surveyPeriodId: string,
 *   storeId?: string,
 *   reportType?: "FRESH_CORNER"|"ULTRA_SENSITIVE"
 * }} params  reportType omitted = both reports in one file
 * @returns {Promise<{ blob: Blob, filename: string|null }>}
 */
export const downloadReportRequest = async (format, { surveyPeriodId, storeId, reportType }) => {
  const endpoint = FILE_ENDPOINTS[format];
  if (!endpoint) throw new Error(`Unsupported report format: ${format}`);

  const res = await apiClient.get(`${REPORTS_BASE}/${endpoint}`, {
    params: {
      surveyPeriodId,
      ...(storeId ? { storeId } : {}),
      ...(reportType ? { reportType } : {}),
    },
    responseType: "blob",
  });

  // Works whether or not your axios interceptor unwraps `response.data`
  const blob = res instanceof Blob ? res : res.data;
  const filename = parseFilename(res?.headers?.["content-disposition"]);

  return { blob, filename };
};

/**
 * With responseType "blob", error bodies arrive as a Blob too.
 * This extracts the server's JSON `message` when present.
 */
export const readReportError = async (err) => {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      if (json?.message) return json.message;
    } catch {
      /* ignore */
    }
  }
  return data?.message || err?.message || "Failed to generate report";
};
