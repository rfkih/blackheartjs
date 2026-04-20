const { AppError } = require("../errors/AppError");
const logger = require("../logger");

module.exports = function errorHandler(err, req, res, _next) {
  const isApp = err instanceof AppError;
  const status = isApp ? err.status : 500;
  const code = isApp ? err.code : "INTERNAL_ERROR";

  const payload = {
    error: {
      code,
      message: isApp || status < 500 ? err.message : "Internal server error",
      requestId: req.id,
    },
  };
  if (isApp && err.details !== undefined) payload.error.details = err.details;

  if (status >= 500) {
    logger.error({ err, requestId: req.id, path: req.path }, "Unhandled error");
  } else {
    logger.warn(
      {
        err: { message: err.message, code, details: isApp ? err.details : undefined },
        requestId: req.id,
        path: req.path,
      },
      "Client error",
    );
  }

  res.status(status).json(payload);
};
