import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';
import { MergeDto, OfficialResponseDto, UpdateStatusDto } from './admin.dto';
import { AdminService } from './admin.service';

/** Every route here is admin-only. The check is `@Roles` + RolesGuard, on the server. */
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Patch('requests/:id/status')
  setStatus(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.admin.setStatus(user.id, id, dto.status);
  }

  @Put('requests/:id/response')
  setResponse(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OfficialResponseDto,
  ) {
    return this.admin.setOfficialResponse(user.id, id, dto.message);
  }

  @Post('requests/:id/merge')
  @HttpCode(200)
  merge(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MergeDto,
  ) {
    return this.admin.merge(user.id, id, dto.targetId);
  }

  @Get('stats')
  stats() {
    return this.admin.stats();
  }
}
