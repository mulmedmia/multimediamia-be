import { registerSchema, loginSchema, requestOtpSchema, verifyOtpSchema, forgotPasswordSchema, verifyResetOtpSchema, resetPasswordSchema } from "../models/auth.model.js";
import { response } from "../utils/response.js";

export const validateRegister = (req, res, next) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateVerifyOtp = (req, res, next) => {
  try {
    const validation = verifyOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateLogin = (req, res, next) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateRequestOtp = (req, res, next) => {
  try {
    const validation = requestOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateForgotPassword = (req, res, next) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateVerifyResetOtp = (req, res, next) => {
  try {
    const validation = verifyResetOtpSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};

export const validateResetPassword = (req, res, next) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return response.validation(res, validation.error.format());
    }
    next();
  } catch (error) {
    return response.error(res, "Validation error", 422, error.message);
  }
};