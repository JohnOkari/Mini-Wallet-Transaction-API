const { HTTP_STATUS } = require('./constants');

/**
 * Success response formatter
 */
const successResponse = (res, data, message, statusCode = HTTP_STATUS.OK) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Error response formatter
 */
const errorResponse = (res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response formatter
 */
const validationErrorResponse = (res, errors) => {
  return res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
    success: false,
    message: 'Validation failed',
    errors: errors.map(err => ({
      field: err.path ? err.path.join('.') : 'unknown',
      message: err.message,
    })),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Pagination response formatter
 */
const paginatedResponse = (res, data, page, limit, total, message) => {
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    message,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  successResponse,
  errorResponse,
  validationErrorResponse,
  paginatedResponse,
};