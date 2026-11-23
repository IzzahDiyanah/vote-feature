import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

const DEFAULT_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'TOO_MANY_REQUESTS',
};

/**
 * Every error leaves the API in one shape:
 *   { "error": { "code": "SOME_CODE", "message": "Readable text", "details"?: [...] } }
 * Unknown errors become a generic 500 so we never leak internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse() as string | Record<string, any>;
      let code = DEFAULT_CODES[status] ?? 'HTTP_ERROR';
      let message = exception.message;
      let details: string[] | undefined;

      if (typeof body === 'object' && body !== null) {
        if (Array.isArray(body.message)) {
          // class-validator errors
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = body.message;
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
        if (typeof body.code === 'string') code = body.code;
      }

      return res.status(status).json({ error: { code, message, ...(details && { details }) } });
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
  }
}
