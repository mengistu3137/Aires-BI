import { surveyService } from "./survey.service.js";

export const getActivePeriod = async (req, res, next) => {
  try {
    const period = await surveyService.getActivePeriod();
    res.status(200).json({ status: "success", data: { period } });
  } catch (error) {
    next(error);
  }
};

export const createPeriod = async (req, res, next) => {
  try {
    const period = await surveyService.createPeriod(req.body);
    res.status(201).json({ status: "success", data: { period } });
  } catch (error) {
    next(error);
  }
};

export const getAllPeriods = async (req, res, next) => {
  try {
    const periods = await surveyService.getAllPeriods();
    res.status(200).json({
      status: "success",
      results: periods.length,
      data: { periods },
    });
  } catch (error) {
    next(error);
  }
};

export const getAssignments = async (req, res, next) => {
  try {
    const assignments = await surveyService.getAssignments({
      auditorId:
        req.user.role === "FIELD_AUDITOR" ? req.user.id : req.query.auditorId,
      periodId: req.query.periodId,
      role: req.user.role,
    });
    res
      .status(200)
      .json({
        status: "success",
        results: assignments.length,
        data: { assignments },
      });
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (req, res, next) => {
  try {
    const assignment = await surveyService.createAssignment(req.body);
    res
      .status(201)
      .json({
        status: "success",
        message: "Assignment created",
        data: { assignment },
      });
  } catch (error) {
    next(error);
  }
};

export const updateAssignmentStatus = async (req, res, next) => {
  try {
    const assignment = await surveyService.updateAssignmentStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    res.status(200).json({ status: "success", data: { assignment } });
  } catch (error) {
    next(error);
  }
};

export const submitEntry = async (req, res, next) => {
  try {
    const entry = await surveyService.submitEntry(req.user.id, req.body);
    res
      .status(201)
      .json({ status: "success", message: "Price recorded", data: { entry } });
  } catch (error) {
    next(error);
  }
};

export const syncBatch = async (req, res, next) => {
  try {
    const summary = await surveyService.syncBatchEntries(
      req.user.id,
      req.body.entries,
    );
    res
      .status(200)
      .json({ status: "success", message: "Batch synced", data: summary });
  } catch (error) {
    next(error);
  }
};

export const surveyController = {
  getActivePeriod,
  createPeriod,
  getAssignments,
  createAssignment,
  updateAssignmentStatus,
  submitEntry,
  syncBatch,
};
