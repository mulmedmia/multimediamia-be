import jwt from "jsonwebtoken";
import { response } from "../utils/response.js";

// Verify JWT token for protected routes
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN format

  if (!token) {
    return response.error(res, "Unauthorized: No token provided", 401);
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // attach user info to request
    next();
  } catch (error) {
    return response.error(res, "Unauthorized: Invalid token", 401);
  }
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return response.error(res, "Forbidden: Admin access required", 403);
  }
  next();
};

// Check if user is admin or mentor
export const isAdminOrMentor = (req, res, next) => {
  if (!req.user || (req.user.role !== "ADMIN" && req.user.role !== "MENTOR")) {
    return response.error(res, "Forbidden: Admin or Mentor access required", 403);
  }
  next();
};
