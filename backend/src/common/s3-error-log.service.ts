import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type ProcessErrorEvent = 'unhandledRejection' | 'uncaughtExceptionMonitor';

@Injectable()
export class S3ErrorLogService {
  private readonly logger = new Logger(S3ErrorLogService.name);
  private readonly bucket: string | null;
  private readonly prefix: string;
  private readonly s3: S3Client | null;

  constructor(private readonly config: ConfigService) {
    const bucket = this.config.get<string>('ERROR_LOG_S3_BUCKET')?.trim() ?? '';
    this.bucket = bucket || null;
    this.prefix = this.normalizePrefix(this.config.get<string>('ERROR_LOG_S3_PREFIX') ?? 'errors');

    if (!this.bucket) {
      this.logger.warn('ERROR_LOG_S3_BUCKET is not set. S3 exception logging is disabled.');
      this.s3 = null;
      return;
    }

    const region =
      this.config.get<string>('ERROR_LOG_S3_REGION')?.trim() ||
      this.config.get<string>('AWS_REGION')?.trim() ||
      this.config.get<string>('AWS_DEFAULT_REGION')?.trim() ||
      undefined;

    this.s3 = new S3Client(region ? { region } : {});
  }

  async log(payload: Record<string, unknown>, category: string = 'exceptions'): Promise<void> {
    if (!this.bucket || !this.s3) return;

    const now = new Date();
    const key = this.buildObjectKey(now, category);
    const body = this.stringifyPayload({
      ...payload,
      loggedAt: payload['loggedAt'] ?? now.toISOString(),
    });

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: 'application/json',
          Body: body,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload error log to s3://${this.bucket}/${key}: ${message}`);
    }
  }

  get bucketName(): string | null {
    return this.bucket;
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string | null> {
    if (!this.bucket || !this.s3) return null;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
          Body: buffer,
        }),
      );
      return key;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to upload buffer to s3://${this.bucket}/${key}: ${message}`);
      return null;
    }
  }

  async logProcessError(event: ProcessErrorEvent, error: unknown): Promise<void> {
    await this.log(
      {
        source: 'process',
        event,
        pid: process.pid,
        nodeVersion: process.version,
        exception: this.serializeUnknownError(error),
      },
      'process',
    );
  }

  private normalizePrefix(value: string): string {
    const trimmed = value.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    return trimmed || 'errors';
  }

  private buildObjectKey(timestamp: Date, category: string): string {
    const y = timestamp.getUTCFullYear();
    const m = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const d = String(timestamp.getUTCDate()).padStart(2, '0');
    const safeCategory = category.trim().replace(/^\/+/, '').replace(/\/+$/, '') || 'exceptions';
    const ts = timestamp.toISOString().replace(/[:.]/g, '-');

    return `${this.prefix}/${safeCategory}/${y}/${m}/${d}/${ts}-${randomUUID()}.json`;
  }

  private stringifyPayload(payload: Record<string, unknown>): string {
    const seen = new WeakSet<object>();

    return JSON.stringify(
      payload,
      (_key, value: unknown) => {
        if (typeof value === 'bigint') return value.toString();
        if (value instanceof Error) {
          return {
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }

        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) return '[Circular]';
          seen.add(value);
        }

        return value;
      },
      2,
    );
  }

  private serializeUnknownError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (error && typeof error === 'object') {
      return { details: error as Record<string, unknown> };
    }

    return { message: String(error) };
  }
}