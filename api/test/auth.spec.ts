import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, resetDb } from './helpers';

describe('Auth', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const body = { email: 'Sam@Test.com', name: 'Sam', password: 'Password123!' };

  it('registers, sets an httpOnly cookie, and never returns the password hash', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send(body);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email: 'sam@test.com', role: 'USER' });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    expect(cookie).toMatch(/access_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('ignores a role sent by the client (no self-promotion to admin)', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...body, role: 'ADMIN' });
    expect(res.status).toBe(400); // unknown field is rejected
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(body);
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...body, email: 'sam@test.com' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('returns a consistent validation error for bad input', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'nope', name: '', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(3);
  });

  it('logs in with the right password and fails with the wrong one (same message)', async () => {
    await request(app.getHttpServer()).post('/auth/register').send(body);

    const ok = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'sam@test.com', password: 'Password123!' });
    expect(ok.status).toBe(200);

    const wrongPassword = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'sam@test.com', password: 'WrongPassword1' });
    const unknownEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'ghost@test.com', password: 'Password123!' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body); // does not reveal which emails exist
  });

  it('protects routes: 401 without a cookie, user details with one', async () => {
    const anon = await request(app.getHttpServer()).get('/auth/me');
    expect(anon.status).toBe(401);
    expect(anon.body.error.code).toBe('UNAUTHENTICATED');

    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/register').send(body);
    const me = await agent.get('/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('sam@test.com');
  });

  it('logout clears the cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/register').send(body);
    const out = await agent.post('/auth/logout');
    expect(out.status).toBe(204);
    expect((await agent.get('/auth/me')).status).toBe(401);
  });

  it('treats a garbage token like no token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'access_token=not-a-real-token');
    expect(res.status).toBe(401);
  });
});
