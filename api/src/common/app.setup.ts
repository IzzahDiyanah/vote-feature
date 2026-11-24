import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AllExceptionsFilter } from './http-exception.filter';

/** Used by main.ts and the tests so both run the same setup */
export function configureApp(app: INestApplication) {
  app.use(helmet());
  app.use(cookieParser());
  // cookie is only sent to this origin
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown fields
      forbidNonWhitelisted: true, // and reject the request
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
