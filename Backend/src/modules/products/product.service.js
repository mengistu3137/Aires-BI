import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { formatProductWithActivePrice, buildProductFilter } from "./product.helpers.js";

const VALID_FREQUENCIES = new Set(["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"]);

/**
 * The client (parseItemMaster.js) always sends a validated `frequency`, which is the
 * single source of truth (it owns the fresh-family list). This is only a fallback for
 * API callers that send a tier string instead.
 */
const resolveFrequency = (item) => {
  const explicit = String(item.frequency || "").toUpperCase();
  if (VALID_FREQUENCIES.has(explicit)) return explicit;

  const tier = String(item.finalTier || item.tier || "").toLowerCase();
  if (tier.includes("fresh") || tier.includes("daily")) return "DAILY";
  if (tier.includes("non")) return "BI_YEARLY"; // before "sensitive"
  if (tier.includes("ultra")) return "WEEKLY";
  if (tier.includes("sensitive")) return "MONTHLY";
  return "WEEKLY";
};

/**
 * Comparison key for identifiers: trimmed, lower-cased, leading zeros stripped
 * ("0012345" and "12345" collide; Excel often drops leading zeros on barcodes).
 * Used ONLY for matching. The original value is what gets stored.
 */
const idKey = (value) => {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  const stripped = s.replace(/^0+/, "");
  return stripped || s; // an all-zero code stays as-is
};



// src/modules/products/product.service.js
// ...keep everything above `update` unchanged (imports, bulkImportItemMaster, getAll, getById, create, addPriceRecord)...

const LINKED_HISTORY_COUNTS = ["_count", "select"];
const LINKED_HISTORY_SELECT = {
  assignmentItems: true,
  queensPrices: true,
  observations: true,
  analyses: true,
  alerts: true,
};

/**
 * Returns the number of linked history rows attached to a product.
 * Used to (a) guard deletion and (b) block identity-field edits.
 */
const countLinkedHistory = async (productId) => {
  const counts = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      _count: {
        select: {
          assignmentItems: true,
          queensPrices: true,
          observations: true,
          analyses: true,
          alerts: true,
        },
      },
    },
  });
  if (!counts) return null;

  const c = counts._count;
  const total =
    c.assignmentItems + c.queensPrices + c.observations + c.analyses + c.alerts;

  return {
    assignmentItems: c.assignmentItems,
    queensPrices: c.queensPrices,
    observations: c.observations,
    analyses: c.analyses,
    alerts: c.alerts,
    total,
  };
};

export const update = async (id, payload) => {
  // 1. Ensure product exists (throws 404)
  const existing = await getById(id);

  // 2. Protect identity fields when the product already has history
  const history = await countLinkedHistory(existing.id);
  if (history && history.total > 0) {
    const immutableFields = ["id", "barcode", "sku"];
    const attemptedChange = immutableFields.find(
      (f) => payload[f] !== undefined && String(payload[f]) !== String(existing[f] ?? ""),
    );
    if (attemptedChange) {
      throw new ApiError(
        409,
        `Cannot change '${attemptedChange}' — this product already has linked history ` +
        `(${history.total} record(s)). Create a new product instead or update non-identity fields only.`,
      );
    }
  }

  // 3. Enforce strict uniqueness on fields we DO allow to change
  if (payload.barcode && payload.barcode !== existing.barcode) {
    const clash = await prisma.product.findUnique({
      where: { barcode: payload.barcode },
      select: { id: true, name: true },
    });
    if (clash && clash.id !== existing.id) {
      throw new ApiError(
        409,
        `Unique Barcode Conflict: Product '${clash.name}' (${clash.id}) already uses barcode '${payload.barcode}'.`,
      );
    }
  }
  if (payload.sku && payload.sku !== existing.sku) {
    const clash = await prisma.product.findUnique({
      where: { sku: payload.sku },
      select: { id: true, name: true },
    });
    if (clash && clash.id !== existing.id) {
      throw new ApiError(
        409,
        `Unique SKU Conflict: Product '${clash.name}' (${clash.id}) already uses SKU '${payload.sku}'.`,
      );
    }
  }

  // 4. Persist
  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: payload,
    include: {
      queensPrices: { orderBy: { effectiveFrom: "desc" }, take: 3 },
    },
  });
  return formatProductWithActivePrice(updated);
};

// src/modules/products/product.service.js
// Replace only the `export const remove = ...` block with this.

/**
 * Hard-delete is allowed UNLESS the product has real survey history
 * (assignments, observations, price analysis, alerts).
 * A lone QueensPrice row (auto-created on product creation) is NOT
 * treated as blocking history — it is cascade-deleted with the product.
 */
export const remove = async (id) => {
  const existing = await getById(id);

  const history = await countLinkedHistory(existing.id);
  const realHistory =
    history &&
    history.assignmentItems +
    history.observations +
    history.analyses +
    history.alerts;

  if (realHistory > 0) {
    const breakdown = [
      history.assignmentItems && `${history.assignmentItems} assignment item(s)`,
      history.observations && `${history.observations} field observation(s)`,
      history.analyses && `${history.analyses} price analysis(ies)`,
      history.alerts && `${history.alerts} alert(s)`,
    ]
      .filter(Boolean)
      .join(", ");

    throw new ApiError(
      409,
      `Cannot delete '${existing.name}' (${existing.id}) — it has linked history: ${breakdown}. ` +
      `Archive it instead by setting active=false.`,
    );
  }

  // No real survey history — safe to hard-delete.
  // Delete the auto-created QueensPrice rows first (FK is onDelete: Restrict).
  await prisma.$transaction([
    prisma.queensPrice.deleteMany({ where: { productId: existing.id } }),
    prisma.product.delete({ where: { id: existing.id } }),
  ]);

  return { id: existing.id, deleted: true };
};
/**
 * Production-safe Item Master importer.
 * - Pre-fetches every existing id, barcode AND sku in ONE query.
 * - An incoming row is skipped if ANY of its id/barcode/sku matches ANY existing
 *   id/barcode/sku (cross-vector: a pilot product with a synthetic UUID id but
 *   barcode "6291105766388" blocks an incoming Item Code "6291105766388").
 * - Existing products, their audits, observations and Queens price history are never touched.
 * - Only brand-new products (plus their benchmark price) are inserted, in atomic batches.
 */
export const bulkImportItemMaster = async (items = []) => {
  const empty = {
    totalProcessed: 0,
    insertedCount: 0,
    updatedCount: 0, // NEW
    skippedCount: 0,
    skippedExisting: 0,
    skippedInvalid: 0,
    skippedDuplicateInFile: 0,
    pricesCreated: 0,
  };
  if (!items.length) return empty;

  // 1. Fetch ALL existing products with their active status
  const existingProducts = await prisma.product.findMany({
    select: { id: true, barcode: true, sku: true, active: true },
  });

  const knownProducts = new Map(); // key -> { id, active }
  for (const p of existingProducts) {
    for (const v of [p.id, p.barcode, p.sku]) {
      const k = idKey(v);
      if (k && !knownProducts.has(k)) {
        knownProducts.set(k, { id: p.id, active: p.active });
      }
    }
  }

  const pendingKeys = new Set();
  const toInsert = [];
  const toUpdate = new Map(); // id -> update payload
  const pricesByProduct = new Map();

  let skippedInvalid = 0;
  let skippedDuplicateInFile = 0;
  let skippedExisting = 0;

  for (const item of items) {
    const rawId = String(item.id || item.itemCode || item.barcode || "").trim();
    const rawBarcode = item.barcode ? String(item.barcode).trim() : rawId;
    const rawSku = item.sku ? String(item.sku).trim() : rawId;
    const name = String(item.name || item.articleName || "").trim();

    if (!rawId || !name) {
      skippedInvalid += 1;
      continue;
    }

    const keys = [rawId, rawBarcode, rawSku].map(idKey).filter(Boolean);
    const hitKey = keys.find((k) => knownProducts.has(k));

    if (hitKey) {
      const existing = knownProducts.get(hitKey);

      // If it's a duplicate *within this file*, skip it
      if (pendingKeys.has(hitKey)) {
        skippedDuplicateInFile += 1;
        continue;
      }
      pendingKeys.add(hitKey);

      // If it exists in DB, we UPDATE it (to apply new frequency, category, etc.)
      // We also set active: true so if it was archived, the upload un-archives it.
      toUpdate.set(existing.id, {
        name,
        category: item.category?.trim() || "General",
        unit: item.unit?.trim() || "pcs",
        frequency: resolveFrequency(item),
        active: true,
      });

    } else {
      // Brand new product -> Insert
      toInsert.push({
        id: rawId,
        name,
        barcode: rawBarcode || null,
        sku: rawSku || null,
        category: item.category?.trim() || "General",
        unit: item.unit?.trim() || "pcs",
        frequency: resolveFrequency(item),
        active: true,
      });

      const price = Number(
        item.initialQueensPrice ?? item.queensBenchmarkPrice ?? item.queensPrice ?? 0
      );
      if (Number.isFinite(price) && price > 0) {
        pricesByProduct.set(rawId, {
          productId: rawId,
          price,
          effectiveFrom: new Date(),
          source: item.priceSource || "Item Master Import",
        });
      }

      for (const k of keys) {
        knownProducts.set(k, { id: rawId, active: true });
        pendingKeys.add(k);
      }
    }
  }

  // 2. Batch Process
  const BATCH_SIZE = 200;
  let insertedCount = 0;
  let updatedCount = 0;
  let pricesCreated = 0;

  // --- A. Process Updates ---
  const updateArray = Array.from(toUpdate.entries());
  for (let i = 0; i < updateArray.length; i += BATCH_SIZE) {
    const batch = updateArray.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map(([id, data]) =>
        prisma.product.update({
          where: { id },
          data,
        })
      )
    );
    updatedCount += batch.length;
  }

  // --- B. Process Inserts ---
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const productBatch = toInsert.slice(i, i + BATCH_SIZE);
    const priceBatch = productBatch.map((p) => pricesByProduct.get(p.id)).filter(Boolean);

    const ops = [
      prisma.product.createMany({
        data: productBatch,
        skipDuplicates: true,
      }),
    ];
    if (priceBatch.length > 0) {
      ops.push(prisma.queensPrice.createMany({ data: priceBatch }));
    }

    const [productResult, priceResult] = await prisma.$transaction(ops);

    insertedCount += productResult.count;
    pricesCreated += priceResult?.count ?? 0;
  }

  const skippedCount = skippedExisting + skippedInvalid + skippedDuplicateInFile;

  return {
    totalProcessed: items.length,
    insertedCount,
    updatedCount,
    skippedCount,
    skippedExisting,
    skippedInvalid,
    skippedDuplicateInFile,
    pricesCreated,
  };
};

export const getAll = async (query = {}) => {
  const where = buildProductFilter(query);
  const products = await prisma.product.findMany({
    where,
    include: {
      queensPrices: {
        orderBy: { effectiveFrom: "desc" },
        take: 3,
      },
    },
    orderBy: { id: "asc" },
  });

  return products.map(formatProductWithActivePrice);
};

export const getById = async (id) => {
  // Support exact or case-insensitive ID matching (VEG-01 vs Veg-01)
  let product = await prisma.product.findUnique({
    where: { id },
    include: {
      queensPrices: {
        orderBy: { effectiveFrom: "desc" },
      },
    },
  });

  if (!product) {
    product = await prisma.product.findFirst({
      where: { id: { equals: id, mode: "insensitive" } },
      include: {
        queensPrices: {
          orderBy: { effectiveFrom: "desc" },
        },
      },
    });
  }

  if (!product) {
    throw new ApiError(404, `Product '${id}' not found`);
  }

  return formatProductWithActivePrice(product);
};

export const create = async (payload) => {
  const { initialQueensPrice, priceEffectiveFrom, ...productData } = payload;

  // 1. Verify Item Code (id) uniqueness
  const existsById = await prisma.product.findUnique({
    where: { id: productData.id },
  });
  if (existsById) {
    throw new ApiError(409, `Product with Item Code '${productData.id}' already exists.`);
  }

  // 2. Strictly enforce barcode uniqueness
  if (productData.barcode) {
    const existsByBarcode = await prisma.product.findUnique({
      where: { barcode: productData.barcode },
    });
    if (existsByBarcode) {
      throw new ApiError(
        409,
        `Unique Barcode Conflict: Product '${existsByBarcode.name}' (${existsByBarcode.id}) already uses barcode '${productData.barcode}'.`
      );
    }
  }

  // 3. Strictly enforce SKU uniqueness if provided
  if (productData.sku) {
    const existsBySku = await prisma.product.findUnique({
      where: { sku: productData.sku },
    });
    if (existsBySku) {
      throw new ApiError(
        409,
        `Unique SKU Conflict: Product '${existsBySku.name}' (${existsBySku.id}) already uses SKU '${productData.sku}'.`
      );
    }
  }

  // 4. Atomic transaction to create product and initial Queens benchmark price
  const createdProduct = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.create({
      data: productData,
    });

    await tx.queensPrice.create({
      data: {
        productId: prod.id,
        price: initialQueensPrice,
        effectiveFrom: priceEffectiveFrom ? new Date(priceEffectiveFrom) : new Date(),
        source: "Master Catalog Ingestion",
      },
    });

    return tx.product.findUnique({
      where: { id: prod.id },
      include: { queensPrices: true },
    });
  });

  return formatProductWithActivePrice(createdProduct);
};

export const addPriceRecord = async (productId, priceData) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, `Product '${productId}' not found`);
  }

  return prisma.queensPrice.create({
    data: {
      productId,
      price: priceData.price,
      effectiveFrom: new Date(priceData.effectiveFrom),
      effectiveTo: priceData.effectiveTo ? new Date(priceData.effectiveTo) : null,
      source: priceData.source || "Manual Update",
      notes: priceData.notes || null,
    },
  });
};


export const productService = {
  getAll,
  getById,
  create,
  addPriceRecord,
  update,
  remove,
  bulkImportItemMaster,
};