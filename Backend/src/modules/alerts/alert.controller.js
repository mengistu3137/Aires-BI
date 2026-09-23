import { alertService } from "./alert.service.js";

export const getAlertById = async (req, res, next) => {
  try {
    const alert = await alertService.getAlertById(req.params.id);
    res.status(200).json({
      status: "success",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const listAlerts = async (req, res, next) => {
  try {
    const result = await alertService.listAlerts(req.query);
    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveAlerts = async (req, res, next) => {
  try {
    req.query.resolved = "false";
    const result = await alertService.listAlerts(req.query);
    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const resolveAlert = async (req, res, next) => {
  try {
    const alert = await alertService.resolveAlert({
      alertId: req.params.id,
      user: req.user,
      resolutionNote: req.body?.resolutionNote,
    });

    res.status(200).json({
      status: "success",
      message: "Alert resolved successfully",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAlertsForSurveyPeriod = async (req, res, next) => {
  try {
    const result = await alertService.generateAlertsForSurveyPeriod(
      req.body.surveyPeriodId,
    );

    res.status(200).json({
      status: "success",
      message: "Survey period alert generation completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const generateAlertForAnalysis = async (req, res, next) => {
  try {
    const alert = await alertService.createAlertFromPriceAnalysis(
      req.body.priceAnalysisId,
    );

    res.status(200).json({
      status: "success",
      message: alert
        ? "Alert created or updated successfully"
        : "No alert condition required for this analysis",
      data: alert,
    });
  } catch (error) {
    next(error);
  }
};

export const alertController = {
  getAlertById,
  listAlerts,
  getActiveAlerts,
  resolveAlert,
  generateAlertsForSurveyPeriod,
  generateAlertForAnalysis,
};
