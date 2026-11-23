import { Injectable } from '@nestjs/common';
import { lockRequest, mergedError } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add my vote. Safe to call any number of times, even at the same moment:
   *
   *  1. The transaction takes a shared lock on the request row, so a merge
   *     cannot run halfway through our insert (see request-lock.ts).
   *  2. `createMany(skipDuplicates)` becomes INSERT ... ON CONFLICT DO NOTHING.
   *     The unique index (userId, requestId) is the real guard: if two calls
   *     race, the database lets exactly one row in and the other does nothing.
   *     No error, no read-then-write gap, no duplicate.
   */
  async add(userId: string, requestId: string) {
    await this.prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, requestId, 'SHARE');
      if (request.mergedIntoId) throw mergedError();
      await tx.vote.createMany({ data: [{ userId, requestId }], skipDuplicates: true });
    });
    return this.state(userId, requestId);
  }

  /** Remove my vote. Removing a vote that is already gone is not an error. */
  async remove(userId: string, requestId: string) {
    await this.prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, requestId, 'SHARE');
      if (request.mergedIntoId) throw mergedError();
      await tx.vote.deleteMany({ where: { userId, requestId } });
    });
    return this.state(userId, requestId);
  }

  /** Total is counted from the rows, so it is always exact. */
  private async state(userId: string, requestId: string) {
    const [voteCount, mine] = await Promise.all([
      this.prisma.vote.count({ where: { requestId } }),
      this.prisma.vote.count({ where: { requestId, userId } }),
    ]);
    return { requestId, voteCount, hasVoted: mine > 0 };
  }
}
