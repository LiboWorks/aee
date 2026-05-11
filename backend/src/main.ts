import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import session from 'express-session';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const sessionSecret = process.env['SESSION_SECRET'];
  const cookieSecure = process.env['SESSION_COOKIE_SECURE']
    ? process.env['SESSION_COOKIE_SECURE'] === 'true'
    : process.env['NODE_ENV'] === 'production';

  if (!sessionSecret) {
    throw new Error('SESSION_SECRET must be configured');
  }

  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(
    session({
      secret: sessionSecret,
      proxy: true,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: cookieSecure,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24,
      },
    }),
  );

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
  console.log(`🚀 AEE Backend running on http://0.0.0.0:${port}`);
}

bootstrap();
