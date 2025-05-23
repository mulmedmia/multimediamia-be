export const response = {
  success: (
    res,
    data = null,
    message = "Success",
    statusCode = 200,
    metadata = null
  ) => {
    if (data && data.token) {
      const { token, ...dataWithoutToken } = data;
      return res.status(statusCode).json({
        status: "success",
        message,
        data: dataWithoutToken,
        token,
        ...(metadata && { metadata }),
      });
    }

    if (metadata) {
      return res.status(statusCode).json({
        status: "success",
        message,
        data,
        metadata,
      });
    }

    return res.status(statusCode).json({
      status: "success",
      message,
      data,
    });
  },

  error: (
    res,
    message = "Internal server error",
    statusCode = 500,
    errors = null
  ) => {
    return res.status(statusCode).json({
      status: "error",
      message,
      errors,
    });
  },

  validation: (res, errors) => {
    return res.status(422).json({
      status: "error",
      message: "Validation error",
      errors,
    });
  },
};
