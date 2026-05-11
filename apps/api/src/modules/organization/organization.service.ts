import { BadRequestException, Injectable } from '@nestjs/common';
import type { RequestUser } from '../../auth/types/request-user.interface';
import { OrganizationRepository } from './organization.repository';
import type { UpdateOrgProfileDto } from './dto/update-org-profile.dto';
import type { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly repo: OrganizationRepository) {}

  async getProfile(user: RequestUser) {
    return this.repo.findById(user.organizationId);
  }

  async updateProfile(user: RequestUser, dto: UpdateOrgProfileDto) {
    if (dto.slug) {
      const existing = await this.repo.findBySlug(dto.slug);
      if (existing && existing.id !== user.organizationId) {
        throw new BadRequestException('Slug is already taken');
      }
    }
    return this.repo.updateProfile(user.organizationId, dto);
  }

  async getSettings(user: RequestUser) {
    return this.repo.findOrCreateSettings(user.organizationId);
  }

  async updateSettings(user: RequestUser, dto: UpdateOrgSettingsDto) {
    return this.repo.updateSettings(user.organizationId, dto);
  }
}
