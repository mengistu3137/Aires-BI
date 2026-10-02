import { observationReportService } from "./report.service.js";

const sendFile = (res, { buffer, filename, contentType }) => {
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
  );
  res.setHeader("Content-Length", buffer.length);
  // Lets browser clients (fetch/axios) read the filename from the response
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).end(buffer);
};

export const getReportSummary = async (req, res, next) => {
  try {
    const result = await observationReportService.getObservationReportSummary({
      surveyPeriodId: req.query.surveyPeriodId,
      storeId: req.query.storeId,
      user: req.user,
    });

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
    const file = await observationReportService.generateObservationReportPdf({
      surveyPeriodId: req.query.surveyPeriodId,
      storeId: req.query.storeId,
      user: req.user,
    });

    sendFile(res, file);
  } catch (error) {
    next(error);
  }
};

export const downloadExcelReport = async (req, res, next) => {
  try {
    const file = await observationReportService.generateObservationReportExcel({
      surveyPeriodId: req.query.surveyPeriodId,
      storeId: req.query.storeId,
      user: req.user,
    });

    sendFile(res, file);
  } catch (error) {
    next(error);
  }
};

export const observationReportController = {
  getReportSummary,
  downloadPdfReport,
  downloadExcelReport,
};
