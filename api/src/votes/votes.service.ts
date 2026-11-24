import { Injectable } from '@nestjs/common';
import { lockRequest, mergedError } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add my vote. Safe to call repeatedly or in parallel.
   * Takes a shared lock (see request-lock.ts) and inserts with ON CONFLICT DO NOTHING,
   * so the unique (userId, requestId) index stops duplicates.
   */
  async add(userId: string, requestId: string) {
    await this.prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, requestId, 'SHARE');
      if (request.mergedIntoId) throw mergedError();
      await tx.vote.createMany({ data: [{ userId, requestId }], skipDuplicates: true });
    });
    return this.state(userId, requestId);
  }

  /** Remove my vote. No error if it is already gone. */
  async remove(userId: string, requestId: string) {
    await this.prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, requestId, 'SHARE');
      if (request.mergedIntoId) throw mergedError();
      await tx.vote.deleteMany({ where: { userId, requestId } });
    });
    return this.state(userId, requestId);
  }

  /** Count straight from the rows */
  private async state(userId: string, requestId: string) {
    const [voteCount, mine] = await Promise.all([
      this.prisma.vote.count({ where: { requestId } }),
      this.prisma.vote.count({ where: { requestId, userId } }),
    ]);
    return { requestId, voteCount, hasVoted: mine > 0 };
  }
}
