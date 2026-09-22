import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { sanitizeUserRecord, getRolePermissions } from "./user.helpers.js";

export const getAll = async (query = {}) => {
  const where = {};
  if (query.role) where.role = query.role;
  if (query.active !== undefined) where.active = query.active === "true";
  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: "insensitive" } },
      { phone: { contains: query.search, mode: "insensitive" } },
      { email: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          assignments: true,
          createdAudits: true,
          observations: true,
        },
      },
    },
  });

  return users.map((u) => ({
    ...sanitizeUserRecord(u),
    permissions: getRolePermissions(u.role),
    stats: u._count,
  }));
};

export const getById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          assignments: true,
          createdAudits: true,
          observations: true,
        },
      },
    },
  });

  if (!user) {
    throw new ApiError(404, `User '${id}' not found`);
  }

  return {
    ...sanitizeUserRecord(user),
    permissions: getRolePermissions(user.role),
    stats: user._count,
  };
};

export const create = async (payload) => {
  const existingPhone = await prisma.user.findUnique({
    where: { phone: payload.phone },
  });
  if (existingPhone) {
    throw new ApiError(409, `User with phone '${payload.phone}' already exists.`);
  }

  if (payload.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
    });
    if (existingEmail) {
      throw new ApiError(409, `User with email '${payload.email}' already exists.`);
    }
  }

  const passwordHash = await bcrypt.hash(payload.password, 10);
  const { password, ...data } = payload;

  const newUser = await prisma.user.create({
    data: {
      ...data,
      email: data.email ? data.email.toLowerCase() : null,
      passwordHash,
    },
  });

  return sanitizeUserRecord(newUser);
};

export const update = async (id, payload) => {
  await getById(id);

  if (payload.phone) {
    const duplicate = await prisma.user.findFirst({
      where: { phone: payload.phone, NOT: { id } },
    });
    if (duplicate) {
      throw new ApiError(409, `Phone number '${payload.phone}' is already in use by another user.`);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...payload,
      email: payload.email ? payload.email.toLowerCase() : undefined,
    },
  });

  return sanitizeUserRecord(updatedUser);
};

export const remove = async (id) => {
  const user = await getById(id);

  // Referential check: prevent deletion if historical audits exist
  if (user.stats?.createdAudits > 0 || user.stats?.observations > 0) {
    // Graceful deactivation instead of breaking audit history
    await prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return {
      deactivated: true,
      message: "User has historical field audit records. Account has been deactivated instead of permanently deleted.",
    };
  }

  await prisma.user.delete({ where: { id } });
  return { deleted: true, message: "User deleted successfully." };
};

export const userService = {
  getAll,
  getById,
  create,
  update,
  remove,
};