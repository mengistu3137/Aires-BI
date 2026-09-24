import { assignmentService } from "./assignment.service.js";

/**
 * Get assignments belonging to the authenticated auditor
 */
export const getMine = async (req, res, next) => {
  try {
    const assignments = await assignmentService.getMine(req.user.id);
    res.status(200).json({
      status: "success",
      results: assignments.length,
      data: { assignments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all assignments with pagination, filtering, and metadata
 */
export const getAll = async (req, res, next) => {
  try {
    const result = await assignmentService.getAll(req.query);

    // Handles { data, meta } from service with backwards compatibility for frontend
    res.status(200).json({
      status: "success",
      results: result.data.length,
      data: { assignments: result.data },
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single assignment by ID
 */
export const getById = async (req, res, next) => {
  try {
    const assignment = await assignmentService.getById(req.params.id);
    res.status(200).json({
      status: "success",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new assignment and initialize its linked NOT_STARTED audit
 */
export const create = async (req, res, next) => {
  try {
    const assignment = await assignmentService.create(req.body);
    res.status(201).json({
      status: "success",
      message: "Assignment and initial audit visit created successfully",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update assignment and synchronize linked unstarted audit if changed before visit begins
 */
export const update = async (req, res, next) => {
  try {
    const assignment = await assignmentService.update(
      req.params.id,
      req.body,
      req.user,
    );
    res.status(200).json({
      status: "success",
      message: "Assignment updated successfully",
      data: { assignment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an assignment and its linked NOT_STARTED audit
 */
export const remove = async (req, res, next) => {
  try {
    const result = await assignmentService.remove(req.params.id, req.user);
    res.status(200).json({
      status: "success",
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

export const assignmentController = {
  getMine,
  getAll,
  getById,
  create,
  update,
  remove,
};
