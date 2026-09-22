import { ZodError } from "zod";
import ApiError from "../utils/api-error.js";

/**
 * Universal Zod validation middleware for body, query, or params
 */
export const validate = (schema, source = "body") => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        return next(new ApiError(400, "Validation failed", formattedErrors));
      }
      next(error);
    }
  };
};