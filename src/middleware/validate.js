const { ValidationError } = require("../errors/AppError");

module.exports = function validate(schemas) {
  return (req, _res, next) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
      if (schemas.query) req.query = schemas.query.parse(req.query ?? {});
      if (schemas.headers) schemas.headers.parse(req.headers);
      next();
    } catch (err) {
      if (err && err.issues) {
        return next(new ValidationError(err.issues.map((i) => ({ path: i.path, message: i.message }))));
      }
      next(err);
    }
  };
};
