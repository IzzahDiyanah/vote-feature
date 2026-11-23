import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, newRequest, newUser, resetDb } from './helpers';

describe('Requests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  it('creates a request with default status UNDER_REVIEW and zero counts', async () => {
    const { agent, user } = await newUser(app, 'Ann');
    const res = await agent.post('/requests').send({ title: 'Dark mode', description: 'Please add a dark theme.' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Dark mode',
      status: 'UNDER_REVIEW',
      voteCount: 0,
      commentCount: 0,
      hasVoted: false,
      author: { id: user.id, name: 'Ann' },
    });
  });

  it('validates input on the server (400 with details)', async () => {
    const { agent } = await newUser(app);
    const res = await agent.post('/requests').send({ title: 'abc', description: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses to let the client set status or author', async () => {
    const { agent } = await newUser(app);
    const res = await agent
      .post('/requests')
      .send({ title: 'Sneaky request', description: 'Trying to set my own status.', status: 'RELEASED' });
    expect(res.status).toBe(400);
  });

  it('only the author can edit a request (others get 403, nothing changes)', async () => {
    const owner = await newUser(app, 'Owner');
    const other = await newUser(app, 'Other');
    const created = await newRequest(owner.agent, 'Original title', 'Original description here.');

    const denied = await other.agent.patch(`/requests/${created.id}`).send({ title: 'Hijacked title' });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('NOT_AUTHOR');

    const unchanged = await owner.agent.get(`/requests/${created.id}`);
    expect(unchanged.body.title).toBe('Original title');

    const ok = await owner.agent.patch(`/requests/${created.id}`).send({ title: 'Better title' });
    expect(ok.status).toBe(200);
    expect(ok.body.title).toBe('Better title');
  });

  it('returns 404 for a missing request and 400 for a malformed id', async () => {
    const { agent } = await newUser(app);
    expect((await agent.get('/requests/3f6c1b5e-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await agent.get('/requests/not-a-uuid')).status).toBe(400);
  });

  describe('list: search, filter, sort, paging', () => {
    it('searches title and description, case-insensitively', async () => {
      const { agent } = await newUser(app);
      await newRequest(agent, 'Dark mode please', 'Eyes hurt at night time.');
      await newRequest(agent, 'Export to CSV', 'Download my data as a spreadsheet.');
      const byTitle = await agent.get('/requests').query({ q: 'DARK' });
      expect(byTitle.body.items.map((i: any) => i.title)).toEqual(['Dark mode please']);
      const byDescription = await agent.get('/requests').query({ q: 'spreadsheet' });
      expect(byDescription.body.items.map((i: any) => i.title)).toEqual(['Export to CSV']);
    });

    it('treats % and _ in the search text as plain characters', async () => {
      const { agent } = await newUser(app);
      await newRequest(agent, 'Plain title here', 'Nothing special inside.');
      const res = await agent.get('/requests').query({ q: '%' });
      expect(res.body.total).toBe(0);
    });

    it('filters by status', async () => {
      const { agent } = await newUser(app);
      const a = await newRequest(agent, 'First request', 'Some description text.');
      await newRequest(agent, 'Second request', 'Some description text.');
      await prisma.featureRequest.update({ where: { id: a.id }, data: { status: 'PLANNED' } });
      const res = await agent.get('/requests').query({ status: 'PLANNED' });
      expect(res.body.items.map((i: any) => i.id)).toEqual([a.id]);
      expect((await agent.get('/requests').query({ status: 'BOGUS' })).status).toBe(400);
    });

    it('sorts by votes and by comments, newest first by default', async () => {
      const u1 = await newUser(app);
      const u2 = await newUser(app);
      const older = await newRequest(u1.agent, 'Older request', 'Older description text.');
      const popular = await newRequest(u1.agent, 'Popular request', 'Popular description text.');
      const newest = await newRequest(u1.agent, 'Newest request', 'Newest description text.');
      await u1.agent.put(`/requests/${popular.id}/vote`);
      await u2.agent.put(`/requests/${popular.id}/vote`);
      await u1.agent.put(`/requests/${older.id}/vote`);
      await prisma.comment.create({ data: { requestId: older.id, authorId: u1.user.id, body: 'hi' } });

      const ids = async (sort: string) =>
        (await u1.agent.get('/requests').query({ sort })).body.items.map((i: any) => i.id);
      expect(await ids('newest')).toEqual([newest.id, popular.id, older.id]);
      expect(await ids('votes')).toEqual([popular.id, older.id, newest.id]);
      expect((await ids('comments'))[0]).toBe(older.id);
    });

    it('pages without overlap and reports the total', async () => {
      const { agent } = await newUser(app);
      for (let i = 0; i < 5; i++) await newRequest(agent, `Request number ${i}`, 'Some description text.');
      const p1 = await agent.get('/requests').query({ page: 1, pageSize: 2 });
      const p2 = await agent.get('/requests').query({ page: 2, pageSize: 2 });
      const p3 = await agent.get('/requests').query({ page: 3, pageSize: 2 });
      expect(p1.body.total).toBe(5);
      const all = [...p1.body.items, ...p2.body.items, ...p3.body.items].map((i: any) => i.id);
      expect(new Set(all).size).toBe(5);
      expect(p3.body.items).toHaveLength(1);
      expect((await agent.get('/requests').query({ pageSize: 500 })).status).toBe(400);
    });

    it('shows hasVoted per user', async () => {
      const a = await newUser(app);
      const b = await newUser(app);
      const r = await newRequest(a.agent);
      await a.agent.put(`/requests/${r.id}/vote`);
      expect((await a.agent.get('/requests')).body.items[0]).toMatchObject({ hasVoted: true, voteCount: 1 });
      expect((await b.agent.get('/requests')).body.items[0]).toMatchObject({ hasVoted: false, voteCount: 1 });
    });
  });
});
