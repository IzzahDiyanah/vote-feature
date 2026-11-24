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
    // rate limit: 120 requests/min per IP (off in tests)
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
    // guards run in this order:
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // 1. rate limit
    { provide: APP_GUARD, useClass: AuthGuard }, //      2. logged in?
    { provide: APP_GUARD, useClass: RolesGuard }, //     3. right role?
  ],
})
export class AppModule {}
