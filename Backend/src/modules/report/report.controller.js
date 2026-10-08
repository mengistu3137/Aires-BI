import { observationReportService } from "./report.service.js";

const sendFile = (res, { buffer, filename, contentType }) => {
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.setHeader("Content-Length", buffer.length);
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(buffer);
};

/**
 * Safely normalizes a query value that may be a string, an array, or
 * undefined into a clean array of strings (or undefined).
 * - "a"        → ["a"]
 * - "a,b,c"    → ["a","b","c"]
 * - ["a","b"]  → ["a","b"]
 * - "" / null  → undefined
 */
const toIdArray = (value) => {
  if (value === undefined || value === null) return undefined;
  const raw = Array.isArray(value) ? value : String(value).split(",");
  const cleaned = raw.map((v) => String(v ?? "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
};

const paramsFrom = (req) => ({
  surveyPeriodId: toIdArray(req.query.surveyPeriodId),
  rangeType: req.query.rangeType || undefined,
  startDate: req.query.startDate || undefined,
  endDate: req.query.endDate || undefined,
  storeId: toIdArray(req.query.storeId),
  reportType: req.query.reportType || undefined,
  forceRefresh:
    req.query.forceRefresh === "true" || req.query.forceRefresh === true,
  user: req.user,
});

export const getAiSummary = async (req, res, next) => {
  try {
    const summary = await observationReportService.getAiReportSummary(
      paramsFrom(req),
    );
    res.status(200).json({ status: "success", data: summary });
  } catch (error) {
    next(error);
  }
};

export const downloadAiDocxReport = async (req, res, next) => {
  try {
    const file = await observationReportService.generateAiObservationReportDocx(
      paramsFrom(req),
    );
    sendFile(res, file);
  } catch (error) {
    next(error);
  }
};

export const getReportSummary = async (req, res, next) => {
  try {
    const result = await observationReportService.getObservationReportSummary(
      paramsFrom(req),
    );

    res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const downloadPdfReport = async (req, res, next) => {
  try {
    const file = await observationReportService.generateObservationReportPdf(
      paramsFrom(req),
    );

    sendFile(res, file);
  } catch (error) {
    next(error);
  }
};

export const downloadExcelReport = async (req, res, next) => {
  try {
    const file = await observationReportService.generateObservationReportExcel(
      paramsFrom(req),
    );

    sendFile(res, file);
  } catch (error) {
    next(error);
  }
};

export const observationReportController = {
  getReportSummary,
  downloadPdfReport,
  downloadExcelReport,
  getAiSummary,
  downloadAiDocxReport,
};