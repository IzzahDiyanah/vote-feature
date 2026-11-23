import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mergedError } from '../common/request-lock';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto, ListRequestsQuery, UpdateRequestDto } from './requests.dto';

/**
 * What we read for every request. Vote and comment totals are COUNTed from
 * the rows themselves (never stored), so they cannot drift out of sync.
 * `votes` with a where-clause tells us if the current user has voted.
 */
function selectFor(userId: string) {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    officialResponse: true,
    officialResponseAt: true,
    mergedIntoId: true,
    createdAt: true,
    updatedAt: true,
    author: { select: { id: true, name: true } },
    _count: { select: { votes: true, comments: true } },
    votes: { where: { userId }, select: { id: true }, take: 1 },
  } satisfies Prisma.FeatureRequestSelect;
}

type Row = Prisma.FeatureRequestGetPayload<{ select: ReturnType<typeof selectFor> }>;

export function toDto({ _count, votes, ...rest }: Row) {
  return { ...rest, voteCount: _count.votes, commentCount: _count.comments, hasVoted: votes.length > 0 };
}

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListRequestsQuery) {
    const { q, status, sort, page, pageSize } = query;
    // `contains` turns into ILIKE, where % and _ are wildcards. Escape them so
    // the user's text is searched literally.
    const text = q?.replace(/[\\%_]/g, '\\$&');

    const where: Prisma.FeatureRequestWhereInput = {
      mergedIntoId: null, // merged duplicates are hidden from the list
      ...(status && { status }),
      ...(text && {
        OR: [
          { title: { contains: text, mode: 'insensitive' } },
          { description: { contains: text, mode: 'insensitive' } },
        ],
      }),
    };

    const orderBy: Prisma.FeatureRequestOrderByWithRelationInput[] =
      sort === 'votes'
        ? [{ votes: { _count: 'desc' } }, { createdAt: 'desc' }]
        : sort === 'comments'
          ? [{ comments: { _count: 'desc' } }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];
    orderBy.push({ id: 'asc' }); // stable order, so pages never overlap

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.featureRequest.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: selectFor(userId),
      }),
      this.prisma.featureRequest.count({ where }),
    ]);

    return { items: rows.map(toDto), page, pageSize, total };
  }

  async get(userId: string, id: string) {
    const row = await this.prisma.featureRequest.findUnique({
      where: { id },
      select: {
        ...selectFor(userId),
        statusChanges: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, fromStatus: true, toStatus: true, createdAt: true },
        },
      },
    });
    if (!row) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });
    const { statusChanges, ...rest } = row;
    return { ...toDto(rest), statusHistory: statusChanges };
  }

  async create(userId: string, dto: CreateRequestDto) {
    const row = await this.prisma.featureRequest.create({
      data: { title: dto.title, description: dto.description, authorId: userId },
      select: selectFor(userId),
    });
    return toDto(row);
  }

  async update(userId: string, id: string, dto: UpdateRequestDto) {
    const existing = await this.prisma.featureRequest.findUnique({
      where: { id },
      select: { authorId: true, mergedIntoId: true },
    });
    if (!existing) throw new NotFoundException({ code: 'REQUEST_NOT_FOUND', message: 'Request not found' });

    // Ownership is checked on the server. No one can edit another user's request.
    if (existing.authorId !== userId) {
      throw new ForbiddenException({
        code: 'NOT_AUTHOR',
        message: 'You can only edit your own requests',
      });
    }
    if (existing.mergedIntoId) throw mergedError();
    if (dto.title === undefined && dto.description === undefined) {
      throw new ConflictException({ code: 'NOTHING_TO_UPDATE', message: 'Nothing to update' });
    }

    const row = await this.prisma.featureRequest.update({
      where: { id },
      data: { title: dto.title, description: dto.description },
      select: selectFor(userId),
    });
    return toDto(row);
  }
}
