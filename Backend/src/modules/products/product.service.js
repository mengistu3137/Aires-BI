// src/modules/products/product.service.js
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { formatProductName } from "../report/report.utils.js";
import { buildProductFilter } from "./product.helpers.js";

const VALID_FREQUENCIES = new Set(["DAILY", "WEEKLY", "MONTHLY", "BI_YEARLY"]);

const FRESH_KEYWORDS = [
  "fresh", "produce", "vegetable", "fruit", "meat", "poultry", "butchery", "dairy", "bakery",
];

/**
 * NOTE: if you already define/import formatProductWithActivePrice elsewhere,
 * delete this copy and import yours instead.
 */
const formatProductWithActivePrice = (product) => {
  const prices = product.queensPrices || [];
  const active =
    prices.find((p) => !p.effectiveTo) || prices[0] || null; // prices are sorted desc by effectiveFrom
  return {
    ...product,
    currentQueensPrice: active ? Number(active.price) : 0,
    priceHistoryCount: prices.length,
  };
};

const resolveFrequency = (item) => {
  const explicit = String(item.frequency || "").toUpperCase();
  if (VALID_FREQUENCIES.has(explicit)) return explicit;

  const tier = String(item.finalTier || item.tier || "").toLowerCase();
  const category = String(item.category || "").toLowerCase();
  const id = String(item.itemCode || item.id || "").toLowerCase();

  if (
    tier.includes("fresh") ||
    tier.includes("daily") ||
    FRESH_KEYWORDS.some((kw) => category.includes(kw)) ||
    id.startsWith("veg-") ||
    id.startsWith("fru-") ||
    id.startsWith("mea-") ||
    id.startsWith("dlp-")
  ) {
    return "DAILY";
  }

  if (tier.includes("non")) return "BI_YEARLY";
  if (tier.includes("ultra")) return "WEEKLY";
  if (tier.includes("sensitive")) return "MONTHLY";
  return "WEEKLY";
};

const idKey = (value) => {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return "";
  const stripped = s.replace(/^0+/, "");
  return stripped || s;
};

const cleanName = (str) =>
  String(str ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Item Master importer.
 * - Matches existing products by id / barcode / sku.
 * - Daily-tier items may also match legacy pilot products by clean name
 *   (e.g. "Red Onion" <-> DLP-VEG-01); the pilot product then adopts the real Item Code.
 * - Updates sortOrder (SortedBy), Title Case name, frequency. Never changes primary id,
 *   so history stays linked.
 */
export const bulkImportItemMaster = async (items = []) => {
  const empty = {
    totalProcessed: 0, insertedCount: 0, updatedCount: 0, skippedCount: 0,
    skippedExisting: 0, skippedInvalid: 0, skippedDuplicateInFile: 0, pricesCreated: 0,
  };
  if (!items.length) return empty;

  const existingProducts = await prisma.product.findMany({
    select: {
      id: true, name: true, barcode: true, sku: true, category: true,
      unit: true, frequency: true, sortOrder: true, active: true,
    },
  });

  const knownProducts = new Map();
  const nameToProduct = new Map(); // Daily products only

  for (const p of existingProducts) {
    const cName = cleanName(p.name);
    if (cName && p.frequency === "DAILY" && !nameToProduct.has(cName)) {
      nameToProduct.set(cName, p);
    }
    for (const v of [p.id, p.barcode, p.sku]) {
      const k = idKey(v);
      if (k && !knownProducts.has(k)) knownProducts.set(k, p);
    }
  }

  const claimed = new Set();
  const seenNew = new Set();
  const toInsert = [];
  const toUpdate = new Map();
  const pricesByProduct = new Map();

  let skippedInvalid = 0;
  let skippedDuplicateInFile = 0;

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
    const targetFrequency =
      item.frequency && VALID_FREQUENCIES.has(item.frequency)
        ? item.frequency
        : resolveFrequency(item);
    const sortOrder = Number(item.sortOrder || 0);

    let existing = keys.map((k) => knownProducts.get(k)).find(Boolean);
    let matchedByName = false;

    if (!existing && targetFrequency === "DAILY") {
      const hit = nameToProduct.get(cleanName(name));
      if (hit && !claimed.has(hit.id)) {
        existing = hit;
        matchedByName = true;
      }
    }

    if (existing) {
      if (claimed.has(existing.id)) {
        skippedDuplicateInFile += 1;
        continue;
      }
      claimed.add(existing.id);

      toUpdate.set(existing.id, {
        name: formatProductName(name),
        barcode: matchedByName ? rawBarcode : existing.barcode || rawBarcode,
        sku: matchedByName ? rawSku : existing.sku || rawSku,
        category: item.category?.trim() || existing.category || "General",
        unit: item.unit?.trim() || existing.unit || "pcs",
        frequency: targetFrequency,
        sortOrder: sortOrder > 0 ? sortOrder : existing.sortOrder || 0,
        active: true,
      });
      for (const k of keys) knownProducts.set(k, existing);
    } else {
      if (seenNew.has(idKey(rawId))) {
        skippedDuplicateInFile += 1;
        continue;
      }
      seenNew.add(idKey(rawId));

      toInsert.push({
        id: rawId,
        name: formatProductName(name),
        barcode: rawBarcode || null,
        sku: rawSku || null,
        category: item.category?.trim() || "General",
        unit: item.unit?.trim() || "pcs",
        frequency: targetFrequency,
        sortOrder: sortOrder > 0 ? sortOrder : 0,
        active: true,
      });

      const price = Number(
        item.initialQueensPrice ?? item.queensBenchmarkPrice ?? item.queensPrice ?? 0,
      );
      if (Number.isFinite(price) && price > 0) {
        pricesByProduct.set(rawId, {
          productId: rawId,
          price,
          effectiveFrom: new Date(),
          source: item.priceSource || "Item Master Import",
        });
      }
      for (const k of keys) knownProducts.set(k, { id: rawId, active: true });
    }
  }

  const BATCH_SIZE = 200;
  let insertedCount = 0;
  let updatedCount = 0;
  let pricesCreated = 0;

  const updateArray = Array.from(toUpdate.entries());
  for (let i = 0; i < updateArray.length; i += BATCH_SIZE) {
    const batch = updateArray.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map(([id, data]) => prisma.product.update({ where: { id }, data })),
    );
    updatedCount += batch.length;
  }

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const productBatch = toInsert.slice(i, i + BATCH_SIZE);
    const priceBatch = productBatch.map((p) => pricesByProduct.get(p.id)).filter(Boolean);

    const ops = [prisma.product.createMany({ data: productBatch, skipDuplicates: true })];
    if (priceBatch.length > 0) {
      ops.push(prisma.queensPrice.createMany({ data: priceBatch }));
    }

    const [productResult, priceResult] = await prisma.$transaction(ops);
    insertedCount += productResult.count;
    pricesCreated += priceResult?.count ?? 0;
  }

  const skippedCount = skippedInvalid + skippedDuplicateInFile;

  return {
    totalProcessed: items.length,
    insertedCount,
    updatedCount,
    skippedCount,
    skippedExisting: 0,
    skippedInvalid,
    skippedDuplicateInFile,
    pricesCreated,
  };
};

// ---------------------------------------------------------------
// History guard
// ---------------------------------------------------------------
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
  return {
    assignmentItems: c.assignmentItems,
    queensPrices: c.queensPrices,
    observations: c.observations,
    analyses: c.analyses,
    alerts: c.alerts,
    total: c.assignmentItems + c.queensPrices + c.observations + c.analyses + c.alerts,
  };
};

// ---------------------------------------------------------------
// READ
// ---------------------------------------------------------------
export const getAll = async (query = {}) => {
  const where = buildProductFilter(query);
  const products = await prisma.product.findMany({
    where,
    include: {
      queensPrices: { orderBy: { effectiveFrom: "desc" }, take: 3 },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return products.map(formatProductWithActivePrice);
};

export const getById = async (id) => {
  let product = await prisma.product.findUnique({
    where: { id },
    include: { queensPrices: { orderBy: { effectiveFrom: "desc" } } },
  });

  if (!product) {
    product = await prisma.product.findFirst({
      where: { id: { equals: id, mode: "insensitive" } },
      include: { queensPrices: { orderBy: { effectiveFrom: "desc" } } },
    });
  }

  if (!product) throw new ApiError(404, `Product '${id}' not found`);
  return formatProductWithActivePrice(product);
};

// ---------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------
export const create = async (payload) => {
  const { initialQueensPrice, priceEffectiveFrom, priceSource, ...productData } = payload;

  const existsById = await prisma.product.findUnique({ where: { id: productData.id } });
  if (existsById) {
    throw new ApiError(409, `Product with Item Code '${productData.id}' already exists.`);
  }

  if (productData.barcode) {
    const clash = await prisma.product.findUnique({ where: { barcode: productData.barcode } });
    if (clash) {
      throw new ApiError(
        409,
        `Unique Barcode Conflict: Product '${clash.name}' (${clash.id}) already uses barcode '${productData.barcode}'.`,
      );
    }
  }

  if (productData.sku) {
    const clash = await prisma.product.findUnique({ where: { sku: productData.sku } });
    if (clash) {
      throw new ApiError(
        409,
        `Unique SKU Conflict: Product '${clash.name}' (${clash.id}) already uses SKU '${productData.sku}'.`,
      );
    }
  }

  const created = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.create({ data: productData });

    await tx.queensPrice.create({
      data: {
        productId: prod.id,
        price: initialQueensPrice,
        effectiveFrom: priceEffectiveFrom ? new Date(priceEffectiveFrom) : new Date(),
        source: priceSource || "Master Catalog Ingestion",
      },
    });

    return tx.product.findUnique({
      where: { id: prod.id },
      include: { queensPrices: true },
    });
  });

  return formatProductWithActivePrice(created);
};

export const addPriceRecord = async (productId, priceData) => {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new ApiError(404, `Product '${productId}' not found`);

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

// ---------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------
export const update = async (id, payload) => {
  const existing = await getById(id);

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

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data: payload,
    include: { queensPrices: { orderBy: { effectiveFrom: "desc" }, take: 3 } },
  });
  return formatProductWithActivePrice(updated);
};

// ---------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------
export const remove = async (id) => {
  const existing = await getById(id);

  const history = await countLinkedHistory(existing.id);
  const realHistory = history
    ? history.assignmentItems + history.observations + history.analyses + history.alerts
    : 0;

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

  await prisma.$transaction([
    prisma.queensPrice.deleteMany({ where: { productId: existing.id } }),
    prisma.product.delete({ where: { id: existing.id } }),
  ]);

  return { id: existing.id, deleted: true };
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