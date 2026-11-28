import prisma from "../config/db.js";
import ApiError from "../utils/api-error.js";
import { verifyToken } from "../utils/jwt.js";
import { touchLoginSession } from "../modules/auth/login-session.service.js";

/**
 * Protect routes by verifying JWT Bearer token and checking active status
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(
        new ApiError(401, "Authentication required. Please provide a Bearer token.")
      );
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      return next(
        new ApiError(401, "The user belonging to this token no longer exists.")
      );
    }

    if (!user.active) {
      return next(
        new ApiError(403, "Your account has been deactivated. Contact an administrator.")
      );
    }

    req.user = {
      ...user,
      sessionId: decoded.impersonatedBy ? null : decoded.sessionId || null,
      impersonatedBy: decoded.impersonatedBy || null,
    };
    touchLoginSession(req.user.sessionId);

    const requestPath = req.originalUrl.split("?")[0];
    const allowedDuringPasswordChange = [
      "/api/v1/auth/change-password",
      "/api/v1/auth/logout",
      "/api/v1/auth/me",
    ];

    if (
      user.mustChangePassword &&
      !decoded.impersonatedBy &&
      !allowedDuringPasswordChange.includes(requestPath)
    ) {
      return next(
        new ApiError(
          403,
          "Change the password issued for this account before continuing.",
        ),
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific user roles.
 * Aires SUPER_ADMIN automatically inherits universal authorization across all endpoints.
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    // Universal access bypass for Aires Super Admin
    if (req.user?.role === "SUPER_ADMIN") {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          403,
          `Access forbidden: role [${req.user.role}] does not have permission to perform this action.`
        )
      );
    }
    next();
  };
};