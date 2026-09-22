import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { buildProductFilter } from "./product.helpers.js";

export class ProductService {
  static async getAll(query = {}) {
    const where = buildProductFilter(query);
    return prisma.product.findMany({
      where,
      orderBy: { id: "asc" },
    });
  }

  static async getById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new ApiError(404, `Product with ID '${id}' not found`);
    }

    return product;
  }

  static async create(payload) {
    const exists = await prisma.product.findUnique({
      where: { id: payload.id },
    });

    if (exists) {
      throw new ApiError(409, `Product with ID '${payload.id}' already exists.`);
    }

    return prisma.product.create({
      data: payload,
    });
  }

  static async update(id, payload) {
    await this.getById(id);
    return prisma.product.update({
      where: { id },
      data: payload,
    });
  }

  static async delete(id) {
    await this.getById(id);
    return prisma.product.delete({
      where: { id },
    });
  }
}