import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesRepository {
  constructor(private readonly db: PrismaService) {}

  async findAll(orgId: string) {
    const [systemRoles, customRoles] = await this.db.$transaction([
      this.db.role.findMany({
        where: { isSystem: true, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
      this.db.role.findMany({
        where: { organizationId: orgId, isSystem: false, deletedAt: null },
        orderBy: { name: 'asc' },
      }),
    ]);
    return [...systemRoles, ...customRoles];
  }

  async findById(orgId: string, roleId: string) {
    return this.db.role.findFirst({
      where: {
        id: roleId,
        deletedAt: null,
        OR: [
          { isSystem: true },
          { organizationId: orgId, isSystem: false },
        ],
      },
    });
  }

  async create(orgId: string, data: CreateRoleDto) {
    return this.db.role.create({
      data: {
        organizationId: orgId,
        isSystem:       false,
        name:           data.name,
        displayName:    data.displayName,
        description:    data.description,
        permissions:    data.permissions,
      },
    });
  }

  async update(_orgId: string, roleId: string, data: UpdateRoleDto) {
    return this.db.role.update({
      where: { id: roleId },
      data: {
        ...(data.name        !== undefined && { name: data.name }),
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.permissions !== undefined && { permissions: data.permissions }),
      },
    });
  }

  async delete(_orgId: string, roleId: string) {
    return this.db.role.update({
      where: { id: roleId },
      data: { deletedAt: new Date() },
    });
  }

  async getUsage(roleId: string) {
    return this.db.userRole.count({ where: { roleId } });
  }
}
