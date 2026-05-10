import { Injectable } from '@nestjs/common';
import { SkillCategory } from '@repo/database';

import { PrismaService } from '../../database';

const DEFAULT_CATEGORY = SkillCategory.OTHER;

/**
 * Manages the global skills catalogue.
 *
 * Skills are NOT org-scoped. "React" is one Skill row shared across all tenants.
 * Dedup: `name` is stored lowercase-normalized. `displayName` preserves casing.
 *
 * The primary operation is getOrCreate — callers never need to check for
 * existence themselves.
 */
@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns matching skills for autocomplete. Case-insensitive prefix search. */
  async search(query: string, limit = 20) {
    return this.prisma.skill.findMany({
      where: {
        OR: [
          { name: { contains: query.toLowerCase(), mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: limit,
    });
  }

  /** Returns all skills in a category (for taxonomy browsing). */
  async listByCategory(category?: SkillCategory) {
    return this.prisma.skill.findMany({
      where: category ? { category } : undefined,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get-or-create pattern. Normalizes name to lowercase before lookup/insert.
   * `displayName` defaults to the original casing passed by the caller.
   */
  async getOrCreate(
    displayName: string,
    category: SkillCategory = DEFAULT_CATEGORY,
    sourceOrganizationId?: string,
  ) {
    const normalized = displayName.trim().toLowerCase();

    return this.prisma.skill.upsert({
      where: { name: normalized },
      update: {},
      create: {
        name: normalized,
        displayName: displayName.trim(),
        category,
        sourceOrganizationId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.skill.findUnique({ where: { id } });
  }
}
