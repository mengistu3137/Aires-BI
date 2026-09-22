import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { formatProductWithActivePrice, buildProductFilter } from "./product.helpers.js";

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

  const exists = await prisma.product.findUnique({ where: { id: productData.id } });
  if (exists) {
    throw new ApiError(409, `Product with ID '${productData.id}' already exists.`);
  }

  const createdProduct = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.create({
      data: productData,
    });

    await tx.queensPrice.create({
      data: {
        productId: prod.id,
        price: initialQueensPrice,
        effectiveFrom: priceEffectiveFrom ? new Date(priceEffectiveFrom) : new Date(),
        source: "Initial Creation",
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

export const update = async (id, payload) => {
  await getById(id);
  const updated = await prisma.product.update({
    where: { id },
    data: payload,
    include: {
      queensPrices: { orderBy: { effectiveFrom: "desc" }, take: 1 },
    },
  });
  return formatProductWithActivePrice(updated);
};

export const remove = async (id) => {
  await getById(id);
  return prisma.product.delete({ where: { id } });
};

export const productService = {
  getAll,
  getById,
  create,
  addPriceRecord,
  update,
  remove,
};