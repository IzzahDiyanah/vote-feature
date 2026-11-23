import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { LockedRequest, lockRequest, mergedError } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from '../requests/requests.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly requests: RequestsService,
  ) {}

  /** Change status and write an audit row. Both happen in one transaction, or neither does. */
  async setStatus(adminId: string, id: string, status: RequestStatus) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await lockRequest(tx, id, 'UPDATE');
      if (locked.mergedIntoId) throw mergedError();

      const current = await tx.featureRequest.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (current.status === status) return; // nothing changed, so no audit row

      await tx.featureRequest.update({ where: { id }, data: { status } });
      await tx.statusChange.create({
        data: { requestId: id, adminId, fromStatus: current.status, toStatus: status },
      });
    });
    return this.requests.get(adminId, id);
  }

  async setOfficialResponse(adminId: string, id: string, message: string) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await lockRequest(tx, id, 'UPDATE');
      if (locked.mergedIntoId) throw mergedError();
      await tx.featureRequest.update({
        where: { id },
        data: { officialResponse: message, officialResponseAt: new Date() },
      });
    });
    return this.requests.get(adminId, id);
  }

  /**
   * Merge a duplicate (source) into the request we keep (target).
   *
   * Everything below runs in ONE transaction: if any step fails, the database
   * is exactly as it was before. No votes or comments are ever lost.
   *
   *  1. Lock both rows (always in id order, so two merges can never deadlock).
   *     Voters and commenters wait on these locks, then see "merged" and get a 409.
   *  2. Move comments to the target.
   *  3. Move votes to the target. If someone voted on BOTH requests, keep
   *     only their one vote on the target (the unique index allows no more).
   *  4. Anything that was already merged into the source now points at the target.
   *  5. Mark the source as merged. It stays in the database, so links to it
   *     still work and the history is kept.
   */
  async merge(adminId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestException({
        code: 'CANNOT_MERGE_INTO_SELF',
        message: 'A request cannot be merged into itself',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const locked = new Map<string, LockedRequest>();
      for (const id of [sourceId, targetId].sort()) {
        locked.set(id, await lockRequest(tx, id, 'UPDATE'));
      }
      if (locked.get(sourceId)!.mergedIntoId) throw mergedError();
      if (locked.get(targetId)!.mergedIntoId) {
        throw new ConflictException({
          code: 'TARGET_MERGED',
          message: 'The request you chose was itself merged into another one. Pick that one instead.',
        });
      }

      await tx.comment.updateMany({ where: { requestId: sourceId }, data: { requestId: targetId } });

      await tx.$executeRaw`
        UPDATE "Vote" SET "requestId" = ${targetId}
        WHERE "requestId" = ${sourceId}
          AND "userId" NOT IN (SELECT "userId" FROM "Vote" WHERE "requestId" = ${targetId})`;
      await tx.vote.deleteMany({ where: { requestId: sourceId } }); // leftovers: double voters

      await tx.featureRequest.updateMany({
        where: { mergedIntoId: sourceId },
        data: { mergedIntoId: targetId },
      });
      await tx.featureRequest.update({ where: { id: sourceId }, data: { mergedIntoId: targetId } });
    });

    return this.requests.get(adminId, targetId);
  }

  async stats() {
    const active = { mergedIntoId: null };
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [requests, byStatus, votes, comments, merged, newLast7Days, top] = await Promise.all([
      this.prisma.featureRequest.count({ where: active }),
      this.prisma.featureRequest.groupBy({ by: ['status'], where: active, _count: { _all: true } }),
      this.prisma.vote.count(),
      this.prisma.comment.count(),
      this.prisma.featureRequest.count({ where: { mergedIntoId: { not: null } } }),
      this.prisma.featureRequest.count({ where: { ...active, createdAt: { gte: sevenDaysAgo } } }),
      this.prisma.featureRequest.findMany({
        where: active,
        orderBy: [{ votes: { _count: 'desc' } }, { createdAt: 'desc' }],
        take: 5,
        select: { id: true, title: true, status: true, _count: { select: { votes: true } } },
      }),
    ]);

    // every status is present, even with zero requests
    const counts = Object.fromEntries(
      Object.values(RequestStatus).map((s) => [s, 0]),
    ) as Record<RequestStatus, number>;
    for (const row of byStatus) counts[row.status] = row._count._all;

    return {
      totals: { requests, votes, comments, mergedDuplicates: merged, newLast7Days },
      byStatus: counts,
      topRequests: top.map((r) => ({ id: r.id, title: r.title, status: r.status, voteCount: r._count.votes })),
    };
  }
}
