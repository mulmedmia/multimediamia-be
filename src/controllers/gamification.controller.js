import { updateUserPoints } from "../services/gamification.service.js";
import { response } from "../utils/response.js";

// Update user points (Admin)
export const updateUserPointsController = async (req, res) => {
  try {
    const { userId } = req.params;
    const { points } = req.body;

    // Validasi input
    if (typeof points !== "number") {
      return response.validation(res, { points: "Points must be a number" });
    }

    const updatedUser = await updateUserPoints(userId, points);

    return response.success(
      res,
      updatedUser,
      "User points updated successfully"
    );
  } catch (error) {
    if (error.message === "User not found") {
      return response.error(res, error.message, 404);
    }
    return response.error(res, "Failed to update user points", 500, error.message);
  }
};