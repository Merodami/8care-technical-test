import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

interface HttpExceptionResponse {
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

interface PrismaError extends Error {
  code: string;
  meta?: {
    target?: string[];
  };
}

interface RequestWithId extends Omit<Request, 'id'> {
  id?: string;
}

function isPrismaError(error: unknown): error is PrismaError {
  return error instanceof Error && 'code' in error;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Array<{ field: string; message: string }> = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const typedResponse = exceptionResponse as HttpExceptionResponse;
        message = typedResponse.message || exception.message;
        errors = typedResponse.errors || [];
      } else {
        message = exceptionResponse;
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = exception.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
    } else if (isPrismaError(exception)) {
      status = HttpStatus.BAD_REQUEST;

      if (exception.code === 'P2002') {
        message = 'Unique constraint violation';
        const target = exception.meta?.target || [];
        errors = [{ field: target.join('.'), message: 'Already exists' }];
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Record not found';
      } else if (exception.code.startsWith('P')) {
        message = 'Database operation failed';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const errorResponse = {
      statusCode: status,
      message,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId: request.id,
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({
        message: 'Internal server error',
        error: exception,
        correlationId: request.id,
        path: request.url,
      });
    }

    response.status(status).json(errorResponse);
  }
}
