export abstract class AppError extends Error {
  abstract statusCode: number;
  abstract isOperational: boolean;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  statusCode = 400;
  isOperational = true;

  constructor(message: string, public errors?: any[]) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  statusCode = 401;
  isOperational = true;
}

export class ForbiddenError extends AppError {
  statusCode = 403;
  isOperational = true;
}

export class NotFoundError extends AppError {
  statusCode = 404;
  isOperational = true;
}

export class ConflictError extends AppError {
  statusCode = 409;
  isOperational = true;
}
