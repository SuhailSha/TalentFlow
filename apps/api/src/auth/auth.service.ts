import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@repo/database';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { randomUUID } from 'node:crypto';

import type { EnvConfig } from '../config';
import { PrismaService } from '../database';
import type { JwtPayload } from './types/jwt-payload.interface';
import type { RequestUser, UserProfile } from './types/request-user.interface';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
/** Access token cookie name */
export const ACCESS_TOKEN_COOKIE = 'access_token';
/** Refresh token cookie name */
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  // ── Credential validation (called by LocalStrategy) ───────────────────────

  /**
   * Validates email + password against the database.
   * Handles account locking after MAX_FAILED_ATTEMPTS consecutive failures.
   * Returns the User record on success; throws UnauthorizedException on failure.
   */
  async validateCredentials(
    email: string,
    password: string,
    organizationSlug: string,
  ): Promise<User> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug, deletedAt: null },
    });

    if (!org) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase().trim(), organizationId: org.id, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') {
      throw new UnauthorizedException('Account is not active');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account locked. Try again in ${minutesLeft} minute(s).`,
      );
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Password authentication not available for this account');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login — reset failure counters
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    return user;
  }

  // ── Token issuance ────────────────────────────────────────────────────────

  async login(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string; userProfile: UserProfile }> {
    const { permissions, roleNames } = await this.resolvePermissions(user.id, user.organizationId);

    const accessToken = this.issueAccessToken(user, roleNames, permissions);
    const { raw: refreshToken } = await this.issueRefreshToken(
      user.id,
      randomUUID(), // new family for new login session
      ipAddress,
      userAgent,
    );

    const userProfile = await this.buildUserProfile(user, roleNames, permissions);

    this.logger.log({ msg: 'User logged in', userId: user.id, orgId: user.organizationId });

    return { accessToken, refreshToken, userProfile };
  }

  async refreshTokens(
    rawRefreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Token reuse detection — entire family is compromised
    if (stored.revokedAt !== null) {
      this.logger.warn({
        msg: 'Refresh token reuse detected — revoking family',
        family: stored.family,
        userId: stored.userId,
      });
      await this.revokeFamily(stored.family);
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the used token and issue a new pair
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { permissions, roleNames } = await this.resolvePermissions(
      stored.userId,
      stored.user.organizationId,
    );

    const accessToken = this.issueAccessToken(stored.user, roleNames, permissions);
    const { raw: newRefreshToken } = await this.issueRefreshToken(
      stored.userId,
      stored.family, // same family — maintains the rotation chain
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    if (!rawRefreshToken) return;

    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) return;

    // Revoke only this session's tokens (not the entire family).
    // Use revokeFamily(stored.family) for a "log out all devices" feature.
    await this.prisma.refreshToken.updateMany({
      where: { family: stored.family },
      data: { revokedAt: new Date() },
    });
  }

  // ── Current user ──────────────────────────────────────────────────────────

  async getMe(requestUser: RequestUser): Promise<UserProfile> {
    const user = await this.prisma.user.findFirst({
      where: { id: requestUser.userId, deletedAt: null },
      include: { organization: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.buildUserProfile(user, requestUser.roles, requestUser.permissions);
  }

  // ── Password utilities ────────────────────────────────────────────────────

  async hashPassword(plaintext: string): Promise<string> {
    return bcrypt.hash(plaintext, 12);
  }

  // ── Invitation acceptance ─────────────────────────────────────────────────

  /**
   * Public preview of an invitation by raw token.
   * Used by the /accept-invitation page to render the form preamble.
   * Auto-marks invitations as EXPIRED if their TTL has passed.
   */
  async previewInvitation(rawToken: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    organizationName: string;
    inviterName: string | null;
    expiresAt: string;
  }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: { select: { name: true } },
        invitedBy:    { select: { firstName: true, lastName: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status === 'REVOKED') {
      throw new UnauthorizedException('This invitation has been revoked.');
    }
    if (invitation.status === 'ACCEPTED') {
      throw new UnauthorizedException('This invitation has already been accepted.');
    }
    if (invitation.expiresAt < new Date()) {
      if (invitation.status !== 'EXPIRED') {
        await this.prisma.userInvitation.update({
          where: { id: invitation.id },
          data:  { status: 'EXPIRED' },
        });
      }
      throw new UnauthorizedException('This invitation has expired.');
    }

    return {
      email:           invitation.email,
      firstName:       invitation.firstName,
      lastName:        invitation.lastName,
      organizationName: invitation.organization.name,
      inviterName:     invitation.invitedBy
        ? `${invitation.invitedBy.firstName} ${invitation.invitedBy.lastName}`.trim()
        : null,
      expiresAt:       invitation.expiresAt.toISOString(),
    };
  }

  /**
   * Accept an invitation: create the user account, assign roles from the
   * invitation, mark accepted, and issue an authenticated session.
   *
   * Wrapped in a transaction so a half-completed acceptance (e.g. role assign
   * fails after user create) doesn't leave dangling rows.
   */
  async acceptInvitation(params: {
    rawToken: string;
    password: string;
    firstName?: string;
    lastName?: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{ accessToken: string; refreshToken: string; userProfile: UserProfile }> {
    const tokenHash = createHash('sha256').update(params.rawToken).digest('hex');
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status === 'REVOKED') {
      throw new UnauthorizedException('This invitation has been revoked.');
    }
    if (invitation.status === 'ACCEPTED') {
      throw new UnauthorizedException('This invitation has already been accepted.');
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data:  { status: 'EXPIRED' },
      });
      throw new UnauthorizedException('This invitation has expired.');
    }

    // Reject if a user with this email already exists in the org (shouldn't
    // happen if invite endpoint validates, but the invitation may have been
    // created before that check existed).
    const existing = await this.prisma.user.findFirst({
      where: { organizationId: invitation.organizationId, email: invitation.email },
    });
    if (existing) {
      throw new UnauthorizedException('An account with this email already exists.');
    }

    const passwordHash = await this.hashPassword(params.password);
    const firstName = params.firstName?.trim() || invitation.firstName;
    const lastName  = params.lastName?.trim()  || invitation.lastName;

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          email:          invitation.email,
          passwordHash,
          firstName,
          lastName,
          displayName:    `${firstName} ${lastName}`.trim(),
          status:         'ACTIVE',
          emailVerified:  true,
        },
      });

      if (invitation.roleIds.length > 0) {
        await tx.userRole.createMany({
          data: invitation.roleIds.map((roleId) => ({
            userId:         created.id,
            roleId,
            organizationId: invitation.organizationId,
            grantedBy:      invitation.invitedById ?? undefined,
          })),
        });
      }

      await tx.userInvitation.update({
        where: { id: invitation.id },
        data:  { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return created;
    });

    return this.login(user, params.ipAddress, params.userAgent);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private issueAccessToken(user: User, roles: string[], permissions: string[]): string {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.organizationId,
      email: user.email,
      roles,
      permissions,
      jti: randomUUID(),
    };

    return this.jwtService.sign(payload, {
      secret: this.config.get('JWT_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
    });
  }

  private async issueRefreshToken(
    userId: string,
    family: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ raw: string; hash: string }> {
    const raw = randomBytes(32).toString('hex'); // 256-bit opaque token
    const hash = this.hashToken(raw);

    const expiresInMs = this.parseExpiresIn(
      this.config.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    );

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hash,
        userId,
        family,
        expiresAt: new Date(Date.now() + expiresInMs),
        ipAddress,
        userAgent,
      },
    });

    return { raw, hash };
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const attempts = user.failedLoginAttempts + 1;
    const shouldLock = attempts >= MAX_FAILED_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000)
          : undefined,
      },
    });

    if (shouldLock) {
      this.logger.warn({ msg: 'Account locked after failed attempts', userId: user.id });
    }
  }

  private async resolvePermissions(
    userId: string,
    organizationId: string,
  ): Promise<{ permissions: string[]; roleNames: string[] }> {
    const userRoles = await this.prisma.userRole.findMany({
      where: {
        userId,
        organizationId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);
    const allPermissions = userRoles.flatMap((ur) => ur.role.permissions);
    const permissions = [...new Set(allPermissions)]; // deduplicate

    return { permissions, roleNames };
  }

  private async buildUserProfile(
    user: User & { organization?: { name: string; slug: string } | null },
    roles: string[],
    permissions: string[],
  ): Promise<UserProfile> {
    let org = user.organization;

    if (!org) {
      const fetched = await this.prisma.organization.findUnique({
        where: { id: user.organizationId },
      });
      org = fetched;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      organizationId: user.organizationId,
      organizationName: org?.name ?? '',
      organizationSlug: org?.slug ?? '',
      roles,
      permissions,
    };
  }

  /** Converts strings like '15m', '7d', '1h' to milliseconds. */
  private parseExpiresIn(value: string): number {
    const unit = value.slice(-1);
    const amount = parseInt(value.slice(0, -1), 10);
    switch (unit) {
      case 's': return amount * 1_000;
      case 'm': return amount * 60 * 1_000;
      case 'h': return amount * 60 * 60 * 1_000;
      case 'd': return amount * 24 * 60 * 60 * 1_000;
      default: return parseInt(value, 10) * 1_000;
    }
  }
}
