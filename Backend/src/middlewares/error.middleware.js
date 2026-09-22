import ApiError from "../utils/api-error.js";

const isOperationalPrismaError = (error) => {
  return ["P2002", "P2003", "P2025"].includes(error?.code);
};

const mapPrismaError = (error) => {
  if (error.code === "P2002") {
    const target = error.meta?.target?.join(", ") || "unique field";
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

  if (isOperationalPrismaError(err)) {
    error = mapPrismaError(err);
  }

  if (error.statusCode === 409) {
    return res.status(409).json({
      status: "fail",
      message: error.message,
      code: "CONFLICT_ERROR",
    });
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || "error";

  const payload = {
    status,
    message: error.message || "Unexpected server error",
  };

  if (error.meta) {
    payload.meta = error.meta;
  }

  if (process.env.NODE_ENV === "development") {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}
