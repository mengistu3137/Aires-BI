/**
 * Normalizes any backend error into a standard, UI-friendly object.
 * Fully backward-compatible with Axios err.response patterns.
 */
export class ApiError extends Error {
  constructor(message, status, code, details = [], fieldErrors = {}, rawError = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors;

    // Backward compatibility: preserve Axios shape so existing hooks throughout
    // all modules (Inventory, Sales, Kitchen, etc.) immediately work
    this.response = rawError?.response;
    this.data = rawError?.response?.data;
    this.isApiError = true;
  }

  /**
   * Helper to always get the cleanest display message
   */
  get displayMessage() {
    if (this.details && this.details.length > 0) {
      const messages = this.details.map((d) => d.message || d.msg || d).filter(Boolean);
      if (messages.length > 0) return messages.join(', ');
    }
    return this.message || 'An unexpected error occurred';
  }

  static fromAxios(error) {
    if (error.response) {
      const data = error.response.data || {};
      const status = error.response.status;

      // Extract exact message from backend payload
      const message =
        data.message ||
        data.error ||
        (typeof data === 'string' ? data : 'An unexpected error occurred on the server.');

      const code = data.code || `HTTP_${status}`;
      const details = Array.isArray(data.details)
        ? data.details
        : Array.isArray(data.errors)
          ? data.errors
          : [];

      const fieldErrors = {};
      if (Array.isArray(details)) {
        details.forEach((issue) => {
          const field = issue.path || issue.field || issue.param;
          if (field) {
            fieldErrors[field] = issue.message || issue.msg;
          }
        });
      }

      // Pass the raw Axios error so this.response and this.data are preserved
      return new ApiError(message, status, code, details, fieldErrors, error);
    }

    if (error.request) {
      return new ApiError(
        'Network connection lost. Please verify your internet connection.',
        0,
        'NETWORK_ERROR',
        [],
        {},
        error
      );
    }

    return new ApiError(
      error.message || 'Internal client failure.',
      500,
      'CLIENT_ERROR',
      [],
      {},
      error
    );
  }
}