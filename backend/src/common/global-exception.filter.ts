import { ArgumentsHost, Catch, HttpException, Injectable } from '@nestjs/common';
import { BaseExceptionFilter, HttpAdapterHost } from '@nestjs/core';
import type { Request } from 'express';
import { S3ErrorLogService } from './s3-error-log.service';

type RequestWithUser = Request & { user?: Record<string, unknown> };

const SENSITIVE_FIELD_PATTERN =
  /(password|passwd|token|secret|authorization|cookie|apikey|api_key|x-amzn-oidc-data)/i;

@Catch()
@Injectable()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  constructor(
    private readonly s3ErrorLogService: S3ErrorLogService,
    httpAdapterHost: HttpAdapterHost,
  ) {
    super(httpAdapterHost.httpAdapter);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    void this.logToS3(exception, host);
    super.catch(exception, host);
  }

  private async logToS3(exception: unknown, host: ArgumentsHost): Promise<void> {
    const contextType = host.getType<'http' | 'rpc' | 'ws'>();

    if (contextType !== 'http') {
      await this.s3ErrorLogService.log(
        {
          source: contextType,
          exception: this.serializeException(exception),
        },
        'exceptions',
      );
      return;
    }

    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithUser>();

    await this.s3ErrorLogService.log(
      {
        source: 'http',
        statusCode: this.getStatusCode(exception),
        exception: this.serializeException(exception),
        request: {
          method: request.method,
          url: request.originalUrl ?? request.url,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
          requestId: this.readHeader(request, 'x-request-id'),
          user: this.extractUser(request),
          headers: this.redactValue(request.headers),
          params: this.redactValue(request.params),
          query: this.redactValue(request.query),
          body: this.redactValue(request.body),
        },
      },
      'exceptions',
    );
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return 500;
  }

  private serializeException(exception: unknown): Record<string, unknown> {
    if (exception instanceof HttpException) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        response: this.redactValue(exception.getResponse()),
      };
    }

    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }

    if (typeof exception === 'string') {
      return { message: exception };
    }

    if (exception && typeof exception === 'object') {
      return { details: this.redactValue(exception) as Record<string, unknown> };
    }

    return { message: String(exception) };
  }

  private extractUser(request: RequestWithUser): Record<string, unknown> | null {
    if (!request.user || typeof request.user !== 'object') {
      return null;
    }

    return this.redactValue({
      id: request.user['id'],
      email: request.user['email'],
    }) as Record<string, unknown>;
  }

  private readHeader(request: Request, name: string): string | null {
    const raw = request.headers[name.toLowerCase()];
    if (typeof raw === 'string') return raw;
    if (Array.isArray(raw)) return raw.join(',');
    return null;
  }

  private redactValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELD_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
        continue;
      }

      result[key] = this.redactValue(item);
    }

    return result;
  }
}