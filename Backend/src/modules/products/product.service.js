import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildProductFilter } from "./product.helpers.js";

export const getAll = async (query = {}) => {
  const where = buildProductFilter(query);
  return prisma.product.findMany({
    where,
    orderBy: { id: "asc" },
  });
};

export const getById = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new ApiError(404, `Product with ID '${id}' not found`);
  }

  return product;
};

export const create = async (payload) => {
  const exists = await prisma.product.findUnique({
    where: { id: payload.id },
  });

  if (exists) {
    throw new ApiError(409, `Product with ID '${payload.id}' already exists.`);
  }

  return prisma.product.create({
    data: payload,
  });
};

export const update = async (id, payload) => {
  await getById(id);
  return prisma.product.update({
    where: { id },
    data: payload,
  });
};

export const remove = async (id) => {
  await getById(id);
  return prisma.product.delete({
    where: { id },
  });
};

export const productService = {
  getAll,
  getById,
  create,
  update,
  remove,
};