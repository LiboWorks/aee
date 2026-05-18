import { Global, Module } from '@nestjs/common';
import { ActionLogService } from './action-log.service';
import { S3ErrorLogService } from './s3-error-log.service';
import { GlobalExceptionFilter } from './global-exception.filter';

@Global()
@Module({
  providers: [ActionLogService, S3ErrorLogService, GlobalExceptionFilter],
  exports: [ActionLogService, S3ErrorLogService, GlobalExceptionFilter],
})
export class CommonModule {}
