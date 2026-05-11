import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../database';
import type { RequestUser } from '../../auth/types/request-user.interface';

export type SearchResultType = 'candidate' | 'job' | 'vendor' | 'submission';

export interface SearchResult {
  type:     SearchResultType;
  id:       string;
  title:    string;
  subtitle: string | null;
  status:   string | null;
  href:     string;
}

@Injectable()
export class SearchService {
  constructor(private readonly db: PrismaService) {}

  /**
   * Unified case-insensitive substring search across the main entity types.
   * Each type is capped at `perTypeLimit` results.
   * Empty query returns empty list — caller can short-circuit.
   */
  async search(user: RequestUser, q: string, perTypeLimit = 5): Promise<SearchResult[]> {
    const query = q.trim();
    if (query.length === 0) return [];

    const orgId = user.organizationId;
    const contains = { contains: query, mode: 'insensitive' as const };

    const [candidates, jobs, vendors] = await Promise.all([
      this.db.candidate.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          OR: [
            { firstName: contains },
            { lastName:  contains },
            { email:     contains },
            { currentTitle:   contains },
            { currentCompany: contains },
          ],
        },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          currentTitle: true, status: true,
        },
        take: perTypeLimit,
      }),
      this.db.jobDescription.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          OR: [
            { title:      contains },
            { reqId:      contains },
            { department: contains },
          ],
        },
        select: {
          id: true, title: true, reqId: true, department: true, status: true,
        },
        take: perTypeLimit,
      }),
      this.db.vendor.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          OR: [
            { companyName: contains },
            { vendorCode:  contains },
          ],
        },
        select: {
          id: true, companyName: true, vendorCode: true, status: true,
        },
        take: perTypeLimit,
      }),
    ]);

    const results: SearchResult[] = [
      ...candidates.map<SearchResult>((c) => ({
        type:     'candidate',
        id:       c.id,
        title:    `${c.firstName} ${c.lastName}`,
        subtitle: c.currentTitle ?? c.email,
        status:   c.status,
        href:     `/candidates/${c.id}`,
      })),
      ...jobs.map<SearchResult>((j) => ({
        type:     'job',
        id:       j.id,
        title:    j.title,
        subtitle: `${j.reqId}${j.department ? ` · ${j.department}` : ''}`,
        status:   j.status,
        href:     `/jobs/${j.id}`,
      })),
      ...vendors.map<SearchResult>((v) => ({
        type:     'vendor',
        id:       v.id,
        title:    v.companyName,
        subtitle: v.vendorCode,
        status:   v.status,
        href:     `/vendors/${v.id}`,
      })),
    ];

    return results;
  }
}
