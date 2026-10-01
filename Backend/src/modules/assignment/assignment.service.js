import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { formatAssignmentResponse } from "./assignment.helpers.js";

const ASSIGNMENT_INCLUDE_RELATIONS = {
  auditor: { select: { id: true, name: true, phone: true, role: true } },
  store: {
    include: {
      competitor: { select: { id: true, name: true, type: true } },
    },
  },
  surveyPeriod: true,
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          category: true,
          unit: true,
          sku: true,
          barcode: true,
        },
      },
    },
  },
  audits: {
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      _count: { select: { observations: true } },
    },
  },
};
// Append to Backend/src/modules/assignment/assignment.service.js:

/**
 * Creates batch assignments across multiple auditors for a single store in one transaction.
 */
export const createBatch = async (payload) => {
  const { storeId, surveyPeriodId, allocations } = payload;

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || !store.active) {
    throw new ApiError(400, "Target physical store does not exist or is inactive.");
  }

  const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } });
  if (!period || period.status === "CLOSED") {
    throw new ApiError(400, "Survey cycle does not exist or is closed.");
  }

  // Verify all auditors
  const auditorIds = allocations.map((a) => a.auditorId);
  const distinctAuditors = new Set(auditorIds);
  if (distinctAuditors.size !== auditorIds.length) {
    throw new ApiError(400, "Duplicate auditors found in dispatch list.");
  }

  const validAuditors = await prisma.user.findMany({
    where: { id: { in: auditorIds }, active: true, role: "FIELD_AUDITOR" },
    select: { id: true, name: true },
  });

  if (validAuditors.length !== auditorIds.length) {
    throw new ApiError(400, "One or more assigned users are not active field auditors.");
  }

  // Atomic creation of all assignments
  const createdAssignments = await prisma.$transaction(async (tx) => {
    const results = [];

    for (const alloc of allocations) {
      // Check existing
      const existing = await tx.surveyAssignment.findUnique({
        where: {
          auditorId_storeId_surveyPeriodId: {
            auditorId: alloc.auditorId,
            storeId,
            surveyPeriodId,
          },
        },
      });

      if (existing) {
        throw new ApiError(
          409,
          `An assignment already exists for auditor [${alloc.auditorId}] at this store for this cycle.`
        );
      }

      // 1. Create Survey Assignment
      const asn = await tx.surveyAssignment.create({
        data: {
          auditorId: alloc.auditorId,
          storeId,
          surveyPeriodId,
          status: "NOT_STARTED",
        },
      });

      // 2. Create Assignment Items
      if (alloc.productIds.length > 0) {
        await tx.assignmentItem.createMany({
          data: alloc.productIds.map((pId) => ({
            assignmentId: asn.id,
            productId: pId,
            required: true,
          })),
        });
      }

      // 3. Create linked initial Audit
      await tx.audit.create({
        data: {
          assignmentId: asn.id,
          auditorId: asn.auditorId,
          storeId: asn.storeId,
          surveyPeriodId: asn.surveyPeriodId,
          status: "NOT_STARTED",
        },
      });

      results.push(asn.id);
    }

    return tx.surveyAssignment.findMany({
      where: { id: { in: results } },
      include: ASSIGNMENT_INCLUDE_RELATIONS,
    });
  });

  return createdAssignments.map(formatAssignmentResponse);
};

/**
 * Retrieves all current auditor allocations for a specific store and survey period.
 */
export const getStoreAllocations = async (storeId, surveyPeriodId) => {
  const assignments = await prisma.surveyAssignment.findMany({
    where: { storeId, surveyPeriodId },
    include: {
      auditor: { select: { id: true, name: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, category: true, unit: true } },
        },
      },
      audits: {
        include: {
          _count: { select: { observations: true } },
          observations: { select: { productId: true } },
        },
      },
    },
    orderBy: { assignedAt: "asc" },
  });

  return assignments.map((asn) => {
    const totalObservations = asn.audits.reduce(
      (sum, a) => sum + (a._count?.observations || 0),
      0
    );
    const observedProductIds = new Set(
      asn.audits.flatMap((a) => a.observations.map((o) => o.productId))
    );

    const hasStarted = asn.status !== "NOT_STARTED" || totalObservations > 0;

    return {
      assignmentId: asn.id,
      auditorId: asn.auditorId,
      auditor: asn.auditor,
      status: asn.status,
      totalItems: asn.items.length,
      productIds: asn.items.map((i) => i.productId),
      observedCount: observedProductIds.size,
      hasStarted,
      canModify: !hasStarted,
    };
  });
};


export const updateStoreAllocations = async (payload) => {
  const { storeId, surveyPeriodId, allocations, previousStoreId } = payload;

  return prisma.$transaction(async (tx) => {
    // 0. If target store was changed for an unstarted dispatch, clean up previous store records
    if (previousStoreId && previousStoreId !== storeId) {
      const prevAssignments = await tx.surveyAssignment.findMany({
        where: { storeId: previousStoreId, surveyPeriodId },
        include: {
          audits: {
            include: { _count: { select: { observations: true } } },
          },
        },
      });

      const anyStarted = prevAssignments.some(
        (a) =>
          a.status !== "NOT_STARTED" ||
          a.audits.some(
            (aud) =>
              aud.status !== "NOT_STARTED" || (aud._count?.observations || 0) > 0,
          ),
      );

      if (anyStarted) {
        throw new ApiError(
          409,
          "Cannot change target store: visits or observations have already started for the previous store.",
        );
      }

      for (const prev of prevAssignments) {
        await tx.audit.deleteMany({
          where: { assignmentId: prev.id, status: "NOT_STARTED" },
        });
        await tx.assignmentItem.deleteMany({
          where: { assignmentId: prev.id },
        });
        await tx.surveyAssignment.delete({ where: { id: prev.id } });
      }
    }

    // 1. Fetch current assignments for the target store
    const currentAssignments = await tx.surveyAssignment.findMany({
      where: { storeId, surveyPeriodId },
      include: {
        auditor: { select: { id: true, name: true } },
        audits: {
          include: {
            observations: { select: { productId: true } },
            _count: { select: { observations: true } },
          },
        },
        items: true,
      },
    });

    const newAllocationsMap = new Map(allocations.map((a) => [a.auditorId, a]));

    // 2. Check for removed auditors
    for (const current of currentAssignments) {
      if (!newAllocationsMap.has(current.auditorId)) {
        const observationsCount = current.audits.reduce(
          (sum, a) => sum + (a._count?.observations || 0),
          0,
        );

        if (observationsCount > 0 || current.status !== "NOT_STARTED") {
          throw new ApiError(
            409,
            `Cannot remove auditor [${current.auditor.name}]: observations have already been recorded.`,
          );
        }

        await tx.audit.deleteMany({
          where: { assignmentId: current.id, status: "NOT_STARTED" },
        });
        await tx.assignmentItem.deleteMany({
          where: { assignmentId: current.id },
        });
        await tx.surveyAssignment.delete({ where: { id: current.id } });
      }
    }

    // 3. Update existing allocations or add new ones
    for (const alloc of allocations) {
      const existing = currentAssignments.find(
        (c) => c.auditorId === alloc.auditorId,
      );

      if (existing) {
        const observedProductIds = new Set(
          existing.audits.flatMap((a) => a.observations.map((o) => o.productId)),
        );
        const newProductIdsSet = new Set(alloc.productIds);

        for (const obsProdId of observedProductIds) {
          if (!newProductIdsSet.has(obsProdId)) {
            throw new ApiError(
              409,
              `Cannot remove item from [${existing.auditor.name}] because field observations have already been recorded for that product.`,
            );
          }
        }

        await tx.assignmentItem.deleteMany({
          where: { assignmentId: existing.id },
        });
        await tx.assignmentItem.createMany({
          data: alloc.productIds.map((pId) => ({
            assignmentId: existing.id,
            productId: pId,
            required: true,
          })),
        });
      } else {
        const newAsn = await tx.surveyAssignment.create({
          data: {
            auditorId: alloc.auditorId,
            storeId,
            surveyPeriodId,
            status: "NOT_STARTED",
          },
        });

        await tx.assignmentItem.createMany({
          data: alloc.productIds.map((pId) => ({
            assignmentId: newAsn.id,
            productId: pId,
            required: true,
          })),
        });

        await tx.audit.create({
          data: {
            assignmentId: newAsn.id,
            auditorId: alloc.auditorId,
            storeId,
            surveyPeriodId,
            status: "NOT_STARTED",
          },
        });
      }
    }

    return tx.surveyAssignment.findMany({
      where: { storeId, surveyPeriodId },
      include: ASSIGNMENT_INCLUDE_RELATIONS,
    });
  });
};


export const getStoreProgress = async (storeId, surveyPeriodId) => {
  const assignments = await prisma.surveyAssignment.findMany({
    where: { storeId, surveyPeriodId },
    include: {
      audits: {
        include: {
          observations: {
            select: { productId: true, price: true, availability: true, capturedAt: true },
          },
        },
      },
      items: {
        include: {
          product: {
            select: { id: true, name: true, sku: true, category: true, unit: true },
          },
        },
      },
      auditor: { select: { id: true, name: true, phone: true } },
    },
  });

  // Collect all unique products assigned to this store across auditors
  const allAssignedProductsMap = new Map();
  const observedProductsMap = new Map();

  for (const asn of assignments) {
    for (const item of asn.items) {
      if (!allAssignedProductsMap.has(item.productId)) {
        allAssignedProductsMap.set(item.productId, {
          ...item.product,
          assignedAuditors: [asn.auditor.name],
        });
      } else {
        allAssignedProductsMap.get(item.productId).assignedAuditors.push(asn.auditor.name);
      }
    }

    for (const audit of asn.audits) {
      for (const obs of audit.observations) {
        observedProductsMap.set(obs.productId, {
          ...obs,
          auditorName: asn.auditor.name,
        });
      }
    }
  }

  const assignedProductsList = Array.from(allAssignedProductsMap.values());
  const completedCount = observedProductsMap.size;
  const totalCount = assignedProductsList.length;

  return {
    storeId,
    surveyPeriodId,
    totalProducts: totalCount,
    completedProducts: completedCount,
    remainingProducts: Math.max(0, totalCount - completedCount),
    percentDone: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    nextPendingProduct: assignedProductsList.find((p) => !observedProductsMap.has(p.id)) || null,
  };
};

/**
 * Get all assignments for the authenticated field auditor.
 */
export const getMine = async (auditorId) => {
  const assignments = await prisma.surveyAssignment.findMany({
    where: { auditorId },
    include: ASSIGNMENT_INCLUDE_RELATIONS,
    orderBy: { assignedAt: "desc" },
  });

  return assignments.map(formatAssignmentResponse);
};

/**
 * Get all assignments with optional administrative filters and integer pagination safety.
 */
export const getAll = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 50,
    auditorId,
    storeId,
    surveyPeriodId,
    status,
  } = query;

  const where = {};
  if (auditorId) where.auditorId = auditorId;
  if (storeId) where.storeId = storeId;
  if (surveyPeriodId) where.surveyPeriodId = surveyPeriodId;
  if (status) where.status = status;

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 50));
  const skip = (page - 1) * limit;

  const [total, assignments] = await prisma.$transaction([
    prisma.surveyAssignment.count({ where }),
    prisma.surveyAssignment.findMany({
      where,
      skip,
      take: limit,
      include: ASSIGNMENT_INCLUDE_RELATIONS,
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: assignments.map(formatAssignmentResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Get single assignment by ID.
 */
export const getById = async (id) => {
  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id },
    include: ASSIGNMENT_INCLUDE_RELATIONS,
  });

  if (!assignment) {
    throw new ApiError(404, `Assignment '${id}' not found`);
  }

  return formatAssignmentResponse(assignment);
};

/**
 * Creates a SurveyAssignment AND automatically initializes its initial Audit record with status NOT_STARTED.
 */
export const create = async (payload) => {
  const {
    auditorId,
    storeId,
    surveyPeriodId,
    productIds = [],
    status = "NOT_STARTED",
  } = payload;

  // 1. Verify auditor exists and is active
  const auditor = await prisma.user.findUnique({ where: { id: auditorId } });
  if (!auditor || !auditor.active) {
    throw new ApiError(400, "Assigned user must be an active system user.");
  }
  if (auditor.role !== "FIELD_AUDITOR") {
    throw new ApiError(400, "Assigned user must hold the FIELD_AUDITOR role.");
  }

  // 2. Verify physical store exists and is active
  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store || !store.active) {
    throw new ApiError(
      400,
      `Physical store '${storeId}' does not exist or is inactive.`,
    );
  }

  // 3. Verify survey period exists and is not closed
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId },
  });
  if (!period) {
    throw new ApiError(
      400,
      `Survey period '${surveyPeriodId}' does not exist.`,
    );
  }
  if (period.status === "CLOSED") {
    throw new ApiError(
      400,
      "Cannot create assignments for a CLOSED survey period.",
    );
  }

  // 4. Ensure no duplicate assignment for the same auditor + store + period
  const existing = await prisma.surveyAssignment.findUnique({
    where: {
      auditorId_storeId_surveyPeriodId: {
        auditorId,
        storeId,
        surveyPeriodId,
      },
    },
  });

  if (existing) {
    throw new ApiError(
      409,
      "An assignment already exists for this auditor at this store for this survey period.",
    );
  }

  // 5. Verify product IDs against Product catalog
  let validProductIds = [];
  if (Array.isArray(productIds) && productIds.length > 0) {
    const matchingProducts = await prisma.product.findMany({
      where: {
        active: true,
        OR: [
          { id: { in: productIds } },
          { barcode: { in: productIds } },
          { sku: { in: productIds } },
        ],
      },
      select: { id: true },
    });

    if (matchingProducts.length === 0) {
      throw new ApiError(
        400,
        "None of the selected products exist or are active in the product catalog.",
      );
    }
    validProductIds = matchingProducts.map((p) => p.id);
  }

  // 6. Execute atomic creation: SurveyAssignment + AssignmentItems + Initial NOT_STARTED Audit
  const createdAssignment = await prisma.$transaction(async (tx) => {
    // A. Create Survey Assignment
    const asn = await tx.surveyAssignment.create({
      data: {
        auditorId,
        storeId,
        surveyPeriodId,
        status: status || "NOT_STARTED",
      },
    });

    // B. Create Assignment Items
    if (validProductIds.length > 0) {
      const itemRecords = validProductIds.map((pId) => ({
        assignmentId: asn.id,
        productId: pId,
        required: true,
      }));

      await tx.assignmentItem.createMany({
        data: itemRecords,
      });
    }

    // C. Automatically create corresponding initial physical Audit in NOT_STARTED status
    await tx.audit.create({
      data: {
        assignmentId: asn.id,
        auditorId: asn.auditorId,
        storeId: asn.storeId,
        surveyPeriodId: asn.surveyPeriodId,
        status: "NOT_STARTED",
      },
    });

    // D. Return full relational record
    return tx.surveyAssignment.findUnique({
      where: { id: asn.id },
      include: ASSIGNMENT_INCLUDE_RELATIONS,
    });
  });

  return formatAssignmentResponse(createdAssignment);
};

/**
 * Updates an assignment and synchronizes its linked NOT_STARTED audit if changes occur before visit begins.
 */
export const update = async (id, payload, currentUser) => {
  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id },
    include: {
      audits: true,
      items: true,
    },
  });

  if (!assignment) {
    throw new ApiError(404, `Assignment '${id}' not found`);
  }

  // Authorization: FIELD_AUDITOR can only update their own assignment status
  if (
    currentUser.role === "FIELD_AUDITOR" &&
    assignment.auditorId !== currentUser.id
  ) {
    throw new ApiError(
      403,
      "Access forbidden: You can only update your own assigned field tasks.",
    );
  }

  const { auditorId, storeId, surveyPeriodId, productIds, status } = payload;

  // Check if any audit visit has already started or collected observations
  const hasStartedVisit = assignment.audits.some(
    (a) =>
      a.status === "IN_PROGRESS" ||
      a.status === "COMPLETED" ||
      a.status === "NEEDS_REVIEW",
  );

  const isChangingCoreData =
    (auditorId && auditorId !== assignment.auditorId) ||
    (storeId && storeId !== assignment.storeId) ||
    (surveyPeriodId && surveyPeriodId !== assignment.surveyPeriodId) ||
    productIds !== undefined;

  // Field Auditors cannot change core configuration
  if (currentUser.role === "FIELD_AUDITOR" && isChangingCoreData) {
    throw new ApiError(
      403,
      "Field auditors are only permitted to update assignment status.",
    );
  }

  // If visit has already started, prevent changing core identifiers
  if (hasStartedVisit && isChangingCoreData) {
    throw new ApiError(
      409,
      "Cannot modify auditor, store, period, or products: a physical audit visit has already started for this assignment.",
    );
  }

  // Validate new auditor if changing
  if (auditorId && auditorId !== assignment.auditorId) {
    const auditor = await prisma.user.findUnique({ where: { id: auditorId } });
    if (!auditor || !auditor.active || auditor.role !== "FIELD_AUDITOR") {
      throw new ApiError(
        400,
        "New assigned user must be an active FIELD_AUDITOR.",
      );
    }
  }

  // Validate new store if changing
  if (storeId && storeId !== assignment.storeId) {
    const store = await prisma.store.findUnique({ where: { id: storeId } });
    if (!store || !store.active) {
      throw new ApiError(
        400,
        "New physical store does not exist or is inactive.",
      );
    }
  }

  // Validate new survey period if changing
  if (surveyPeriodId && surveyPeriodId !== assignment.surveyPeriodId) {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId },
    });
    if (!period || period.status === "CLOSED") {
      throw new ApiError(400, "New survey period does not exist or is CLOSED.");
    }
  }

  // Execute update atomically
  const updated = await prisma.$transaction(async (tx) => {
    const dataToUpdate = {};

    if (auditorId) dataToUpdate.auditorId = auditorId;
    if (storeId) dataToUpdate.storeId = storeId;
    if (surveyPeriodId) dataToUpdate.surveyPeriodId = surveyPeriodId;

    if (status) {
      dataToUpdate.status = status;
      if (status === "IN_PROGRESS" && !assignment.startedAt) {
        dataToUpdate.startedAt = new Date();
      }
      if (status === "COMPLETED" && !assignment.completedAt) {
        dataToUpdate.completedAt = new Date();
      }
    }

    // A. Update SurveyAssignment record
    const updatedAsn = await tx.surveyAssignment.update({
      where: { id },
      data: dataToUpdate,
    });

    // B. Re-synchronize product items if provided
    if (productIds !== undefined) {
      const matchingProducts = await prisma.product.findMany({
        where: {
          active: true,
          OR: [
            { id: { in: productIds } },
            { barcode: { in: productIds } },
            { sku: { in: productIds } },
          ],
        },
        select: { id: true },
      });

      const validPIds = matchingProducts.map((p) => p.id);

      // Replace items
      await tx.assignmentItem.deleteMany({
        where: { assignmentId: id },
      });

      if (validPIds.length > 0) {
        await tx.assignmentItem.createMany({
          data: validPIds.map((pId) => ({
            assignmentId: id,
            productId: pId,
            required: true,
          })),
        });
      }
    }

    // C. Synchronize unstarted linked audits so foreign keys remain identical
    const unstartedAudit = assignment.audits.find(
      (a) => a.status === "NOT_STARTED",
    );

    if (unstartedAudit && (auditorId || storeId || surveyPeriodId)) {
      await tx.audit.update({
        where: { id: unstartedAudit.id },
        data: {
          ...(auditorId ? { auditorId } : {}),
          ...(storeId ? { storeId } : {}),
          ...(surveyPeriodId ? { surveyPeriodId } : {}),
        },
      });
    }

    // Return updated record
    return tx.surveyAssignment.findUnique({
      where: { id },
      include: ASSIGNMENT_INCLUDE_RELATIONS,
    });
  });

  return formatAssignmentResponse(updated);
};

/**
 * Deletes an assignment and its linked unstarted audit.
 * Rejects deletion if an audit visit has started or has observations.
 */
export const remove = async (id, currentUser) => {
  if (currentUser.role === "FIELD_AUDITOR") {
    throw new ApiError(
      403,
      "Field auditors are not authorized to delete assignments.",
    );
  }

  const assignment = await prisma.surveyAssignment.findUnique({
    where: { id },
    include: {
      audits: {
        include: {
          _count: { select: { observations: true } },
        },
      },
    },
  });

  if (!assignment) {
    throw new ApiError(404, `Assignment '${id}' not found`);
  }

  // Safety check: Cannot delete if any visit has started, completed, or recorded observations
  const hasStartedVisit = assignment.audits.some(
    (a) =>
      a.status === "IN_PROGRESS" ||
      a.status === "COMPLETED" ||
      a.status === "NEEDS_REVIEW" ||
      (a._count?.observations ?? 0) > 0,
  );

  if (
    hasStartedVisit ||
    assignment.status === "IN_PROGRESS" ||
    assignment.status === "COMPLETED"
  ) {
    throw new ApiError(
      409,
      "Cannot delete this assignment because field audit activity or observations have already been recorded. Set status to CANCELLED instead.",
    );
  }

  // Delete atomically: linked NOT_STARTED audits, items, and assignment
  await prisma.$transaction(async (tx) => {
    // Delete linked NOT_STARTED audits
    await tx.audit.deleteMany({
      where: {
        assignmentId: id,
        status: "NOT_STARTED",
      },
    });

    // Delete assignment items (or handled via Cascade)
    await tx.assignmentItem.deleteMany({
      where: { assignmentId: id },
    });

    // Delete the assignment
    await tx.surveyAssignment.delete({
      where: { id },
    });
  });

  return {
    success: true,
    message: `Assignment '${id}' and its unstarted audit visit were deleted successfully.`,
  };
};

export const assignmentService = {
  getMine,
  getAll,
  getById,
  create,
  update,
  remove,
  createBatch,
  getStoreAllocations,
  updateStoreAllocations,
  getStoreProgress,
};
