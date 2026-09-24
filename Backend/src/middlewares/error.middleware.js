// Backend/src/middlewares/error.middleware.js
import ApiError from "../utils/api-error.js";

const isOperationalPrismaError = (error) => {
  return ["P2002", "P2003", "P2025"].includes(error?.code);
};

const mapPrismaError = (error) => {
  if (error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : error.meta?.target || "unique field";
    return new ApiError(409, `Duplicate value for ${target}`);
  }

  if (error.code === "P2003") {
    return new ApiError(400, "Invalid relation reference");
  }

  if (error.code === "P2025") {
    return new ApiError(404, "Record not found");
  }

  return new ApiError(500, "Database operation failed");
};

export default function globalErrorHandler(err, req, res, next) {
  let error = err;

  // 1. Handle Known Prisma Code-Based Errors (P2002, P2003, P2025)
  if (isOperationalPrismaError(err)) {
    error = mapPrismaError(err);
  }

  // 2. Handle Prisma Schema Validation Errors
  if (err.name === "PrismaClientValidationError") {
    error = new ApiError(
      400,
      "Missing required fields or invalid data submitted. Please check your input."
    );
  }

  // 3. Handle JWT Auth Errors
  if (err.name === "JsonWebTokenError") {
    error = new ApiError(401, "Invalid authentication token.");
  }

  if (err.name === "TokenExpiredError") {
    error = new ApiError(401, "Token expired. Please log in again.");
  }

  // 4. Extract Status Code and Response Status
  const statusCode = error.statusCode || 500;
  const status =
    error.status || (statusCode >= 400 && statusCode < 500 ? "fail" : "error");

  // 5. Handle Specific 409 Conflict Custom Format
  if (statusCode === 409) {
    return res.status(409).json({
      status: "fail",
      message: error.message,
      code: "CONFLICT_ERROR",
    });
  }

  // 6. Build Final Response Payload
  const payload = {
    status,
    message: error.message || "An unexpected error occurred.",
  };

  if (error.meta) {
    payload.meta = error.meta;
  }

  if (process.env.NODE_ENV === "development") {
    payload.stack = error.stack;
  }

  return res.status(statusCode).json(payload);
}