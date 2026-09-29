import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { comparePassword, generateAuthPayload, sanitizeUser } from "./auth.helpers.js";

/**
 * Resolves phone number variations (local & international) into an array of search candidates.
 */
const resolveLoginCandidates = (identifier) => {
  const clean = identifier.trim();
  const candidates = [clean];

  // If it's an email, do not generate phone variations
  if (clean.includes("@")) {
    return { emailCandidate: clean.toLowerCase(), phoneCandidates: [] };
  }

  // Extract digits for phone variations
  let digits = clean.replace(/\D/g, "");
  if (digits.startsWith("251")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length >= 9) {
    const last9 = digits.slice(-9);
    candidates.push(`+251${last9}`); // E.164 standard (+2519...)
    candidates.push(`0${last9}`);     // Local standard (09... / 07...)
    candidates.push(last9);           // Raw 9-digit
  }

  return { emailCandidate: clean.toLowerCase(), phoneCandidates: candidates };
};

export const login = async ({ identifier, password }) => {
  const { emailCandidate, phoneCandidates } = resolveLoginCandidates(identifier);

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: emailCandidate },
        { phone: { in: phoneCandidates } },
      ],
    },
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials. User not found.");
  }

  if (!user.active) {
    throw new ApiError(403, "Your account has been deactivated. Contact an administrator.");
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials. Incorrect password.");
  }

  return generateAuthPayload(user);
};

export const logout = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return { success: true };
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
  logout,
  getMe,
};