import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, newRequest, newUser, resetDb } from './helpers';

describe('Comments', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  it('adds a comment, shows the author, and updates the comment count', async () => {
    const { agent, user } = await newUser(app, 'Cam');
    const r = await newRequest(agent);
    const res = await agent.post(`/requests/${r.id}/comments`).send({ body: '  Great idea!  ' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ body: 'Great idea!', author: { id: user.id, name: 'Cam' } });

    expect((await agent.get(`/requests/${r.id}`)).body.commentCount).toBe(1);
    expect((await agent.get('/requests')).body.items[0].commentCount).toBe(1);
  });

  it('lists comments oldest first, with paging', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    for (const body of ['first', 'second', 'third']) {
      await agent.post(`/requests/${r.id}/comments`).send({ body });
    }
    const all = await agent.get(`/requests/${r.id}/comments`);
    expect(all.body.items.map((c: any) => c.body)).toEqual(['first', 'second', 'third']);
    expect(all.body.total).toBe(3);

    const page2 = await agent.get(`/requests/${r.id}/comments`).query({ page: 2, pageSize: 2 });
    expect(page2.body.items.map((c: any) => c.body)).toEqual(['third']);
  });

  it('rejects empty, whitespace-only and over-long comments', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    for (const body of ['', '    ', 'x'.repeat(1001)]) {
      const res = await agent.post(`/requests/${r.id}/comments`).send({ body });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('requires login, and returns 404 for a request that does not exist', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    expect((await request(app.getHttpServer()).post(`/requests/${r.id}/comments`).send({ body: 'hi' })).status).toBe(401);
    const missing = '3f6c1b5e-0000-4000-8000-000000000000';
    expect((await agent.post(`/requests/${missing}/comments`).send({ body: 'hi' })).status).toBe(404);
    expect((await agent.get(`/requests/${missing}/comments`)).status).toBe(404);
  });
});
