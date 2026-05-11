import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { RolesRepository } from './roles.repository';
import type { CreateRoleDto } from './dto/create-role.dto';
import type { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  async list(user: RequestUser) {
    return this.repo.findAll(user.organizationId);
  }

  async findById(user: RequestUser, id: string) {
    const role = await this.repo.findById(user.organizationId, id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(user: RequestUser, dto: CreateRoleDto) {
    const all = await this.repo.findAll(user.organizationId);
    const nameConflict = all.find(
      (r) => r.organizationId === user.organizationId && r.name === dto.name,
    );
    if (nameConflict) {
      throw new BadRequestException('A role with this name already exists in the organization');
    }
    return this.repo.create(user.organizationId, dto);
  }

  async update(user: RequestUser, id: string, dto: UpdateRoleDto) {
    const role = await this.findById(user, id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be modified');
    }
    return this.repo.update(user.organizationId, id, dto);
  }

  async delete(user: RequestUser, id: string) {
    const role = await this.findById(user, id);
    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted');
    }
    const usage = await this.repo.getUsage(id);
    if (usage > 0) {
      throw new ConflictException('Role is assigned to users and cannot be deleted');
    }
    await this.repo.delete(user.organizationId, id);
  }
}
