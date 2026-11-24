import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthUser, CurrentUser, Public } from '../common/decorators';
import { COOKIE_NAME, cookieOptions, TOKEN_LIFETIME_SECONDS } from './auth.constants';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

// 10 attempts per minute per IP on login/register
const STRICT = { default: { limit: 10, ttl: 60_000 } };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.register(dto);
    await this.setLoginCookie(res, user.id);
    return { user };
  }

  @Public()
  @Throttle(STRICT)
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.login(dto);
    await this.setLoginCookie(res, user.id);
    return { user };
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  private async setLoginCookie(res: Response, userId: string) {
    const token = await this.auth.signToken(userId);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: TOKEN_LIFETIME_SECONDS * 1000 });
  }
}
