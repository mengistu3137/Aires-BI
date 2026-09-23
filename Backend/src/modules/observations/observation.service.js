import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  canTransitionReviewStatus,
  validateCapturedAt,
  validateAvailabilityPriceCombination,
  formatObservationResponse,
} from "./observation.helper.js";

const OBSERVATION_INCLUDE_RELATIONS = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      category: true,
      unit: true,
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
  reviewedBy: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  audit: {
    select: {
      id: true,
      status: true,
      storeId: true,
      surveyPeriodId: true,
      store: {
        select: {
          id: true,
          name: true,
          competitor: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
};

/**
 * Creates a raw field price observation strictly bound to an Audit.
 */
export const createObservation = async ({ auditId, user, data }) => {
  const {
    clientObservationId,
    productId,
    availability,
    price = null,
    observedUnit = null,
    packageSize = null,
    capturedAt,
    evidencePhotoUrl = null,
    notes = null,
  } = data;

  // 1. Availability and Price integrity check
  const priceCheck = validateAvailabilityPriceCombination(availability, price);
  if (!priceCheck.isValid) {
    throw new ApiError(400, priceCheck.message);
  }

  // 2. Load the Audit with assignment verification details
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      assignment: {
        include: {
          items: true,
        },
      },
      surveyPeriod: true,
    },
  });

  if (!audit) {
    throw new ApiError(404, "Audit visit not found");
  }

  // 3. Auditor ownership check
  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot add observations to another auditor's visit",
    );
  }

  // 4. Audit lifecycle state check: observations are collected while IN_PROGRESS
  if (audit.status !== "IN_PROGRESS") {
    throw new ApiError(
      409,
      `Cannot record observations for audit in status [${audit.status}]. Audit must be IN_PROGRESS.`,
    );
  }

  // 5. Verify Product exists and is active master data
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  if (!product.active) {
    throw new ApiError(
      400,
      `Product [${product.name}] is inactive and cannot be observed`,
    );
  }

  // 6. Strict Assignment Item rule: Product MUST belong to the assignment
  const isAssignedProduct = audit.assignment.items.some(
    (item) => item.productId === productId,
  );

  if (!isAssignedProduct) {
    throw new ApiError(
      400,
      `Product [${product.name} (${productId})] is not assigned to this audit's store visit`,
    );
  }

  // 7. Validate capturedAt bounds against Audit timeline
  const timestampCheck = validateCapturedAt(capturedAt, audit);
  if (!timestampCheck.isValid) {
    throw new ApiError(400, timestampCheck.reason);
  }

  // 8. Idempotency Check: if clientObservationId already exists, return existing (offline retry)
  const existingObservation = await prisma.priceObservation.findUnique({
    where: { clientObservationId },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  if (existingObservation) {
    return formatObservationResponse(existingObservation);
  }

  // 9. Persist observation with SYNCED status (successful server ingestion)
  const observation = await prisma.priceObservation.create({
    data: {
      clientObservationId,
      auditId: audit.id,
      productId,
      auditorId: audit.auditorId,
      availability,
      price: availability === "AVAILABLE" ? price : null,
      observedUnit: observedUnit || product.unit,
      packageSize,
      capturedAt: new Date(capturedAt),
      syncStatus: "SYNCED",
      syncedAt: new Date(),
      syncAttempts: 1,
      evidencePhotoUrl,
      notes: notes?.trim() || null,
      reviewStatus: "PENDING",
    },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  return formatObservationResponse(observation);
};

/**
 * Get single observation by ID with relational context.
 */
export const getObservationById = async ({ observationId, user }) => {
  const observation = await prisma.priceObservation.findUnique({
    where: { id: observationId },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  if (!observation) {
    throw new ApiError(404, "Price observation not found");
  }

  if (user.role === "FIELD_AUDITOR" && observation.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot view another auditor's observation",
    );
  }

  return formatObservationResponse(observation);
};

/**
 * List observations for a specific Audit with pagination, filters, and completeness counts.
 */
export const listAuditObservations = async ({ auditId, user, query }) => {
  const {
    page = 1,
    limit = 20,
    productId,
    availability,
    reviewStatus,
    syncStatus,
    from,
    to,
  } = query;

  // 1. Verify Audit exists and belongs to auditor if FIELD_AUDITOR
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    include: {
      assignment: {
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, unit: true, category: true },
              },
            },
          },
        },
      },
    },
  });

  if (!audit) {
    throw new ApiError(404, "Audit visit not found");
  }

  if (user.role === "FIELD_AUDITOR" && audit.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot view another auditor's observations",
    );
  }

  // 2. Build where filter
  const where = { auditId };

  if (productId) where.productId = productId;
  if (availability) where.availability = availability;
  if (reviewStatus) where.reviewStatus = reviewStatus;
  if (syncStatus) where.syncStatus = syncStatus;

  if (from || to) {
    where.capturedAt = {};
    if (from) where.capturedAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      if (/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      where.capturedAt.lte = toDate;
    }
  }

  const skip = (page - 1) * limit;

  // 3. Execute transactional count and findMany
  const [total, observations, allAuditObservations] = await prisma.$transaction(
    [
      prisma.priceObservation.count({ where }),
      prisma.priceObservation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { capturedAt: "desc" },
        include: OBSERVATION_INCLUDE_RELATIONS,
      }),
      prisma.priceObservation.findMany({
        where: { auditId },
        select: { productId: true },
      }),
    ],
  );

  // 4. Calculate actual assignment completeness metadata
  const expectedItems = audit.assignment?.items || [];
  const expectedProductIds = expectedItems.map((i) => i.productId);
  const observedProductIds = new Set(
    allAuditObservations.map((o) => o.productId),
  );

  const missingProducts = expectedItems
    .filter((item) => !observedProductIds.has(item.productId))
    .map((item) => ({
      productId: item.productId,
      name: item.product?.name,
      required: item.required,
    }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: observations.map(formatObservationResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
      completeness: {
        expectedProductsCount: expectedProductIds.length,
        observedProductsCount: observedProductIds.size,
        missingProductsCount: missingProducts.length,
        missingProducts,
      },
    },
  };
};

/**
 * Update an existing observation.
 */
export const updateObservation = async ({ observationId, user, updates }) => {
  const observation = await prisma.priceObservation.findUnique({
    where: { id: observationId },
    include: { audit: true },
  });

  if (!observation) {
    throw new ApiError(404, "Price observation not found");
  }

  if (user.role === "FIELD_AUDITOR" && observation.auditorId !== user.id) {
    throw new ApiError(
      403,
      "Access forbidden: You cannot modify another auditor's observation",
    );
  }

  // Approved field evidence cannot be mutated by field auditors
  if (
    observation.reviewStatus === "APPROVED" &&
    user.role === "FIELD_AUDITOR"
  ) {
    throw new ApiError(
      409,
      "Cannot modify an observation that has already been APPROVED by a supervisor",
    );
  }

  // Audit must still be IN_PROGRESS for field auditors to update observations
  if (
    user.role === "FIELD_AUDITOR" &&
    observation.audit.status !== "IN_PROGRESS"
  ) {
    throw new ApiError(
      409,
      `Cannot update observation: corresponding audit is [${observation.audit.status}]`,
    );
  }

  const newAvailability = updates.availability ?? observation.availability;
  let newPrice =
    updates.price !== undefined ? updates.price : observation.price;

  if (
    updates.availability !== undefined &&
    updates.availability !== "AVAILABLE"
  ) {
    newPrice = null;
  }

  const priceCheck = validateAvailabilityPriceCombination(
    newAvailability,
    newPrice,
  );
  if (!priceCheck.isValid) {
    throw new ApiError(400, priceCheck.message);
  }

  const updatedObservation = await prisma.priceObservation.update({
    where: { id: observationId },
    data: {
      availability: newAvailability,
      price: newPrice,
      observedUnit:
        updates.observedUnit !== undefined
          ? updates.observedUnit
          : observation.observedUnit,
      packageSize:
        updates.packageSize !== undefined
          ? updates.packageSize
          : observation.packageSize,
      evidencePhotoUrl:
        updates.evidencePhotoUrl !== undefined
          ? updates.evidencePhotoUrl
          : observation.evidencePhotoUrl,
      notes:
        updates.notes !== undefined ? updates.notes?.trim() : observation.notes,
      reviewStatus:
        observation.reviewStatus === "REJECTED" ||
        observation.reviewStatus === "NEEDS_REVIEW"
          ? "PENDING"
          : observation.reviewStatus,
    },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  return formatObservationResponse(updatedObservation);
};

/**
 * Approve observation (ADMIN or MANAGER only).
 */
export const approveObservation = async ({ observationId, reviewer }) => {
  const observation = await prisma.priceObservation.findUnique({
    where: { id: observationId },
  });

  if (!observation) {
    throw new ApiError(404, "Price observation not found");
  }

  if (!canTransitionReviewStatus(observation.reviewStatus, "APPROVED")) {
    throw new ApiError(
      409,
      `Cannot approve observation currently in status [${observation.reviewStatus}]`,
    );
  }

  const updatedObservation = await prisma.priceObservation.update({
    where: { id: observationId },
    data: {
      reviewStatus: "APPROVED",
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
    },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  return formatObservationResponse(updatedObservation);
};

/**
 * Reject observation with mandatory review note (ADMIN or MANAGER only).
 */
export const rejectObservation = async ({
  observationId,
  reviewer,
  reviewNote,
}) => {
  const observation = await prisma.priceObservation.findUnique({
    where: { id: observationId },
  });

  if (!observation) {
    throw new ApiError(404, "Price observation not found");
  }

  if (!canTransitionReviewStatus(observation.reviewStatus, "REJECTED")) {
    throw new ApiError(
      409,
      `Cannot reject observation currently in status [${observation.reviewStatus}]`,
    );
  }

  const updatedObservation = await prisma.priceObservation.update({
    where: { id: observationId },
    data: {
      reviewStatus: "REJECTED",
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote.trim(),
    },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  return formatObservationResponse(updatedObservation);
};

/**
 * Request review on observation (ADMIN or MANAGER only).
 */
export const requestObservationReview = async ({
  observationId,
  reviewer,
  reviewNote,
}) => {
  const observation = await prisma.priceObservation.findUnique({
    where: { id: observationId },
  });

  if (!observation) {
    throw new ApiError(404, "Price observation not found");
  }

  if (!canTransitionReviewStatus(observation.reviewStatus, "NEEDS_REVIEW")) {
    throw new ApiError(
      409,
      `Cannot flag observation for review from current status [${observation.reviewStatus}]`,
    );
  }

  const updatedObservation = await prisma.priceObservation.update({
    where: { id: observationId },
    data: {
      reviewStatus: "NEEDS_REVIEW",
      reviewedById: reviewer.id,
      reviewedAt: new Date(),
      reviewNote: reviewNote.trim(),
    },
    include: OBSERVATION_INCLUDE_RELATIONS,
  });

  return formatObservationResponse(updatedObservation);
};

export const observationService = {
  createObservation,
  getObservationById,
  listAuditObservations,
  updateObservation,
  approveObservation,
  rejectObservation,
  requestObservationReview,
};
