import prisma from "../../config/db.js";
import ApiError from "../../utils/api-error.js";
import { comparePassword, generateAuthPayload, sanitizeUser } from "./auth.helpers.js";
import { signToken } from "../../utils/jwt.js";

const resolveLoginCandidates = (identifier) => {
  const clean = identifier.trim();
  const candidates = [clean];

  if (clean.includes("@")) {
    return { emailCandidate: clean.toLowerCase(), phoneCandidates: [] };
  }

  let digits = clean.replace(/\D/g, "");
  if (digits.startsWith("251")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length >= 9) {
    const last9 = digits.slice(-9);
    candidates.push(`+251${last9}`);
    candidates.push(`0${last9}`);
    candidates.push(last9);
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

/**
 * Super Admin (Aires) generates an authorized session token on behalf of a target user.
 */
export const impersonateUser = async (targetUserId, adminUser) => {
  // Strict rule: Only Aires Super Admin can sign in as another user
  if (adminUser.role !== "SUPER_ADMIN" && adminUser.role !== "ADMIN") {
    throw new ApiError(403, "Access forbidden: Only Aires Super Admin can sign in on behalf of users.");
  }

  if (targetUserId === adminUser.id) {
    throw new ApiError(400, "Cannot impersonate your own active administrator account.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new ApiError(404, `Target user '${targetUserId}' not found.`);
  }

  if (!targetUser.active) {
    throw new ApiError(400, `Cannot sign in as deactivated user [${targetUser.name}].`);
  }

  // Issue standard token tagged with impersonation claims
  const token = signToken({
    id: targetUser.id,
    role: targetUser.role,
    impersonatedBy: adminUser.id,
  });

  return {
    token,
    user: sanitizeUser(targetUser),
    impersonator: {
      id: adminUser.id,
      name: adminUser.name,
      role: adminUser.role,
    },
  };
};

export const authService = {
  login,
  logout,
  getMe,
  impersonateUser,
};