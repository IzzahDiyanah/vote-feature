import { Controller, Delete, HttpCode, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../common/decorators';
import { VotesService } from './votes.service';

/**
 * PUT and DELETE (not POST) on purpose: both mean "make it so", so repeating
 * the same call gives the same result. That is what makes retries safe.
 */
@Controller('requests/:id/vote')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Put()
  @HttpCode(200)
  add(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.votes.add(user.id, id);
  }

  @Delete()
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.votes.remove(user.id, id);
  }
}
