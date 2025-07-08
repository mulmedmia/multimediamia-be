export const response = {
  // Success response
  success: (res, data, message = "Success", statusCode = 200) => {
    return res.status(statusCode).json({
      status: true,
      message,
      data,
    });
  },

  // Error response - selalu tampilkan error untuk debugging
  error: (res, message = "Error", statusCode = 500, error = null) => {
    const responseObj = {
      status: false,
      message,
    };
    if (error) {
      responseObj.error = error; // Selalu tampilkan error untuk debugging
    }
    return res.status(statusCode).json(responseObj);
  },

  // Validation error
  validation: (res, errors, message = "Validation error", statusCode = 422) => {
    return res.status(statusCode).json({
      status: false,
      message,
      errors,
    });
  },
};
