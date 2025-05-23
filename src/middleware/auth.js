import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { response } from "../core/response.js";

const prisma = new PrismaClient();

const roleMiddleware = (...roles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return response.error(res, "Unauthorized", 401);

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (!user) return response.error(res, "User tidak ditemukan", 404);

      if (!roles.includes(user.role)) {
        return response.error(res, "Unauthorized", 403);
      }

      req.user = user;
      next();
    } catch (error) {
      return response.error(res, "Token tidak valid", 401);
    }
  };
};

export default roleMiddleware;
