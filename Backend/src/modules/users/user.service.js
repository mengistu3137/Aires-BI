import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { sanitizeUserRecord, getRolePermissions } from "./user.helpers.js";

export const getAll = async (query = {}) => {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.active !== undefined) where.active = query.active === "true";

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    ...sanitizeUserRecord(u),
    permissions: getRolePermissions(u.role),
  }));
};

export const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new ApiError(404, `User with ID '${id}' not found`);
  }

  return {
    ...sanitizeUserRecord(user),
    permissions: getRolePermissions(user.role),
  };
};

export const create = async (payload) => {
  const existingPhone = await prisma.user.findUnique({
    where: { phone: payload.phone },
  });
  if (existingPhone) {
    throw new ApiError(409, `User with phone '${payload.phone}' already exists.`);
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const { password, ...data } = payload;

  const newUser = await prisma.user.create({
    data: {
      ...data,
      passwordHash,
    },
  });

  return sanitizeUserRecord(newUser);
};

export const update = async (id, payload) => {
  await getById(id);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: payload,
  });

  return sanitizeUserRecord(updatedUser);
};

export const userService = {
  getAll,
  getById,
  create,
  update,
};