import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AdminModule } from './admin/admin.module';
import { AuthGuard, RolesGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.service';
import { RequestsModule } from './requests/requests.module';
import { VotesModule } from './votes/votes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Basic abuse protection: 120 requests per minute per IP (off in tests).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    AuthModule,
    RequestsModule,
    VotesModule,
    CommentsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [
    // Guards run in this order for every route:
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // 1. rate limit
    { provide: APP_GUARD, useClass: AuthGuard }, //      2. who are you?
    { provide: APP_GUARD, useClass: RolesGuard }, //     3. are you allowed?
  ],
})
export class AppModule {}
