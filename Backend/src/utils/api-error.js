export default class ApiError extends Error {
  constructor(statusCode, message, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}
