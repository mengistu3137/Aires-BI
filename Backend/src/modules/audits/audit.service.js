import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  calculateDistanceMeters,
  isWithinAuditRadius,
  canTransitionAuditStatus,
  formatAuditResponse,
} from "./audit.helper.js";

const AUDIT_INCLUDE_RELATIONS = {
  assignment: {
    select: {
      id: true,
      status: true,
      assignedAt: true,
      items: {
        select: {
          id: true,
          productId: true,
          required: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: true,
              unit: true,
            },
          },
        },
      },
    },
  },
  auditor: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      area: true,
      type: true,
      latitude: true,
      longitude: true,
      competitor: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
    },
  },
  surveyPeriod: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      status: true,
    },
  },
  _count: {
    select: {
      observations: true,
    },
  },
};

/**
 * Validates whether required items on the assignment have recorded observations.
 * Isolated here so the PriceObservation module integrates cleanly.
 */
export const checkAssignmentItemsCompleteness = async (
  auditId,
  assignmentId,
) => {
  const requiredItems = await prisma.assignmentItem.findMany({
    where: { assignmentId, required: true },
    select: { productId: true },
  });

  if (requiredItems.length === 0) {
    return { isComplete: true, missingProductIds: [] };
  }

  const recordedObservations = await prisma.priceObservation.findMany({
    where: { auditId },
    select: { productId: true },
  });

  const observedProductIds = new Set(
    recordedObservations.map((o) => o.productId),
  );
  const missingProductIds = requiredItems
    .filter((item) => !observedProductIds.has(item.productId))
    .map((item) => item.productId);

  return {
    isComplete: missingProductIds.length === 0,
    missingProductIds,
  };
};

/**
 * Create an Audit strictly from an existing SurveyAssignment.
 * Guarantees derived values: auditorId, storeId, surveyPeriodId.
 */
export const createAuditForAssignment = async ({
  assignmentId,
  user,
  notes,
}) => {
  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      store: true,
      surveyPeriod: true,
      auditor: true,
    },
  });

  if (!assignment) {
    throw new ApiError(404, "Survey assignment not found");
  }

  // Authorization: FIELD_AUDITOR can only create an audit for their own assignment
  if (user.role === "FIELD_AUDITOR" && assignment.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You are not assigned to this survey assignment",
    );
  }

  if (assignment.status === "CANCELLED") {
    throw new ApiError(
      400,
      "Cannot create an audit for a cancelled assignment",
    );
  }

  if (assignment.status === "COMPLETED") {
    throw new ApiError(400, "Assignment is already marked completed");
  }

  if (!assignment.store.active) {
    throw new ApiError(400, "Cannot audit an inactive store");
  }

  if (!assignment.auditor.active) {
    throw new ApiError(403, "The auditor assigned to this visit is inactive");
  }

  if (assignment.surveyPeriod.status === "CLOSED") {
    throw new ApiError(
      400,
      "Survey period is closed. Audits can no longer be created",
    );
  }

  if (assignment.surveyPeriod.status === "DRAFT") {
    throw new ApiError(
      400,
      "Survey period is still in draft state and is not operational",
    );
  }

  // Prevent duplicate active audits (Idempotency)
  const existingActiveAudit = await prisma.audit.findFirst({
    where: {
      assignmentId,
      status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
    },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  if (existingActiveAudit) {
    // Idempotent recovery for offline retries
    return formatAuditResponse(existingActiveAudit);
  }

  const createdAudit = await prisma.audit.create({
    data: {
      assignmentId: assignment.id,
      auditorId: assignment.auditorId,
      storeId: assignment.storeId,
      surveyPeriodId: assignment.surveyPeriodId,
      status: "NOT_STARTED",
      notes: notes?.trim() || null,
    },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  return formatAuditResponse(createdAudit);
};

/**
 * Start an Audit visit with captured GPS coordinates.
 */
export const startAudit = async ({
  auditId,
  user,
  latitude,
  longitude,
  accuracyMeters,
}) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      store: true,
      surveyPeriod: true,
      assignment: true,
    },
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot start another auditor's visit",
    );
  }

  if (!canTransitionAuditStatus(audit.status, "IN_PROGRESS")) {
    throw new ApiError(
      409,
      `Cannot start audit in current status [${audit.status}]. Valid transitions: NOT_STARTED -> IN_PROGRESS`,
    );
  }

  if (audit.surveyPeriod.status === "CLOSED") {
    throw new ApiError(400, "Survey period is closed. Cannot start audit");
  }

  if (!audit.store.active) {
    throw new ApiError(400, "Target store is deactivated");
  }

  const parsedLat = Number(latitude);
  const parsedLon = Number(longitude);
  const parsedAccuracy =
    accuracyMeters !== undefined && accuracyMeters !== null
      ? Number(accuracyMeters)
      : null;

  let distanceFromStoreMeters = null;
  let gpsValid = null;

  if (audit.store.latitude !== null && audit.store.longitude !== null) {
    const storeLat = Number(audit.store.latitude);
    const storeLon = Number(audit.store.longitude);

    distanceFromStoreMeters = calculateDistanceMeters(
      parsedLat,
      parsedLon,
      storeLat,
      storeLon,
    );

    gpsValid = isWithinAuditRadius({
      distanceMeters: distanceFromStoreMeters,
      accuracyMeters: parsedAccuracy,
    });
  }

  const [updatedAudit] = await prisma.$transaction([
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        startLatitude: parsedLat,
        startLongitude: parsedLon,
        startAccuracyMeters: parsedAccuracy,
        distanceFromStoreMeters:
          distanceFromStoreMeters !== null
            ? distanceFromStoreMeters
            : undefined,
        gpsValid,
      },
      include: AUDIT_INCLUDE_RELATIONS,
    }),
    prisma.surveyAssignment.update({
      where: { id: audit.assignmentId },
      data: {
        status: "IN_PROGRESS",
        startedAt: audit.assignment.startedAt ?? new Date(),
      },
    }),
  ]);

  return formatAuditResponse(updatedAudit);
};

/**
 * Update permitted mutable fields (only notes) while IN_PROGRESS.
 */
export const updateAudit = async ({ auditId, user, notes }) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot modify another auditor's visit",
    );
  }

  if (audit.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      `Audit notes can only be updated while IN_PROGRESS. Current status: [${audit.status}]`,
    );
  }

  const updatedAudit = await prisma.audit.update({
    where: { id: auditId },
    data: {
      notes: notes !== undefined ? notes?.trim() : audit.notes,
    },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  return formatAuditResponse(updatedAudit);
};

/**
 * Complete an Audit visit with end GPS data and integrity verification.
 */
export const completeAudit = async ({
  auditId,
  user,
  latitude,
  longitude,
  accuracyMeters,
  notes,
}) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      store: true,
      assignment: true,
    },
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot complete another auditor's visit",
    );
  }

  if (!canTransitionAuditStatus(audit.status, "COMPLETED")) {
    throw new ApiError(
      409,
      `Cannot complete audit from status [${audit.status}]. Must be IN_PROGRESS.`,
    );
  }

  // Completeness check for required assignment items
  const completeness = await checkAssignmentItemsCompleteness(
    audit.id,
    audit.assignmentId,
  );

  // If completion enforcement is enabled via environment variable
  const ENFORCE_OBSERVATIONS =
    process.env.AUDIT_ENFORCE_OBSERVATIONS === "true";
  if (ENFORCE_OBSERVATIONS && !completeness.isComplete) {
    throw new ApiError(
      400,
      "Cannot complete audit: missing required product observations",
      {
        missingProductIds: completeness.missingProductIds,
      },
    );
  }

  const parsedLat =
    latitude !== undefined && latitude !== null ? Number(latitude) : null;
  const parsedLon =
    longitude !== undefined && longitude !== null ? Number(longitude) : null;
  const parsedAccuracy =
    accuracyMeters !== undefined && accuracyMeters !== null
      ? Number(accuracyMeters)
      : null;

  const mergedNotes = notes?.trim()
    ? audit.notes
      ? `${audit.notes}\n[Completion Note]: ${notes.trim()}`
      : notes.trim()
    : audit.notes;

  const [completedAudit] = await prisma.$transaction([
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        endLatitude: parsedLat,
        endLongitude: parsedLon,
        endAccuracyMeters: parsedAccuracy,
        notes: mergedNotes,
      },
      include: AUDIT_INCLUDE_RELATIONS,
    }),
    prisma.surveyAssignment.update({
      where: { id: audit.assignmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    }),
  ]);

  return formatAuditResponse(completedAudit);
};

/**
 * Cancel an Audit visit without physical deletion.
 */
export const cancelAudit = async ({ auditId, user, reason }) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot cancel another auditor's visit",
    );
  }

  if (!canTransitionAuditStatus(audit.status, "CANCELLED")) {
    throw new ApiError(
      409,
      `Cannot cancel audit with status [${audit.status}]. Completed audits cannot be cancelled.`,
    );
  }

  const updatedNotes = audit.notes
    ? `${audit.notes}\n[CANCELLED: ${reason.trim()}]`
    : `[CANCELLED: ${reason.trim()}]`;

  const [cancelledAudit] = await prisma.$transaction([
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: "CANCELLED",
        notes: updatedNotes,
      },
      include: AUDIT_INCLUDE_RELATIONS,
    }),
    prisma.surveyAssignment.update({
      where: { id: audit.assignmentId },
      data: {
        status: "CANCELLED",
      },
    }),
  ]);

  return formatAuditResponse(cancelledAudit);
};

/**
 * Transition Audit to NEEDS_REVIEW (Manager / Admin supervisor review).
 */
export const markAuditNeedsReview = async ({ auditId, user, reviewNote }) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (!canTransitionAuditStatus(audit.status, "NEEDS_REVIEW")) {
    throw new ApiError(
      409,
      `Cannot flag audit as NEEDS_REVIEW from status [${audit.status}].`,
    );
  }

  const reviewerTag = `[NEEDS_REVIEW by ${user.name} (${user.role})]: ${reviewNote.trim()}`;
  const updatedNotes = audit.notes
    ? `${audit.notes}\n${reviewerTag}`
    : reviewerTag;

  const updatedAudit = await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "NEEDS_REVIEW",
      notes: updatedNotes,
    },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  return formatAuditResponse(updatedAudit);
};

/**
 * Get single audit by ID with full relational details.
 */
export const getAuditById = async ({ auditId, user }) => {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  if (!audit) {
    throw new ApiError(404, "Audit record not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You can only view your own audits",
    );
  }

  return formatAuditResponse(audit);
};

/**
 * Get current active visit for the authenticated field auditor.
 */
export const getCurrentAudit = async (user) => {
  const activeAudits = await prisma.audit.findMany({
    where: {
      auditorId: user.id,
      status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
    },
    orderBy: { createdAt: "desc" },
    include: AUDIT_INCLUDE_RELATIONS,
  });

  if (activeAudits.length === 0) {
    return null;
  }

  // If bad historical data has multiple in-flight audits, prioritize IN_PROGRESS
  const inProgressAudit = activeAudits.find((a) => a.status === "IN_PROGRESS");
  const selectedAudit = inProgressAudit || activeAudits[0];

  return formatAuditResponse(selectedAudit);
};

/**
 * List audits with pagination and ownership filters.
 */
export const listAudits = async ({ user, query }) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    status,
    assignmentId,
    storeId,
    surveyPeriodId,
    auditorId,
    from,
    to,
  } = query;

  // Explicitly parse and sanitize pagination numbers to prevent PrismaClientValidationError
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));

  const where = {};

  // Field auditors can only view their own audits
  if (user.role === "FIELD_AUDITOR") {
    where.auditorId = user.id;
  } else if (auditorId) {
    where.auditorId = auditorId;
  }

  if (status) {
    where.status = status;
  }

  if (assignmentId) {
    where.assignmentId = assignmentId;
  }

  if (storeId) {
    where.storeId = storeId;
  }

  if (surveyPeriodId) {
    where.surveyPeriodId = surveyPeriodId;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      where.createdAt.lte = toDate;
    }
  }

  const skip = (page - 1) * limit;

  const [total, audits] = await prisma.$transaction([
    prisma.audit.count({ where }),
    prisma.audit.findMany({
      where,
      skip,
      take: limit, // Explicit integer guarantees valid Prisma execution
      orderBy: { createdAt: "desc" },
      include: AUDIT_INCLUDE_RELATIONS,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: audits.map(formatAuditResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

export const auditService = {
  createAuditForAssignment,
  startAudit,
  updateAudit,
  completeAudit,
  cancelAudit,
  markAuditNeedsReview,
  getAuditById,
  getCurrentAudit,
  listAudits,
  checkAssignmentItemsCompleteness,
};
