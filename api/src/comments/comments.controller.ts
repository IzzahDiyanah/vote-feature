import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { CreateCommentDto, ListCommentsQuery } from './comments.dto';
import { CommentsService } from './comments.service';

@Controller('requests/:id/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListCommentsQuery) {
    return this.comments.list(id, query);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(user.id, id, dto);
  }
}
