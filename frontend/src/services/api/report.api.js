import { apiClient } from "../client.js";

/**
 * Serialize a value that may be a string, an array, or undefined into a
 * comma-separated string (or undefined).
 */
const joinIds = (value) => {
  if (value === undefined || value === null) return undefined;
  if (Array.isArray(value)) {
    const cleaned = value.map((v) => String(v ?? "").trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned.join(",") : undefined;
  }
  const s = String(value).trim();
  return s ? s : undefined;
};

export const getAiReportSummaryRequest = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  reportType,
  forceRefresh = false,
}) => {
  const response = await apiClient.get("/reports/ai-summary", {
    params: {
      surveyPeriodId: joinIds(surveyPeriodId),
      rangeType: rangeType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      reportType: reportType || undefined,
      forceRefresh,
    },
  });
  return response.data?.data;
};

export const downloadAiDocxReportRequest = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  reportType,
}) => {
  const response = await apiClient.get("/reports/ai-docx", {
    params: {
      surveyPeriodId: joinIds(surveyPeriodId),
      rangeType: rangeType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      reportType: reportType || undefined,
    },
    responseType: "blob",
    timeout: 3 * 60 * 1000,
  });

  const disposition = response.headers?.["content-disposition"] || "";
  const match = /filename="?([^"]+)"?/.exec(disposition);
  const filename = match?.[1] || `Queens_Price_Report_${Date.now()}.docx`;

  return { blob: response.data, filename };
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

export const downloadReportRequest = async (
  format,
  { surveyPeriodId, rangeType, startDate, endDate, storeId, reportType },
) => {
  const endpoint = format === "pdf" ? "pdf" : "excel";

  const res = await apiClient.get(`/reports/${endpoint}`, {
    params: {
      surveyPeriodId: joinIds(surveyPeriodId),
      rangeType: rangeType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      storeId: joinIds(storeId),
      reportType: reportType || undefined,
    },
    responseType: "blob",
  });

  const blob = res instanceof Blob ? res : res.data;
  const filename = parseFilename(res?.headers?.["content-disposition"]);

  return { blob, filename };
};

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