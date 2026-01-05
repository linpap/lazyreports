// Custom error class for API errors
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Log error
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    statusCode,
    path: req.path,
    method: req.method
  });

  // MySQL errors
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    statusCode = 500;
    message = 'Database access denied';
  } else if (err.code === 'ECONNREFUSED') {
    statusCode = 500;
    message = 'Database connection refused';
  } else if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors;
  }

  // Always include error details for debugging
  const debugInfo = {
    code: err.code || null,
    sqlMessage: err.sqlMessage || null,
    errno: err.errno || null
  };

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details }),
      debug: debugInfo
    }
  });
};

export default { ApiError, notFoundHandler, errorHandler };
