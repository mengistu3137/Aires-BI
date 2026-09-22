/**
 * Observation Review State Transition Rules:
 * PENDING      -> APPROVED, REJECTED, NEEDS_REVIEW
 * NEEDS_REVIEW -> APPROVED, REJECTED
 * REJECTED     -> NEEDS_REVIEW
 * APPROVED     -> Terminal (cannot transition without explicit supervisor unlock)
 */
export const VALID_REVIEW_TRANSITIONS = {
  PENDING: ["APPROVED", "REJECTED", "NEEDS_REVIEW"],
  NEEDS_REVIEW: ["APPROVED", "REJECTED"],
  REJECTED: ["NEEDS_REVIEW"],
  APPROVED: [],
};

export const canTransitionReviewStatus = (currentStatus, targetStatus) => {
  const allowed = VALID_REVIEW_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

/**
 * Validates timestamp consistency:
 * - Cannot be in the future (with 5-minute clock drift tolerance).
 * - Cannot precede the start of the audit if startedAt exists.
 * - Cannot be captured after audit completedAt if completedAt exists.
 */
export const validateCapturedAt = (capturedAtStr, audit) => {
  const capturedAt = new Date(capturedAtStr);
  const nowWithDrift = new Date(Date.now() + 5 * 60 * 1000);

  if (capturedAt > nowWithDrift) {
    return {
      isValid: false,
      reason: "Observation capturedAt cannot be in the future",
    };
  }

  if (audit.startedAt && capturedAt < new Date(audit.startedAt)) {
    // 15-minute grace tolerance for device clock discrepancies during audit start
    const startTolerance = new Date(
      new Date(audit.startedAt).getTime() - 15 * 60 * 1000,
    );
    if (capturedAt < startTolerance) {
      return {
        isValid: false,
        reason: "Observation capturedAt cannot precede audit start time",
      };
    }
  }

  if (audit.completedAt && capturedAt > new Date(audit.completedAt)) {
    return {
      isValid: false,
      reason:
        "Observation capturedAt cannot be after the audit completion time",
    };
  }

  return { isValid: true };
};

/**
 * Validates business rules regarding product availability and price:
 * - AVAILABLE: price is required, must be > 0.
 * - OUT_OF_STOCK / NOT_FOUND: price must be null. Price = 0 is rejected.
 */
export const validateAvailabilityPriceCombination = (availability, price) => {
  if (availability === "AVAILABLE") {
    if (price === null || price === undefined) {
      return {
        isValid: false,
        message: "Price is required when availability is AVAILABLE",
      };
    }
    const numPrice = Number(price);
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      return {
        isValid: false,
        message: "Price must be a positive number greater than 0",
      };
    }
  } else {
    // OUT_OF_STOCK or NOT_FOUND
    if (price !== null && price !== undefined) {
      return {
        isValid: false,
        message: `Price must be null when product is marked ${availability}. Zero is not allowed.`,
      };
    }
  }
  return { isValid: true };
};

/**
 * Formats a PriceObservation model into a uniform JSON response DTO.
 * Explicitly serializes Decimal values and strips sensitive User details.
 */
export const formatObservationResponse = (obs) => {
  if (!obs) return null;

  return {
    id: obs.id,
    clientObservationId: obs.clientObservationId,
    auditId: obs.auditId,
    productId: obs.productId,
    availability: obs.availability,
    price:
      obs.price !== null && obs.price !== undefined ? Number(obs.price) : null,
    observedUnit: obs.observedUnit,
    packageSize: obs.packageSize,
    capturedAt: obs.capturedAt,
    sync: {
      status: obs.syncStatus,
      attempts: obs.syncAttempts,
      lastSyncAttemptAt: obs.lastSyncAttemptAt,
      syncedAt: obs.syncedAt,
      error: obs.syncError,
    },
    review: {
      status: obs.reviewStatus,
      reviewedAt: obs.reviewedAt,
      reviewNote: obs.reviewNote,
      reviewedBy: obs.reviewedBy
        ? {
            id: obs.reviewedBy.id,
            name: obs.reviewedBy.name,
            role: obs.reviewedBy.role,
          }
        : null,
    },
    evidencePhotoUrl: obs.evidencePhotoUrl,
    notes: obs.notes,
    product: obs.product
      ? {
          id: obs.product.id,
          name: obs.product.name,
          sku: obs.product.sku,
          barcode: obs.product.barcode,
          category: obs.product.category,
          unit: obs.product.unit,
        }
      : undefined,
    auditor: obs.auditor
      ? {
          id: obs.auditor.id,
          name: obs.auditor.name,
          email: obs.auditor.email,
          phone: obs.auditor.phone,
          role: obs.auditor.role,
        }
      : undefined,
    audit: obs.audit
      ? {
          id: obs.audit.id,
          status: obs.audit.status,
          storeId: obs.audit.storeId,
          surveyPeriodId: obs.audit.surveyPeriodId,
          store: obs.audit.store
            ? {
                id: obs.audit.store.id,
                name: obs.audit.store.name,
                competitor: obs.audit.store.competitor
                  ? {
                      id: obs.audit.store.competitor.id,
                      name: obs.audit.store.competitor.name,
                    }
                  : undefined,
              }
            : undefined,
        }
      : undefined,
    createdAt: obs.createdAt,
    updatedAt: obs.updatedAt,
  };
};
