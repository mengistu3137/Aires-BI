import prisma from "../config/db.js";
import ApiError from "../utils/api-error.js";
import { verifyToken } from "../utils/jwt.js";

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

    // Verify token
    const decoded = verifyToken(token);

    // Ensure user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        assignedMarkets: true,
        assignedCompetitors: true,
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

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Restrict routes to specific user roles
 * Usage: restrictTo("ADMIN", "MANAGER")
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
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