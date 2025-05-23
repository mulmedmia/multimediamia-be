import { registerUser, loginUser } from "../services/auth.service.js";
import { response } from "../utils/response.js";

export const register = async (req, res) => {
  try {
    // Register user (validation happens in middleware)
    const user = await registerUser(req.body);
    
    return response.success(
      res,
      user,
      "User registered successfully",
      201
    );
  } catch (error) {
    if (error.message === "Email already registered") {
      return response.error(res, error.message, 400);
    }
    return response.error(res, "Failed to register user", 500, error.message);
  }
};

export const login = async (req, res) => {
  try {
    // Login user (validation happens in middleware)
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    
    return response.success(
      res,
      result,
      "Login successful"
    );
  } catch (error) {
    if (error.message === "User not found" || error.message === "Invalid password") {
      return response.error(res, "Invalid email or password", 401);
    }
    return response.error(res, "Failed to login", 500, error.message);
  }
};