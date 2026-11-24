import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, newAdmin, newRequest, newUser, resetDb } from './helpers';

describe('Admin: authorization, status, official response, stats', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  describe('only administrators may use admin routes', () => {
    it('a normal user gets 403 on every admin route, and nothing changes', async () => {
      const user = await newUser(app, 'Regular');
      const other = await newRequest(user.agent, 'Other request', 'Another description here.');
      const r = await newRequest(user.agent);

      const calls = [
        user.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'RELEASED' }),
        user.agent.put(`/admin/requests/${r.id}/response`).send({ message: 'Fake official answer' }),
        user.agent.post(`/admin/requests/${r.id}/merge`).send({ targetId: other.id }),
        user.agent.get('/admin/stats'),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }

      const after = await prisma.featureRequest.findUniqueOrThrow({ where: { id: r.id } });
      expect(after).toMatchObject({ status: 'UNDER_REVIEW', officialResponse: null, mergedIntoId: null });
      expect(await prisma.statusChange.count()).toBe(0);
    });

    it('the author of a request is still not an admin', async () => {
      const author = await newUser(app);
      const r = await newRequest(author.agent);
      const res = await author.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'PLANNED' });
      expect(res.status).toBe(403);
    });

    it('anonymous callers get 401', async () => {
      const res = await request(app.getHttpServer()).get('/admin/stats');
      expect(res.status).toBe(401);
    });

    it('a user promoted to admin gets access immediately; a demoted admin loses it immediately', async () => {
      const made = await newUser(app);
      expect((await made.agent.get('/admin/stats')).status).toBe(403);
      await prisma.user.update({ where: { id: made.user.id }, data: { role: 'ADMIN' } });
      expect((await made.agent.get('/admin/stats')).status).toBe(200);
      await prisma.user.update({ where: { id: made.user.id }, data: { role: 'USER' } });
      expect((await made.agent.get('/admin/stats')).status).toBe(403);
    });
  });

  describe('status changes', () => {
    it('lets an admin change status and records who did it', async () => {
      const admin = await newAdmin(app, prisma);
      const user = await newUser(app);
      const r = await newRequest(user.agent);

      const res = await admin.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'PLANNED' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PLANNED');
      expect(res.body.statusHistory).toHaveLength(1);
      expect(res.body.statusHistory[0]).toMatchObject({ fromStatus: 'UNDER_REVIEW', toStatus: 'PLANNED' });

      const audit = await prisma.statusChange.findFirstOrThrow({ where: { requestId: r.id } });
      expect(audit.adminId).toBe(admin.user.id);

      // user sees the new status
      expect((await user.agent.get(`/requests/${r.id}`)).body.status).toBe('PLANNED');
    });

    it('supports all five statuses and rejects unknown ones', async () => {
      const admin = await newAdmin(app, prisma);
      const r = await newRequest(admin.agent);
      for (const status of ['PLANNED', 'IN_PROGRESS', 'RELEASED', 'DECLINED', 'UNDER_REVIEW']) {
        const res = await admin.agent.patch(`/admin/requests/${r.id}/status`).send({ status });
        expect(res.status).toBe(200);
        expect(res.body.status).toBe(status);
      }
      const bad = await admin.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'DONE' });
      expect(bad.status).toBe(400);
    });

    it('setting the same status again writes no extra audit row', async () => {
      const admin = await newAdmin(app, prisma);
      const r = await newRequest(admin.agent);
      await admin.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'PLANNED' });
      await admin.agent.patch(`/admin/requests/${r.id}/status`).send({ status: 'PLANNED' });
      expect(await prisma.statusChange.count({ where: { requestId: r.id } })).toBe(1);
    });

    it('returns 404 for a missing request', async () => {
      const admin = await newAdmin(app, prisma);
      const res = await admin.agent
        .patch('/admin/requests/3f6c1b5e-0000-4000-8000-000000000000/status')
        .send({ status: 'PLANNED' });
      expect(res.status).toBe(404);
    });
  });

  describe('official response', () => {
    it('is saved by an admin and visible to everyone', async () => {
      const admin = await newAdmin(app, prisma);
      const user = await newUser(app);
      const r = await newRequest(user.agent);

      const res = await admin.agent
        .put(`/admin/requests/${r.id}/response`)
        .send({ message: '  Thanks! We will look at this next quarter.  ' });
      expect(res.status).toBe(200);

      const seen = (await user.agent.get(`/requests/${r.id}`)).body;
      expect(seen.officialResponse).toBe('Thanks! We will look at this next quarter.');
      expect(seen.officialResponseAt).toBeTruthy();
    });

    it('rejects an empty response', async () => {
      const admin = await newAdmin(app, prisma);
      const r = await newRequest(admin.agent);
      const res = await admin.agent.put(`/admin/requests/${r.id}/response`).send({ message: '   ' });
      expect(res.status).toBe(400);
    });
  });

  describe('stats', () => {
    it('reports totals, a count for every status, and the top voted requests', async () => {
      const admin = await newAdmin(app, prisma);
      const u1 = await newUser(app);
      const u2 = await newUser(app);
      const popular = await newRequest(u1.agent, 'Popular request', 'Popular description here.');
      const quiet = await newRequest(u1.agent, 'Quiet request', 'Quiet description here.');
      await u1.agent.put(`/requests/${popular.id}/vote`);
      await u2.agent.put(`/requests/${popular.id}/vote`);
      await u1.agent.put(`/requests/${quiet.id}/vote`);
      await u2.agent.post(`/requests/${popular.id}/comments`).send({ body: 'me too' });
      await admin.agent.patch(`/admin/requests/${popular.id}/status`).send({ status: 'PLANNED' });

      const res = await admin.agent.get('/admin/stats');
      expect(res.status).toBe(200);
      expect(res.body.totals).toMatchObject({ requests: 2, votes: 3, comments: 1, mergedDuplicates: 0, newLast7Days: 2 });
      expect(res.body.byStatus).toEqual({
        UNDER_REVIEW: 1,
        PLANNED: 1,
        IN_PROGRESS: 0,
        RELEASED: 0,
        DECLINED: 0,
      });
      expect(res.body.topRequests.map((t: any) => [t.title, t.voteCount])).toEqual([
        ['Popular request', 2],
        ['Quiet request', 1],
      ]);
    });
  });
});
