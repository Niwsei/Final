import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/app-error';
import { logger } from '../utils/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error instanceof ValidationError ? error.errors : undefined
    });
  }

  // Log unexpected errors
  logger.error('Unexpected error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  // Don't expose internal errors to client
  return res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};
