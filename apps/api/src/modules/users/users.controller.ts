import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { Permission } from '../../auth/permissions/permissions';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { ok, paginated } from '../../common/helpers/response.helper';
import { UsersService } from './users.service';
import { ListUsersDto } from './dto/list-users.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USERS_READ)
  async list(
    @CurrentUser() user: RequestUser,
    @Query() dto: ListUsersDto,
    @Req() req: Request,
  ) {
    const { data, total } = await this.service.list(user, dto);
    return paginated(data, { total, page: dto.page ?? 1, limit: dto.limit ?? 20 }, req.requestId);
  }

  @Get('invitations')
  @RequirePermissions(Permission.INVITATIONS_READ)
  async listInvitations(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return ok(await this.service.listInvitations(user), req.requestId);
  }

  @Get(':id')
  @RequirePermissions(Permission.USERS_READ)
  async findById(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.findById(user, id), req.requestId);
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions(Permission.USERS_INVITE)
  async invite(
    @CurrentUser() user: RequestUser,
    @Body() dto: InviteUserDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.invite(user, dto), req.requestId);
  }

  @Post('invitations/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.INVITATIONS_REVOKE)
  async revokeInvitation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.revokeInvitation(user, id), req.requestId);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USERS_UPDATE)
  async activate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.activate(user, id), req.requestId);
  }

  @Post(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USERS_SUSPEND)
  async deactivate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return ok(await this.service.deactivate(user, id), req.requestId);
  }

  @Put(':id/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.USERS_UPDATE)
  async assignRoles(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRolesDto,
    @Req() req: Request,
  ) {
    return ok(await this.service.assignRoles(user, id, dto), req.requestId);
  }
}
