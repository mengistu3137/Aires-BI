/**
 * Haversine formula to compute great-circle distance between two GPS coordinates in meters.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters rounded to 2 decimal places
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const EARTH_RADIUS_METERS = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 100) / 100;
};

/**
 * Validates GPS compliance against store coordinates and accuracy threshold.
 * Configurable via AUDIT_GPS_RADIUS_METERS env variable (default 100 meters).
 */
export const isWithinAuditRadius = ({
  distanceMeters,
  accuracyMeters,
  allowedRadiusMeters = Number(process.env.AUDIT_GPS_RADIUS_METERS) || 100,
}) => {
  if (distanceMeters === null || distanceMeters === undefined) {
    return false;
  }
  // If the device accuracy is too wide, warn/invalidate
  const MAX_PERMISSIBLE_ACCURACY =
    Number(process.env.AUDIT_GPS_MAX_ACCURACY_METERS) || 100;
  if (accuracyMeters > MAX_PERMISSIBLE_ACCURACY) {
    return false;
  }
  return distanceMeters <= allowedRadiusMeters;
};

/**
 * State machine transition validator.
 * Enforces field visit lifecycle constraints:
 *   NOT_STARTED -> IN_PROGRESS, CANCELLED
 *   IN_PROGRESS -> COMPLETED, CANCELLED, NEEDS_REVIEW
 *   COMPLETED   -> NEEDS_REVIEW
 */
export const VALID_AUDIT_TRANSITIONS = {
  NOT_STARTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED", "NEEDS_REVIEW"],
  COMPLETED: ["NEEDS_REVIEW"],
  CANCELLED: [],
  NEEDS_REVIEW: [],
};

export const canTransitionAuditStatus = (currentStatus, targetStatus) => {
  const allowed = VALID_AUDIT_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
};

/**
 * Formats Decimal and relations into a uniform JSON response DTO.
 * Ensures passwordHash is never returned and Decimals are cleanly serialized.
 */
export const formatAuditResponse = (audit) => {
  if (!audit) return null;

  return {
    id: audit.id,
    status: audit.status,
    startedAt: audit.startedAt,
    completedAt: audit.completedAt,
    notes: audit.notes,
    gps: {
      start:
        audit.startLatitude !== null && audit.startLatitude !== undefined
          ? {
              latitude: Number(audit.startLatitude),
              longitude: Number(audit.startLongitude),
              accuracyMeters:
                audit.startAccuracyMeters !== null
                  ? Number(audit.startAccuracyMeters)
                  : null,
            }
          : null,
      end:
        audit.endLatitude !== null && audit.endLatitude !== undefined
          ? {
              latitude: Number(audit.endLatitude),
              longitude: Number(audit.endLongitude),
              accuracyMeters:
                audit.endAccuracyMeters !== null
                  ? Number(audit.endAccuracyMeters)
                  : null,
            }
          : null,
      distanceFromStoreMeters:
        audit.distanceFromStoreMeters !== null
          ? Number(audit.distanceFromStoreMeters)
          : null,
      gpsValid: audit.gpsValid,
    },
    assignment: audit.assignment
      ? {
          id: audit.assignment.id,
          status: audit.assignment.status,
          assignedAt: audit.assignment.assignedAt,
          items: audit.assignment.items?.map((item) => ({
            id: item.id,
            productId: item.productId,
            required: item.required,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  sku: item.product.sku,
                  category: item.product.category,
                  unit: item.product.unit,
                }
              : undefined,
          })),
        }
      : { id: audit.assignmentId },
    auditor: audit.auditor
      ? {
          id: audit.auditor.id,
          name: audit.auditor.name,
          email: audit.auditor.email,
          phone: audit.auditor.phone,
          role: audit.auditor.role,
        }
      : { id: audit.auditorId },
    store: audit.store
      ? {
          id: audit.store.id,
          name: audit.store.name,
          address: audit.store.address,
          city: audit.store.city,
          area: audit.store.area,
          type: audit.store.type,
          latitude:
            audit.store.latitude !== null ? Number(audit.store.latitude) : null,
          longitude:
            audit.store.longitude !== null
              ? Number(audit.store.longitude)
              : null,
          competitor: audit.store.competitor
            ? {
                id: audit.store.competitor.id,
                name: audit.store.competitor.name,
                type: audit.store.competitor.type,
              }
            : undefined,
        }
      : { id: audit.storeId },
    surveyPeriod: audit.surveyPeriod
      ? {
          id: audit.surveyPeriod.id,
          name: audit.surveyPeriod.name,
          startDate: audit.surveyPeriod.startDate,
          endDate: audit.surveyPeriod.endDate,
          status: audit.surveyPeriod.status,
        }
      : { id: audit.surveyPeriodId },
    observationsCount:
      audit._count?.observations ?? audit.observations?.length ?? 0,
    createdAt: audit.createdAt,
    updatedAt: audit.updatedAt,
  };
};
