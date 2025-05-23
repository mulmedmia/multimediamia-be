export const response = {
  success: (res, data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
      status: true,
      message,
      data,
    });
  },

  error: (res, message = "Error", statusCode = 500, error = null) => {
    const response = {
      status: false,
      message,
    };

    if (error) {
      response.error = process.env.NODE_ENV === "development" ? error : null;
    }

    return res.status(statusCode).json(response);
  },

  validation: (res, errors, message = "Validation error", statusCode = 422) => {
    return res.status(statusCode).json({
      status: false,
      message,
      errors,
    });
  },
};