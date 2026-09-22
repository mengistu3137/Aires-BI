/**
 * Checks if two half-open date intervals [startA, endA) and [startB, endB) overlap.
 * Null represents positive infinity (open-ended).
 *
 * Overlap condition:
 * (endB is null OR startA < endB) AND (endA is null OR endA > startB)
 *
 * @param {Date} startA
 * @param {Date|null} endA
 * @param {Date} startB
 * @param {Date|null} endB
 * @returns {boolean}
 */
export const periodsOverlap = (startA, endA, startB, endB) => {
  const sA = new Date(startA).getTime();
  const eA = endA ? new Date(endA).getTime() : null;
  const sB = new Date(startB).getTime();
  const eB = endB ? new Date(endB).getTime() : null;

  const aStartsBeforeBEnds = eB === null || sA < eB;
  const aEndsAfterBStarts = eA === null || eA > sB;

  return aStartsBeforeBEnds && aEndsAfterBStarts;
};

/**
 * Checks whether a given timestamp falls within [effectiveFrom, effectiveTo).
 *
 * @param {Date} targetDate
 * @param {Date} effectiveFrom
 * @param {Date|null} effectiveTo
 * @returns {boolean}
 */
export const isEffectiveAt = (targetDate, effectiveFrom, effectiveTo) => {
  const t = new Date(targetDate).getTime();
  const from = new Date(effectiveFrom).getTime();
  const to = effectiveTo ? new Date(effectiveTo).getTime() : null;

  if (t < from) return false;
  if (to !== null && t >= to) return false;
  return true;
};

/**
 * Formats a QueensPrice Prisma model into a clean JSON response DTO.
 * Guarantees standard Decimal serialization and strips sensitive internal relations.
 */
export const formatQueensPriceResponse = (qp) => {
  if (!qp) return null;

  const now = new Date();
  const isCurrent = isEffectiveAt(now, qp.effectiveFrom, qp.effectiveTo);
  const isFuture = new Date(qp.effectiveFrom) > now;
  const isExpired = qp.effectiveTo ? new Date(qp.effectiveTo) <= now : false;

  return {
    id: qp.id,
    productId: qp.productId,
    price:
      qp.price !== null && qp.price !== undefined ? Number(qp.price) : null,
    effectiveFrom: qp.effectiveFrom,
    effectiveTo: qp.effectiveTo,
    status: isCurrent ? "CURRENT" : isFuture ? "SCHEDULED" : "EXPIRED",
    source: qp.source,
    notes: qp.notes,
    product: qp.product
      ? {
          id: qp.product.id,
          name: qp.product.name,
          sku: qp.product.sku,
          barcode: qp.product.barcode,
          category: qp.product.category,
          unit: qp.product.unit,
          active: qp.product.active,
        }
      : undefined,
    createdAt: qp.createdAt,
    updatedAt: qp.updatedAt,
  };
};
