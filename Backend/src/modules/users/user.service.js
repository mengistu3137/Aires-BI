import bcrypt from "bcryptjs";
import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { emitToRoles } from "../../config/socket.js";
import { sanitizeUserRecord, getRolePermissions } from "./user.helpers.js";

export const updateMyLocationPermission = async (userId, permissionStatus) => {
  const allowedStatuses = [
    "ALLOWED",
    "GRANTED",
    "DENIED",
    "PROMPT",
    "NOT_REQUESTED",
  ];

  let status = (permissionStatus || "NOT_REQUESTED").toUpperCase().trim();
  if (status === "ALLOWED") status = "GRANTED";

  if (!allowedStatuses.includes(status)) {
    throw new ApiError(
      400,
      `Invalid GPS status. Must be one of: ${allowedStatuses.join(", ")}`,
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { locationPermission: status },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      locationPermission: true,
      updatedAt: true,
    },
  });

  const payload = {
    userId: updatedUser.id,
    name: updatedUser.name,
    role: updatedUser.role,
    gpsPermissionStatus: updatedUser.locationPermission,
    locationPermission: updatedUser.locationPermission,
    updatedAt: updatedUser.updatedAt.toISOString(),
  };

  try {
    emitToRoles(["ADMIN", "MANAGER"], "user:gps-permission-updated", payload);
  } catch (err) {
    console.warn("⚠️ WebSocket broadcast skipped:", err.message);
  }

  return payload;
};

/**
 * List users with filtering, pagination, and stats counts.
 * Returns { data, meta } — the controller forwards meta to the client.
 */
export const getAll = async (query = {}) => {
  const {
    page: rawPage = 1,
    limit: rawLimit = 20,
    role,
    active,
    search,
  } = query;

  const where = {};
  if (role) where.role = role;
  if (active !== undefined) where.active = active === "true";
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
  const skip = (page - 1) * limit;

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
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
    }),
  ]);

  const data = users.map((u) => ({
    ...sanitizeUserRecord(u),
    permissions: getRolePermissions(u.role),
    stats: u._count,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data,
    meta: { page, limit, total, totalPages },
  };
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
  const cleanPhone =
    payload.phone && payload.phone !== "+251" ? payload.phone.trim() : null;
  const cleanEmail =
    payload.email && payload.email.trim() !== ""
      ? payload.email.trim().toLowerCase()
      : null;

  const newUser = await prisma.user.create({
    data: {
      ...data,
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash,
    },
  });

  return sanitizeUserRecord(newUser);
};

export const update = async (id, payload) => {
  await getById(id);

  const cleanPhone =
    payload.phone !== undefined
      ? payload.phone && payload.phone !== "+251"
        ? payload.phone.trim()
        : null
      : undefined;

  const cleanEmail =
    payload.email !== undefined
      ? payload.email && payload.email.trim() !== ""
        ? payload.email.trim().toLowerCase()
        : null
      : undefined;

  if (cleanPhone) {
    const duplicate = await prisma.user.findFirst({
      where: { phone: cleanPhone, NOT: { id } },
    });
    if (duplicate) {
      throw new ApiError(
        409,
        `Phone number '${cleanPhone}' is already in use by another user.`,
      );
    }
  }

  if (cleanEmail) {
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: cleanEmail, NOT: { id } },
    });
    if (duplicateEmail) {
      throw new ApiError(
        409,
        `Email '${cleanEmail}' is already in use by another user.`,
      );
    }
  }

  const data = { ...payload };

  if (cleanPhone !== undefined) data.phone = cleanPhone;
  if (cleanEmail !== undefined) data.email = cleanEmail;

  if (payload.password && payload.password.trim().length >= 6) {
    data.passwordHash = await bcrypt.hash(payload.password.trim(), 10);
  }
  delete data.password;

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
  });

  return sanitizeUserRecord(updatedUser);
};

export const remove = async (id) => {
  const user = await getById(id);

  if (user.stats?.createdAudits > 0 || user.stats?.observations > 0) {
    await prisma.user.update({
      where: { id },
      data: { active: false },
    });
    return {
      deactivated: true,
      message:
        "User has historical field audit records. Account has been deactivated instead of permanently deleted.",
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
  updateMyLocationPermission,
};