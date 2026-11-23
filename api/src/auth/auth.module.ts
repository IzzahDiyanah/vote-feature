import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TOKEN_LIFETIME_SECONDS } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret || secret.length < 16) {
          throw new Error('JWT_SECRET must be set (at least 16 characters). See .env.example');
        }
        return { secret, signOptions: { expiresIn: TOKEN_LIFETIME_SECONDS } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
