import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { WebSocketServer } from 'ws';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/global-exception.filter';
import { S3ErrorLogService } from './common/s3-error-log.service';
import { IntelligenceRealtimeService } from './intelligence/intelligence-realtime.service';

const PROCESS_HANDLER_FLAG = Symbol.for('aee.s3-error-handlers-registered');
type ProcessWithFlag = NodeJS.Process & { [PROCESS_HANDLER_FLAG]?: boolean };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(app.get(GlobalExceptionFilter));

  const s3ErrorLogService = app.get(S3ErrorLogService);
  const flaggedProcess = process as ProcessWithFlag;
  if (!flaggedProcess[PROCESS_HANDLER_FLAG]) {
    process.on('unhandledRejection', (reason) => {
      void s3ErrorLogService.logProcessError('unhandledRejection', reason);
    });

    process.on('uncaughtExceptionMonitor', (error) => {
      void s3ErrorLogService.logProcessError('uncaughtExceptionMonitor', error);
    });

    flaggedProcess[PROCESS_HANDLER_FLAG] = true;
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = parseInt(process.env['BACKEND_PORT'] ?? '4000', 10);
  await app.listen(port, '0.0.0.0');

  const wsServer = new WebSocketServer({
    server: app.getHttpServer(),
    path: '/ws/intelligence',
  });
  app.get(IntelligenceRealtimeService).configureServer(wsServer);

  console.log(`🚀 AEE Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
