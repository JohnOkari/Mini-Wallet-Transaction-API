const logger = require('../config/logger');
const { errorResponse } = require('../utils/responses');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    HTTP_STATUS.NOT_FOUND
  );
  next(error);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Set default values if not provided
  statusCode = statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  message = message || ERROR_MESSAGES.SERVER_ERROR;

  // Log error
  logger.error('Error occurred', {
    message: err.message,
    statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
  });

  // Handle specific error types
  if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = HTTP_STATUS.CONFLICT;
    message = 'Duplicate entry. Resource already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Referenced resource does not exist';
  } else if (err.code === '22P02') {
    // PostgreSQL invalid input syntax
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = 'Invalid input format';
  } else if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.UNPROCESSABLE_ENTITY;
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    message = ERROR_MESSAGES.SERVER_ERROR;
  }

  // Send error response
  const errorData = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorData.stack = err.stack;
    errorData.error = err.message;
  }

  res.status(statusCode).json(errorData);
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};