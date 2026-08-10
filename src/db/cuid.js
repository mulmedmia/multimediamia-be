import crypto from "crypto";

/**
 * Generates a cuid-compatible unique string of 25 characters starting with 'c'.
 * This matches standard Prisma CUID format without external dependencies.
 */
export const generateCuid = () => {
  return "c" + crypto.randomBytes(12).toString("hex");
};
