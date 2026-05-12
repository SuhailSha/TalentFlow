import * as crypto from 'crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { UserInvitation } from '@repo/database';

import type { EnvConfig } from '../../config';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../../email/email.service';
import { UsersRepository } from './users.repository';
import type { ListUsersDto } from './dto/list-users.dto';
import type { InviteUserDto } from './dto/invite-user.dto';
import type { AssignRolesDto } from './dto/assign-roles.dto';

const INVITATION_TTL_HOURS = 72;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly repo: UsersRepository,
    private readonly db: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService<EnvConfig, true>,
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
    const { token, tokenHash, expiresAt } = this.generateInvitationToken();

    const invitation = await this.db.userInvitation.create({
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

    await this.dispatchInvitationEmail(invitation, token, user);
    return invitation;
  }

  async resendInvitation(user: RequestUser, invitationId: string) {
    const existing = await this.db.userInvitation.findFirst({
      where: { id: invitationId, organizationId: user.organizationId },
    });
    if (!existing) throw new NotFoundException('Invitation not found');
    if (existing.status === 'ACCEPTED') {
      throw new BadRequestException('Invitation has already been accepted');
    }
    if (existing.status === 'REVOKED') {
      throw new BadRequestException('Cannot resend a revoked invitation');
    }

    // Rotate token so old links stop working.
    const { token, tokenHash, expiresAt } = this.generateInvitationToken();
    const refreshed = await this.db.userInvitation.update({
      where: { id: invitationId },
      data:  { tokenHash, expiresAt, status: 'PENDING' },
    });

    await this.dispatchInvitationEmail(refreshed, token, user);
    return refreshed;
  }

  async listInvitations(user: RequestUser) {
    const invitations = await this.db.userInvitation.findMany({
      where:   { organizationId: user.organizationId, status: { in: ['PENDING', 'EXPIRED'] } },
      orderBy: { createdAt: 'desc' },
    });

    // Decorate with the latest EmailDelivery for visibility in the UI.
    const deliveries = await this.db.emailDelivery.findMany({
      where: {
        organizationId: user.organizationId,
        resourceType:   'UserInvitation',
        resourceId:     { in: invitations.map((i) => i.id) },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by resourceId, keep most recent only.
    const byInvitationId = new Map<string, typeof deliveries[number]>();
    for (const d of deliveries) {
      if (d.resourceId && !byInvitationId.has(d.resourceId)) {
        byInvitationId.set(d.resourceId, d);
      }
    }

    return invitations.map((inv) => ({
      ...inv,
      lastDelivery: byInvitationId.get(inv.id) ?? null,
    }));
  }

  async revokeInvitation(user: RequestUser, invitationId: string) {
    const invitation = await this.db.userInvitation.findFirst({
      where: { id: invitationId, organizationId: user.organizationId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return this.db.userInvitation.update({
      where: { id: invitationId },
      data:  { status: 'REVOKED', revokedById: user.userId, revokedAt: new Date() },
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

  // ── Internal ────────────────────────────────────────────────────────────────

  private generateInvitationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
    return { token, tokenHash, expiresAt };
  }

  private async dispatchInvitationEmail(
    invitation: UserInvitation,
    rawToken: string,
    actor: RequestUser,
  ) {
    const [org, inviter] = await Promise.all([
      this.db.organization.findUnique({ where: { id: invitation.organizationId } }),
      this.db.user.findUnique({ where: { id: actor.userId } }),
    ]);

    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`.trim()
      : actor.email;
    const organizationName = org?.name ?? 'your team';
    const appUrl = this.config.get('APP_URL', { infer: true });
    const acceptUrl = `${appUrl}/accept-invitation?token=${rawToken}`;

    try {
      // Idempotency key includes the token hash so manual resend (which
      // rotates the token) produces a new send. Auto-replays of the same
      // event (e.g. duplicate event emissions) dedup against the existing
      // delivery within the EMAIL_DEDUP_WINDOW.
      const tokenFragment = invitation.tokenHash.slice(0, 12);
      await this.email.send({
        template:       'user_invitation',
        to:             invitation.email,
        organizationId: invitation.organizationId,
        resourceType:   'UserInvitation',
        resourceId:     invitation.id,
        idempotencyKey: `invitation:${invitation.id}:${tokenFragment}`,
        payload: {
          inviterName,
          organizationName,
          recipientName:  `${invitation.firstName} ${invitation.lastName}`.trim(),
          acceptUrl,
          expiresInHours: INVITATION_TTL_HOURS,
        },
      });
    } catch (err) {
      // Email failure must not roll back the invitation row — the recruiter
      // can re-trigger via Resend. Surface the failure in logs + delivery row.
      this.logger.error(
        { err, invitationId: invitation.id },
        'Failed to dispatch invitation email',
      );
    }
  }
}
