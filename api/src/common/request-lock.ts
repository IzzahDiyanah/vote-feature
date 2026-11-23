import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface LockedRequest {
  id: string;
  mergedIntoId: string | null;
}

/**
 * Lock one FeatureRequest row for the rest of the current transaction.
 *
 *  - 'SHARE'  : used by voting and commenting. Many users can hold it at once,
 *               but it blocks a merge (which needs 'UPDATE') until they finish.
 *  - 'UPDATE' : used by merge and status change. Waits for all SHARE holders,
 *               and makes new voters wait until it is done.
 *
 * This is what stops a vote or comment from landing on a request in the
 * middle of being merged (it would be stranded on the old request).
 * Because the lock is released at COMMIT, a waiting vote then re-reads the row
 * and sees `mergedIntoId`, so it gets a clean 409 instead.
 */
export async function lockRequest(
  tx: Prisma.TransactionClient,
  id: string,
  mode: 'SHARE' | 'UPDATE',
): Promise<LockedRequest> {
  const lock = mode === 'UPDATE' ? Prisma.sql`FOR UPDATE` : Prisma.sql`FOR SHARE`;
  const rows = await tx.$queryRaw<LockedRequest[]>`
    SELECT id, "mergedIntoId" FROM "FeatureRequest" WHERE id = ${id} ${lock}`;
  if (rows.length === 0) {
    throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
  }
  return rows[0];
}

export function mergedError() {
  return new ConflictException({
    code: 'REQUEST_MERGED',
    message: 'This request was merged into another one',
  });
}
