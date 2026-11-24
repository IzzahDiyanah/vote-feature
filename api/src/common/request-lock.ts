import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface LockedRequest {
  id: string;
  mergedIntoId: string | null;
}

/**
 * Locks a FeatureRequest row until the transaction ends.
 *  - 'SHARE': votes and comments. Many can hold it, but it blocks a merge.
 *  - 'UPDATE': merge and status change. Waits for SHARE holders.
 * Stops a vote or comment landing on a request that is being merged.
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
