import { auditService } from "./audit.service.js";

export const createAudit = async (req, res, next) => {
  try {
    const audit = await auditService.createAuditForAssignment({
      assignmentId: req.params.assignmentId,
      user: req.user,
      notes: req.body?.notes,
    });

    res.status(201).json({
      status: "success",
      message: "Audit visit initialized successfully",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const startAudit = async (req, res, next) => {
  try {
    const audit = await auditService.startAudit({
      auditId: req.params.auditId,
      user: req.user,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracyMeters: req.body.accuracyMeters,
    });

    res.status(200).json({
      status: "success",
      message: "Audit visit started successfully",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const updateAudit = async (req, res, next) => {
  try {
    const audit = await auditService.updateAudit({
      auditId: req.params.auditId,
      user: req.user,
      notes: req.body.notes,
    });

    res.status(200).json({
      status: "success",
      message: "Audit visit updated successfully",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const completeAudit = async (req, res, next) => {
  try {
    const audit = await auditService.completeAudit({
      auditId: req.params.auditId,
      user: req.user,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      accuracyMeters: req.body.accuracyMeters,
      notes: req.body.notes,
    });

    res.status(200).json({
      status: "success",
      message: "Audit visit completed successfully",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelAudit = async (req, res, next) => {
  try {
    const audit = await auditService.cancelAudit({
      auditId: req.params.auditId,
      user: req.user,
      reason: req.body.reason,
    });

    res.status(200).json({
      status: "success",
      message: "Audit visit cancelled successfully",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const markAuditReview = async (req, res, next) => {
  try {
    const audit = await auditService.markAuditNeedsReview({
      auditId: req.params.auditId,
      user: req.user,
      reviewNote: req.body.reviewNote,
    });

    res.status(200).json({
      status: "success",
      message: "Audit marked for supervisor review",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditById = async (req, res, next) => {
  try {
    const audit = await auditService.getAuditById({
      auditId: req.params.auditId,
      user: req.user,
    });

    res.status(200).json({
      status: "success",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentAudit = async (req, res, next) => {
  try {
    const audit = await auditService.getCurrentAudit(req.user);

    res.status(200).json({
      status: "success",
      data: audit,
    });
  } catch (error) {
    next(error);
  }
};

export const listAudits = async (req, res, next) => {
  try {
    const result = await auditService.listAudits({
      user: req.user,
      query: req.query,
    });

    res.status(200).json({
      status: "success",
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const auditController = {
  createAudit,
  startAudit,
  updateAudit,
  completeAudit,
  cancelAudit,
  markAuditReview,
  getAuditById,
  getCurrentAudit,
  listAudits,
};
