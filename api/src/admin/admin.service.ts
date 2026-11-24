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

  /** Change the status and write an audit row in one transaction */
  async setStatus(adminId: string, id: string, status: RequestStatus) {
    await this.prisma.$transaction(async (tx) => {
      const locked = await lockRequest(tx, id, 'UPDATE');
      if (locked.mergedIntoId) throw mergedError();

      const current = await tx.featureRequest.findUniqueOrThrow({
        where: { id },
        select: { status: true },
      });
      if (current.status === status) return; // no change, no audit row

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
   * Merge a duplicate (source) into the request we keep (target), in one transaction.
   * Lock both rows in id order (avoids deadlocks), move comments, move votes
   * (drop the extra vote if someone voted on both), repoint older merges,
   * then mark the source as merged. The source row stays so old links still work.
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
      await tx.vote.deleteMany({ where: { requestId: sourceId } }); // leftovers from people who voted on both

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

    // include statuses with zero requests
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
