import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { UpdateOrgProfileDto } from './dto/update-org-profile.dto';
import type { UpdateOrgSettingsDto } from './dto/update-org-settings.dto';

@Injectable()
export class OrganizationRepository {
  constructor(private readonly db: PrismaService) {}

  async findById(id: string) {
    return this.db.organization.findUnique({
      where: { id },
      include: {
        organizationSettings: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        usageRecords: true,
      },
    });
  }

  async updateProfile(id: string, data: UpdateOrgProfileDto) {
    return this.db.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.domain !== undefined && { domain: data.domain }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
      },
    });
  }

  async findOrCreateSettings(orgId: string) {
    const existing = await this.db.organizationSettings.findUnique({
      where: { organizationId: orgId },
    });
    if (existing) return existing;
    return this.db.organizationSettings.create({
      data: { organizationId: orgId, workingDays: [1, 2, 3, 4, 5] },
    });
  }

  async updateSettings(orgId: string, data: UpdateOrgSettingsDto) {
    await this.findOrCreateSettings(orgId);
    return this.db.organizationSettings.update({
      where: { organizationId: orgId },
      data: {
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.dateFormat !== undefined && { dateFormat: data.dateFormat }),
        ...(data.timeFormat !== undefined && { timeFormat: data.timeFormat }),
        ...(data.workingDays !== undefined && { workingDays: data.workingDays }),
        ...(data.primaryColor !== undefined && { primaryColor: data.primaryColor }),
        ...(data.accentColor !== undefined && { accentColor: data.accentColor }),
        ...(data.submissionStaleDays !== undefined && { submissionStaleDays: data.submissionStaleDays }),
        ...(data.workflowStaleDays !== undefined && { workflowStaleDays: data.workflowStaleDays }),
        ...(data.requireInterviewFeedback !== undefined && { requireInterviewFeedback: data.requireInterviewFeedback }),
        ...(data.emailNotificationsEnabled !== undefined && { emailNotificationsEnabled: data.emailNotificationsEnabled }),
        ...(data.inAppNotificationsEnabled !== undefined && { inAppNotificationsEnabled: data.inAppNotificationsEnabled }),
      },
    });
  }

  async findBySlug(slug: string) {
    return this.db.organization.findUnique({ where: { slug } });
  }
}
