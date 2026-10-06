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

const paramsFrom = (req) => ({
  surveyPeriodId: req.query.surveyPeriodId || undefined,
  rangeType: req.query.rangeType || undefined,
  startDate: req.query.startDate || undefined,
  endDate: req.query.endDate || undefined,
  storeId: req.query.storeId || undefined,
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