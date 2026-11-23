import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './http-exception.filter';

/** Shared by main.ts and the tests, so tests run the same setup as production. */
export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.use(cookieParser());
  // The browser sends the cookie only to this one allowed origin.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // drop unknown fields
      forbidNonWhitelisted: true, // ...and reject the request instead
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
