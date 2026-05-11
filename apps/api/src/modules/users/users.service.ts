import * as crypto from 'crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { UsersRepository } from './users.repository';
import type { ListUsersDto } from './dto/list-users.dto';
import type { InviteUserDto } from './dto/invite-user.dto';
import type { AssignRolesDto } from './dto/assign-roles.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly repo: UsersRepository,
    private readonly db: PrismaService,
  ) {}

  async list(user: RequestUser, dto: ListUsersDto) {
    return this.repo.findMany(user.organizationId, dto);
  }

  async findById(user: RequestUser, id: string) {
    const found = await this.repo.findById(user.organizationId, id);
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  async invite(user: RequestUser, dto: InviteUserDto) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    return this.db.userInvitation.create({
      data: {
        organizationId: user.organizationId,
        email:          dto.email,
        firstName:      dto.firstName,
        lastName:       dto.lastName,
        tokenHash,
        roleIds:        dto.roleIds ?? [],
        expiresAt,
        invitedById:    user.userId,
      },
    });
  }

  async listInvitations(user: RequestUser) {
    return this.db.userInvitation.findMany({
      where: { organizationId: user.organizationId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeInvitation(user: RequestUser, invitationId: string) {
    const invitation = await this.db.userInvitation.findFirst({
      where: { id: invitationId, organizationId: user.organizationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return this.db.userInvitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED', revokedById: user.userId, revokedAt: new Date() },
    });
  }

  async activate(user: RequestUser, id: string) {
    await this.findById(user, id);
    return this.repo.updateStatus(user.organizationId, id, 'ACTIVE');
  }

  async deactivate(user: RequestUser, id: string) {
    if (id === user.userId) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    await this.findById(user, id);
    return this.repo.updateStatus(user.organizationId, id, 'DEACTIVATED');
  }

  async assignRoles(user: RequestUser, id: string, dto: AssignRolesDto) {
    await this.findById(user, id);
    return this.repo.assignRoles(user.organizationId, id, dto.roleIds);
  }
}
