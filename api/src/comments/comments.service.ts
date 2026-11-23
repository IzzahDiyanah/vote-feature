import { Injectable, NotFoundException } from '@nestjs/common';
import { lockRequest, mergedError } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, ListCommentsQuery } from './comments.dto';

const COMMENT_SELECT = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(requestId: string, { page, pageSize }: ListCommentsQuery) {
    const exists = await this.prisma.featureRequest.count({ where: { id: requestId } });
    if (!exists) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });

    const where = { requestId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: COMMENT_SELECT,
      }),
      this.prisma.comment.count({ where }),
    ]);
    return { items, page, pageSize, total };
  }

  /**
   * Same pattern as voting: a shared lock on the request row means a comment
   * can never be added to a request in the middle of being merged.
   */
  create(authorId: string, requestId: string, dto: CreateCommentDto) {
    return this.prisma.$transaction(async (tx) => {
      const request = await lockRequest(tx, requestId, 'SHARE');
      if (request.mergedIntoId) throw mergedError();
      return tx.comment.create({
        data: { requestId, authorId, body: dto.body },
        select: COMMENT_SELECT,
      });
    });
  }
}
