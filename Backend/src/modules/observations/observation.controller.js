import { observationService } from "./observation.service.js";

export const createObservation = async (req, res, next) => {
  try {
    const observation = await observationService.createObservation({
      auditId: req.params.auditId,
      user: req.user,
      data: req.body,
    });

    res.status(201).json({
      status: "success",
      message: "Price observation recorded successfully",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const listAuditObservations = async (req, res, next) => {
  try {
    const result = await observationService.listAuditObservations({
      auditId: req.params.auditId,
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

export const listAllObservations = async (req, res, next) => {
  try {
    const result = await observationService.listAllObservations({
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

export const getObservationById = async (req, res, next) => {
  try {
    const observation = await observationService.getObservationById({
      observationId: req.params.observationId,
      user: req.user,
    });

    res.status(200).json({
      status: "success",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const updateObservation = async (req, res, next) => {
  try {
    const observation = await observationService.updateObservation({
      observationId: req.params.observationId,
      user: req.user,
      updates: req.body,
    });

    res.status(200).json({
      status: "success",
      message: "Price observation updated successfully",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const approveObservation = async (req, res, next) => {
  try {
    const observation = await observationService.approveObservation({
      observationId: req.params.observationId,
      reviewer: req.user,
    });

    res.status(200).json({
      status: "success",
      message: "Price observation approved successfully",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectObservation = async (req, res, next) => {
  try {
    const observation = await observationService.rejectObservation({
      observationId: req.params.observationId,
      reviewer: req.user,
      reviewNote: req.body.reviewNote,
    });

    res.status(200).json({
      status: "success",
      message: "Price observation rejected successfully",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const requestObservationReview = async (req, res, next) => {
  try {
    const observation = await observationService.requestObservationReview({
      observationId: req.params.observationId,
      reviewer: req.user,
      reviewNote: req.body.reviewNote,
    });

    res.status(200).json({
      status: "success",
      message: "Price observation flagged for review",
      data: observation,
    });
  } catch (error) {
    next(error);
  }
};

export const observationController = {
  createObservation,
  listAuditObservations,
  listAllObservations,
  getObservationById,
  updateObservation,
  approveObservation,
  rejectObservation,
  requestObservationReview,
};
