import type { CookieOptions } from 'express';

export const COOKIE_NAME = 'access_token';
export const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60; // 12h

/**
 * Login token is an httpOnly, SameSite=Lax cookie.
 * Set COOKIE_SECURE=true in production (https).
 */
export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}
