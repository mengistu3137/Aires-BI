import { apiClient } from "../client.js";

/**
 * Fetch Groq AI pricing summary (Daily 20 Fresh, Weekly 100 FMCG, or Combined)
 */
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
      surveyPeriodId: surveyPeriodId || undefined,
      rangeType: rangeType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      reportType: reportType || undefined,
      forceRefresh,
    },
  });
  return response.data?.data;
};

/**
 * Download editable Word Document (.docx)
 */
export const downloadAiDocxReportRequest = async ({
  surveyPeriodId,
  rangeType,
  startDate,
  endDate,
  reportType,
}) => {
  const response = await apiClient.get("/reports/ai-docx", {
    params: {
      surveyPeriodId: surveyPeriodId || undefined,
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

/**
 * Downloads a report file as a Blob.
 */
export const downloadReportRequest = async (
  format,
  { surveyPeriodId, rangeType, startDate, endDate, storeId, reportType },
) => {
  const endpoint = format === "pdf" ? "pdf" : "excel";

  const res = await apiClient.get(`/reports/${endpoint}`, {
    params: {
      surveyPeriodId: surveyPeriodId || undefined,
      rangeType: rangeType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      storeId: storeId || undefined,
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