import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import {
  periodsOverlap,
  formatQueensPriceResponse,
} from "./queens-price.helper.js";

const QUEENS_PRICE_INCLUDE_RELATIONS = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      category: true,
      unit: true,
      active: true,
    },
  },
};

/**
 * Checks if a candidate price interval overlaps with any existing QueensPrice for that product.
 * Excludes self (excludeId) when validating updates.
 */
export const checkOverlap = async (
  productId,
  newFrom,
  newTo,
  excludeId = null,
) => {
  const where = {
    productId,
    ...(excludeId ? { id: { not: excludeId } } : {}),
  };

  // Database-level pre-filter using interval logic:
  // [startA, endA) overlaps with [newFrom, newTo) if:
  // (newTo is null OR startA < newTo) AND (endA is null OR endA > newFrom)
  const overlapConditions = [
    {
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: newFrom } }],
    },
  ];

  if (newTo !== null) {
    overlapConditions.push({
      effectiveFrom: { lt: newTo },
    });
  }

  where.AND = overlapConditions;

  const overlappingRecord = await prisma.queensPrice.findFirst({
    where,
    select: {
      id: true,
      price: true,
      effectiveFrom: true,
      effectiveTo: true,
    },
  });

  return overlappingRecord;
};

/**
 * Creates a new benchmark QueensPrice record.
 * Validates product existence, active status, date range semantics, and non-overlap.
 */
export const createQueensPrice = async ({
  productId,
  price,
  effectiveFrom,
  effectiveTo = null,
  source = null,
  notes = null,
}) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  if (!product.active) {
    throw new ApiError(
      400,
      `Cannot create benchmark price for inactive product [${product.name}]`,
    );
  }

  const fromDate = new Date(effectiveFrom);
  const toDate = effectiveTo ? new Date(effectiveTo) : null;

  // Check for overlapping period
  const conflict = await checkOverlap(productId, fromDate, toDate);
  if (conflict) {
    const conflictTo = conflict.effectiveTo
      ? conflict.effectiveTo.toISOString()
      : "Open-ended (null)";
    throw new ApiError(
      409,
      `Price period overlaps with existing benchmark [${conflict.id}] effective from ${conflict.effectiveFrom.toISOString()} to ${conflictTo}`,
    );
  }

  const record = await prisma.queensPrice.create({
    data: {
      productId,
      price,
      effectiveFrom: fromDate,
      effectiveTo: toDate,
      source: source?.trim() || null,
      notes: notes?.trim() || null,
    },
    include: QUEENS_PRICE_INCLUDE_RELATIONS,
  });

  return formatQueensPriceResponse(record);
};

/**
 * Resolves the currently active benchmark price for a product.
 * Returns null if no benchmark is effective at the present time.
 */
export const getCurrentQueensPrice = async (productId) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  const now = new Date();

  const currentPrice = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: now },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: QUEENS_PRICE_INCLUDE_RELATIONS,
  });

  if (!currentPrice) {
    return null;
  }

  return formatQueensPriceResponse(currentPrice);
};

/**
 * Resolves the benchmark price effective at an exact historical or future date.
 * Essential for accurate historical PriceAnalysis calculation.
 */
export const getQueensPriceAtDate = async (productId, dateInput) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  const targetDate = new Date(dateInput);
  if (Number.isNaN(targetDate.getTime())) {
    throw new ApiError(400, "Invalid date parameter format");
  }

  const priceRecord = await prisma.queensPrice.findFirst({
    where: {
      productId,
      effectiveFrom: { lte: targetDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: targetDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
    include: QUEENS_PRICE_INCLUDE_RELATIONS,
  });

  if (!priceRecord) {
    return null;
  }

  return formatQueensPriceResponse(priceRecord);
};

/**
 * Retrieves full historical timeline of benchmark prices for a product.
 */
export const getProductQueensPriceHistory = async (productId, query = {}) => {
  const { page: rawPage = 1, limit: rawLimit = 20, from, to } = query;

  // Sanitize and explicitly parse pagination parameters to ensure integer types for Prisma
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new ApiError(404, `Product [${productId}] not found`);
  }

  const where = { productId };

  if (from || to) {
    where.effectiveFrom = {};
    if (from) {
      where.effectiveFrom.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
        toDate.setUTCHours(23, 59, 59, 999);
      }
      where.effectiveFrom.lte = toDate;
    }
  }

  const skip = (page - 1) * limit;

  const [total, records] = await prisma.$transaction([
    prisma.queensPrice.count({ where }),
    prisma.queensPrice.findMany({
      where,
      skip,
      take: limit, // Explicit Int
      orderBy: { effectiveFrom: "desc" },
      include: QUEENS_PRICE_INCLUDE_RELATIONS,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: records.map(formatQueensPriceResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Retrieves a single QueensPrice by its ID.
 */
export const getQueensPriceById = async (id) => {
  const record = await prisma.queensPrice.findUnique({
    where: { id },
    include: QUEENS_PRICE_INCLUDE_RELATIONS,
  });

  if (!record) {
    throw new ApiError(404, "QueensPrice record not found");
  }

  return formatQueensPriceResponse(record);
};

/**
 * Lists benchmark prices across products with optional filtering.
 */
export const listQueensPrices = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    productId,
    current,
    from,
    to,
  } = query;

  // Sanitize and explicitly parse pagination parameters to ensure integer types for Prisma
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));

  const where = {};

  if (productId) {
    where.productId = productId;
  }

  const now = new Date();
  const isCurrentFilter = current === true || current === "true";

  if (isCurrentFilter) {
    where.effectiveFrom = { lte: now };
    where.OR = [{ effectiveTo: null }, { effectiveTo: { gt: now } }];
  } else {
    if (from || to) {
      where.effectiveFrom = {};
      if (from) {
        where.effectiveFrom.gte = new Date(from);
      }
      if (to) {
        const toDate = new Date(to);
        if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
          toDate.setUTCHours(23, 59, 59, 999);
        }
        where.effectiveFrom.lte = toDate;
      }
    }
  }

  const skip = (page - 1) * limit;

  const [total, records] = await prisma.$transaction([
    prisma.queensPrice.count({ where }),
    prisma.queensPrice.findMany({
      where,
      skip,
      take: limit, // Explicit Int prevents PrismaClientValidationError
      orderBy: { effectiveFrom: "desc" },
      include: QUEENS_PRICE_INCLUDE_RELATIONS,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data: records.map(formatQueensPriceResponse),
    meta: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Updates a QueensPrice record.
 * Enforces historical immutability: past/expired records cannot have their price or dates rewritten.
 */
export const updateQueensPrice = async (id, updates) => {
  const existing = await prisma.queensPrice.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "QueensPrice record not found");
  }

  const now = new Date();
  const isExpired =
    existing.effectiveTo !== null && new Date(existing.effectiveTo) <= now;

  const isChangingPrice =
    updates.price !== undefined &&
    Number(updates.price) !== Number(existing.price);
  const isChangingDates =
    (updates.effectiveFrom &&
      new Date(updates.effectiveFrom).getTime() !==
        new Date(existing.effectiveFrom).getTime()) ||
    (updates.effectiveTo !== undefined &&
      (updates.effectiveTo === null
        ? existing.effectiveTo !== null
        : new Date(updates.effectiveTo).getTime() !==
          new Date(existing.effectiveTo).getTime()));

  // Historical Immutability check
  if (isExpired && (isChangingPrice || isChangingDates)) {
    throw new ApiError(
      409,
      "Historical/expired benchmark prices are immutable. Price and dates cannot be changed once the period has passed. Create a new price record instead.",
    );
  }

  const effectiveFrom = updates.effectiveFrom
    ? new Date(updates.effectiveFrom)
    : existing.effectiveFrom;
  const effectiveTo =
    updates.effectiveTo !== undefined
      ? updates.effectiveTo
        ? new Date(updates.effectiveTo)
        : null
      : existing.effectiveTo;

  if (effectiveTo && effectiveTo <= effectiveFrom) {
    throw new ApiError(400, "effectiveTo must be strictly after effectiveFrom");
  }

  // If changing dates, verify no overlaps with other periods
  if (isChangingDates) {
    const conflict = await checkOverlap(
      existing.productId,
      effectiveFrom,
      effectiveTo,
      id,
    );
    if (conflict) {
      throw new ApiError(
        409,
        `Updated date interval overlaps with existing record [${conflict.id}]`,
      );
    }
  }

  const updated = await prisma.queensPrice.update({
    where: { id },
    data: {
      price: updates.price !== undefined ? updates.price : existing.price,
      effectiveFrom,
      effectiveTo,
      source:
        updates.source !== undefined ? updates.source?.trim() : existing.source,
      notes:
        updates.notes !== undefined ? updates.notes?.trim() : existing.notes,
    },
    include: QUEENS_PRICE_INCLUDE_RELATIONS,
  });

  return formatQueensPriceResponse(updated);
};

/**
 * Deletes a QueensPrice record.
 * Strictly prevents deletion of active or historical records to maintain integrity.
 * Only scheduled future benchmarks can be deleted.
 */
export const deleteQueensPrice = async (id) => {
  const existing = await prisma.queensPrice.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(404, "QueensPrice record not found");
  }

  const now = new Date();
  const hasStarted = new Date(existing.effectiveFrom) <= now;

  if (hasStarted) {
    throw new ApiError(
      409,
      "Cannot delete current or historical benchmark prices. Active and past benchmark history must be preserved for price analysis.",
    );
  }

  await prisma.queensPrice.delete({
    where: { id },
  });

  return { message: "Scheduled benchmark price deleted successfully" };
};

export const queensPriceService = {
  createQueensPrice,
  getCurrentQueensPrice,
  getQueensPriceAtDate,
  getProductQueensPriceHistory,
  getQueensPriceById,
  listQueensPrices,
  updateQueensPrice,
  deleteQueensPrice,
  checkOverlap,
};
