import { response } from "../core/response.js";

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  return response.error(
    res,
    err.message || "Internal Server Error",
    statusCode
  );
};

export const notFoundHandler = (req, res) => {
  return response.error(res, `Route ${req.originalUrl} not found`, 404);
};
