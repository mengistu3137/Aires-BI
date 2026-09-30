import { ZodError } from "zod";
import ApiError from "../utils/api-error.js";

/**
 * Universal Zod validation middleware for body, query, or params
 * Compatible with Express 4 and Express 5 read-only getters
 */
export const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source] || {});

      if (source === "query") {
        // Express 5: Mutate properties instead of reassigning req.query
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, parsed);
      } else {
        req[source] = parsed;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError || error?.name === "ZodError") {
        const issues = Array.isArray(error.issues)
          ? error.issues
          : Array.isArray(error.errors)
            ? error.errors
            : [];

        const formattedErrors = issues.map((err) => ({
          field: Array.isArray(err.path)
            ? err.path.join(".")
            : String(err.path || "unknown"),
          message: err.message,
        }));

        return next(new ApiError(400, "Validation failed", formattedErrors));
      }

      next(error);
    }
  };
};