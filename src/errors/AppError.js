class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", details } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super("Request validation failed", { status: 400, code: "VALIDATION_ERROR", details });
    this.name = "ValidationError";
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, { status: 401, code: "UNAUTHORIZED" });
    this.name = "UnauthorizedError";
  }
}

class UpstreamError extends AppError {
  constructor(message, { status = 502, code = "UPSTREAM_ERROR", details } = {}) {
    super(message, { status, code, details });
    this.name = "UpstreamError";
  }
}

module.exports = { AppError, ValidationError, UnauthorizedError, UpstreamError };
