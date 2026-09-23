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

// Optional auth: attaches req.user if valid token provided, but does not block if not
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      req.user = user;
    } catch {
      // Ignore token errors for optional auth
    }
  }
  next();
};

// Check if user is admin
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return response.error(res, "Forbidden: Admin access required", 403);
  }
  next();
};

// Check if user is juri
export const isJuri = (req, res, next) => {
  if (!req.user || req.user.role !== "JURI") {
    return response.error(res, "Forbidden: JURI access required", 403);
  }
  next();
};
