import { Injectable } from '@nestjs/common';
import { UserStatus } from '@repo/database';
import { PrismaService } from '../../database/prisma.service';
import type { ListUsersDto } from './dto/list-users.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: PrismaService) {}

  async findMany(orgId: string, dto: ListUsersDto) {
    const skip = ((dto.page ?? 1) - 1) * (dto.limit ?? 20);
    const where = {
      organizationId: orgId,
      deletedAt: null,
      ...(dto.status && { status: dto.status }),
      ...(dto.search && {
        OR: [
          { firstName: { contains: dto.search, mode: 'insensitive' as const } },
          { lastName:  { contains: dto.search, mode: 'insensitive' as const } },
          { email:     { contains: dto.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        include: {
          userRoles: {
            include: {
              role: { select: { id: true, name: true, displayName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: dto.limit ?? 20,
      }),
      this.db.user.count({ where }),
    ]);

    return { data, total };
  }

  async findById(orgId: string, userId: string) {
    return this.db.user.findFirst({
      where: { id: userId, organizationId: orgId, deletedAt: null },
      include: {
        userRoles: {
          include: {
            role: { select: { id: true, name: true, displayName: true } },
          },
        },
        recruiterProfile: true,
      },
    });
  }

  async updateStatus(_orgId: string, userId: string, status: UserStatus) {
    return this.db.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async assignRoles(orgId: string, userId: string, roleIds: string[]) {
    await this.db.userRole.deleteMany({ where: { userId, organizationId: orgId } });
    if (roleIds.length > 0) {
      await this.db.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId, organizationId: orgId })),
      });
    }
    return this.findById(orgId, userId);
  }
}
