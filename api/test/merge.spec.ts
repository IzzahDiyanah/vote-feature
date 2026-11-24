import { INestApplication, Logger } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { Agent, createApp, newAdmin, newRequest, newUser, resetDb } from './helpers';

describe('Merging duplicate requests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => ({ app, prisma } = await createApp()));
  afterAll(() => app.close());
  beforeEach(() => resetDb(prisma));

  const votesOn = (requestId: string) => prisma.vote.count({ where: { requestId } });
  const commentsOn = (requestId: string) => prisma.comment.count({ where: { requestId } });
  const merge = (admin: { agent: Agent }, sourceId: string, targetId: string) =>
    admin.agent.post(`/admin/requests/${sourceId}/merge`).send({ targetId });

  /** Two requests: source voted by A,B, target by B,C, one comment each */
  async function scenario() {
    const admin = await newAdmin(app, prisma);
    const [a, b, c] = [await newUser(app, 'A'), await newUser(app, 'B'), await newUser(app, 'C')];
    const source = await newRequest(a.agent, 'Duplicate request', 'The same idea, said differently.');
    const target = await newRequest(a.agent, 'Original request', 'The first time this was asked.');
    await a.agent.put(`/requests/${source.id}/vote`);
    await b.agent.put(`/requests/${source.id}/vote`);
    await b.agent.put(`/requests/${target.id}/vote`);
    await c.agent.put(`/requests/${target.id}/vote`);
    await a.agent.post(`/requests/${source.id}/comments`).send({ body: 'comment on duplicate' });
    await c.agent.post(`/requests/${target.id}/comments`).send({ body: 'comment on original' });
    return { admin, a, b, c, source, target };
  }

  it('preserves every vote and comment, and counts a double-voter only once', async () => {
    const { admin, a, b, c, source, target } = await scenario();

    const res = await merge(admin, source.id, target.id);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(target.id);
    // A, B and C have one vote each, B voted on both so counts once
    expect(res.body.voteCount).toBe(3);
    expect(res.body.commentCount).toBe(2);

    expect(await votesOn(target.id)).toBe(3);
    expect(await commentsOn(target.id)).toBe(2);
    expect(await votesOn(source.id)).toBe(0);
    expect(await commentsOn(source.id)).toBe(0);

    // everyone shows as voted on the kept request
    for (const u of [a, b, c]) {
      expect((await u.agent.get(`/requests/${target.id}`)).body.hasVoted).toBe(true);
    }
  });

  it('keeps the duplicate as a redirect and hides it from the list', async () => {
    const { admin, a, source, target } = await scenario();
    await merge(admin, source.id, target.id);

    const detail = await a.agent.get(`/requests/${source.id}`);
    expect(detail.status).toBe(200);
    expect(detail.body.mergedIntoId).toBe(target.id);

    const list = await a.agent.get('/requests');
    expect(list.body.items.map((i: any) => i.id)).toEqual([target.id]);
    expect((await admin.agent.get('/admin/stats')).body.totals).toMatchObject({ requests: 1, mergedDuplicates: 1 });
  });

  it('points earlier duplicates at the final request (no chains)', async () => {
    const admin = await newAdmin(app, prisma);
    const c = await newRequest(admin.agent, 'Request C duplicate', 'Description for request C.');
    const b = await newRequest(admin.agent, 'Request B duplicate', 'Description for request B.');
    const a = await newRequest(admin.agent, 'Request A the original', 'Description for request A.');
    await merge(admin, c.id, b.id);
    await merge(admin, b.id, a.id);
    const rows = await prisma.featureRequest.findMany({ where: { id: { in: [b.id, c.id] } } });
    expect(rows.map((r) => r.mergedIntoId)).toEqual([a.id, a.id]);
  });

  it('refuses bad merges with clear errors', async () => {
    const { admin, source, target } = await scenario();
    const third = await newRequest(admin.agent, 'Third request', 'A third and separate request.');

    expect((await merge(admin, source.id, source.id)).body.error.code).toBe('CANNOT_MERGE_INTO_SELF');
    expect((await merge(admin, source.id, '3f6c1b5e-0000-4000-8000-000000000000')).status).toBe(404);
    expect((await merge(admin, '3f6c1b5e-0000-4000-8000-000000000000', target.id)).status).toBe(404);
    expect((await admin.agent.post(`/admin/requests/${source.id}/merge`).send({ targetId: 'nope' })).status).toBe(400);

    await merge(admin, source.id, target.id);
    expect((await merge(admin, source.id, third.id)).body.error.code).toBe('REQUEST_MERGED');
    expect((await merge(admin, third.id, source.id)).body.error.code).toBe('TARGET_MERGED');
  });

  it('MergeDto: rejects a bad request body with 400 before touching the database', async () => {
    const { admin, source, target } = await scenario();
    const url = `/admin/requests/${source.id}/merge`;

    const badBodies = [
      {}, // missing targetId
      { targetId: 'nope' }, // not a uuid
      { targetId: 12345 }, // wrong type
      { targetId: target.id, admin: true }, // extra field not allowed
    ];
    for (const body of badBodies) {
      const res = await admin.agent.post(url).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.length).toBeGreaterThan(0);
    }

    // none of the bad calls changed anything
    expect(await votesOn(source.id)).toBe(2);
    expect(await commentsOn(source.id)).toBe(1);
    expect((await prisma.featureRequest.findUniqueOrThrow({ where: { id: source.id } })).mergedIntoId).toBeNull();

    // valid body works
    expect((await admin.agent.post(url).send({ targetId: target.id })).status).toBe(200);
  });

  it('a merged request accepts no new votes, comments, edits or status changes', async () => {
    const { admin, a, b, source, target } = await scenario();
    await merge(admin, source.id, target.id);

    const codes = async (...calls: Promise<{ status: number; body: any }>[]) =>
      (await Promise.all(calls)).map((r) => `${r.status}:${r.body.error?.code}`);
    expect(
      await codes(
        b.agent.put(`/requests/${source.id}/vote`),
        b.agent.delete(`/requests/${source.id}/vote`),
        b.agent.post(`/requests/${source.id}/comments`).send({ body: 'too late' }),
        a.agent.patch(`/requests/${source.id}`).send({ title: 'Edited after merge' }),
        admin.agent.patch(`/admin/requests/${source.id}/status`).send({ status: 'PLANNED' }),
      ),
    ).toEqual(Array(5).fill('409:REQUEST_MERGED'));
  });

  it('ROLLBACK: if any step fails, no vote or comment moves and nothing is lost', async () => {
    const { admin, source, target } = await scenario();

    // make the last step of the merge fail in the db
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION fail_merge() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated failure'; END; $$ LANGUAGE plpgsql`);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER fail_merge_trigger BEFORE UPDATE OF "mergedIntoId" ON "FeatureRequest"
      FOR EACH ROW WHEN (NEW."mergedIntoId" = '${target.id}' AND OLD."id" = '${source.id}')
      EXECUTE FUNCTION fail_merge()`);
    const silence = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    try {
      const res = await merge(admin, source.id, target.id);
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_ERROR');

      // nothing moved, comments and votes are where they were
      expect(await votesOn(source.id)).toBe(2);
      expect(await votesOn(target.id)).toBe(2);
      expect(await commentsOn(source.id)).toBe(1);
      expect(await commentsOn(target.id)).toBe(1);
      expect((await prisma.featureRequest.findUniqueOrThrow({ where: { id: source.id } })).mergedIntoId).toBeNull();
    } finally {
      silence.mockRestore();
      await prisma.$executeRawUnsafe('DROP TRIGGER fail_merge_trigger ON "FeatureRequest"');
      await prisma.$executeRawUnsafe('DROP FUNCTION fail_merge()');
    }

    // once the failure is gone the same merge works
    expect((await merge(admin, source.id, target.id)).status).toBe(200);
  });

  it('CONCURRENCY: votes racing a merge are never lost or stranded on the old request', async () => {
    const admin = await newAdmin(app, prisma);
    const voters = await Promise.all(Array.from({ length: 15 }, () => newUser(app, 'Voter')));
    let sawBothOutcomes = { accepted: 0, rejected: 0 };

    for (let round = 0; round < 4; round++) {
      const source = await newRequest(admin.agent, `Duplicate ${round}`, 'A duplicate being merged.');
      const target = await newRequest(admin.agent, `Original ${round}`, 'The original request.');

      // votes and the merge all fire at once
      const [mergeRes, ...voteRes] = await Promise.all([
        merge(admin, source.id, target.id),
        ...voters.map((v) => v.agent.put(`/requests/${source.id}/vote`)),
      ]);
      expect(mergeRes.status).toBe(200);

      const onTarget = new Set((await prisma.vote.findMany({ where: { requestId: target.id } })).map((v) => v.userId));
      expect(await votesOn(source.id)).toBe(0); // nothing left behind

      voters.forEach((v, i) => {
        const status = voteRes[i].status;
        expect([200, 409]).toContain(status);
        // accepted votes are on the target, rejected ones are nowhere
        expect(onTarget.has(v.user.id)).toBe(status === 200);
        status === 200 ? sawBothOutcomes.accepted++ : sawBothOutcomes.rejected++;
      });
    }
    // just to see the race really happened, not an assertion
    // eslint-disable-next-line no-console
    console.log('race outcomes across rounds:', sawBothOutcomes);
  });
});
