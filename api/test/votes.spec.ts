import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import { createApp, newRequest, newUser, resetDb } from './helpers';

describe('Voting integrity', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const rowsFor = (requestId: string) => prisma.vote.count({ where: { requestId } });

  it('requires login', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    const res = await request(app.getHttpServer()).put(`/requests/${r.id}/vote`);
    expect(res.status).toBe(401);
  });

  it('adds a vote and shows it in the counts', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    const res = await agent.put(`/requests/${r.id}/vote`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ requestId: r.id, voteCount: 1, hasVoted: true });
  });

  it('is idempotent: repeating PUT never creates a second vote', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    for (let i = 0; i < 5; i++) {
      const res = await agent.put(`/requests/${r.id}/vote`);
      expect(res.status).toBe(200);
      expect(res.body.voteCount).toBe(1);
    }
    expect(await rowsFor(r.id)).toBe(1);
  });

  it('removes a vote, and removing again is harmless', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    await agent.put(`/requests/${r.id}/vote`);
    const first = await agent.delete(`/requests/${r.id}/vote`);
    const second = await agent.delete(`/requests/${r.id}/vote`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ requestId: r.id, voteCount: 0, hasVoted: false });
  });

  it("only removes the caller's own vote", async () => {
    const a = await newUser(app);
    const b = await newUser(app);
    const r = await newRequest(a.agent);
    await a.agent.put(`/requests/${r.id}/vote`);
    await b.agent.put(`/requests/${r.id}/vote`);
    await b.agent.delete(`/requests/${r.id}/vote`);
    expect(await rowsFor(r.id)).toBe(1);
    expect((await a.agent.get(`/requests/${r.id}`)).body.hasVoted).toBe(true);
  });

  it('CONCURRENCY: 25 identical parallel votes from one user create exactly 1 vote', async () => {
    const { agent } = await newUser(app);
    const r = await newRequest(agent);
    const results = await Promise.all(
      Array.from({ length: 25 }, () => agent.put(`/requests/${r.id}/vote`)),
    );
    expect(results.every((x) => x.status === 200)).toBe(true);
    expect(await rowsFor(r.id)).toBe(1);
  });

  it('CONCURRENCY: 25 users voting at the same moment give a total of exactly 25', async () => {
    const owner = await newUser(app);
    const r = await newRequest(owner.agent);
    const voters = await Promise.all(Array.from({ length: 25 }, () => newUser(app, 'Voter')));
    const results = await Promise.all(voters.map((v) => v.agent.put(`/requests/${r.id}/vote`)));
    expect(results.every((x) => x.status === 200)).toBe(true);
    expect(await rowsFor(r.id)).toBe(25);
    expect((await owner.agent.get(`/requests/${r.id}`)).body.voteCount).toBe(25);
  });

  it('CONCURRENCY: parallel votes and un-votes from many users end with correct totals', async () => {
    const owner = await newUser(app);
    const r = await newRequest(owner.agent);
    const voters = await Promise.all(Array.from({ length: 20 }, () => newUser(app, 'Voter')));
    // everyone votes, half un-vote, all at once, a few rounds
    await Promise.all(voters.map((v) => v.agent.put(`/requests/${r.id}/vote`)));
    await Promise.all(
      voters.flatMap((v, i) =>
        i % 2 === 0
          ? [v.agent.delete(`/requests/${r.id}/vote`), v.agent.delete(`/requests/${r.id}/vote`)]
          : [v.agent.put(`/requests/${r.id}/vote`)],
      ),
    );
    expect(await rowsFor(r.id)).toBe(10);
  });

  it('returns 404 when voting on a request that does not exist', async () => {
    const { agent } = await newUser(app);
    const res = await agent.put('/requests/3f6c1b5e-0000-4000-8000-000000000000/vote');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('REQUEST_NOT_FOUND');
  });

  it('the database itself refuses a duplicate vote, even if the app code is bypassed', async () => {
    const { agent, user } = await newUser(app);
    const r = await newRequest(agent);
    await prisma.vote.create({ data: { userId: user.id, requestId: r.id } });
    await expect(prisma.vote.create({ data: { userId: user.id, requestId: r.id } })).rejects.toThrow();
    expect(await rowsFor(r.id)).toBe(1);
  });
});
