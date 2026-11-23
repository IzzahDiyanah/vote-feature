import type { CookieOptions } from 'express';

export const COOKIE_NAME = 'access_token';
export const TOKEN_LIFETIME_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * The login token lives in a cookie JavaScript cannot read (httpOnly).
 * SameSite=Lax stops other sites from sending it on cross-site requests.
 * `secure` must be true in production (HTTPS only): set COOKIE_SECURE=true.
 */
export function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}
