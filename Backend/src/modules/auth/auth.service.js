import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { comparePassword, generateAuthPayload, sanitizeUser } from "./auth.helpers.js";

export const login = async ({ identifier, password }) => {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: identifier.trim() },
        { email: identifier.trim().toLowerCase() },
      ],
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials. User not found.");
  }

  if (!user.active) {
    throw new ApiError(403, "Your account has been deactivated. Contact an admin.");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials. Incorrect password.");
  }

  return generateAuthPayload(user);
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return sanitizeUser(user);
};

export const authService = {
  login,
  getMe,
};