import type { Context, Next } from 'hono'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NOT_FOUND')
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN')
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, message, 'BAD_REQUEST')
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, message, 'CONFLICT')
  }
}

export async function errorHandler(c: Context, next: Next) {
  try {
    await next()
  } catch (error) {
    console.error('Error:', error)

    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation error',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        400
      )
    }

    if (error instanceof AppError) {
      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        error.statusCode
      )
    }

    // Unknown error
    return c.json(
      {
        success: false,
        error: 'Internal server error',
      },
      500
    )
  }
}
