'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getOrganization,
  getOrganizationSettings,
  updateOrganizationProfile,
  updateOrganizationSettings,
} from '@/lib/api/organization';
import type { UpdateOrgProfileDto, UpdateOrgSettingsDto } from '@/types/settings';

// ── Query key factory ──────────────────────────────────────────────────────────

export const organizationKeys = {
  all:      ['organization']              as const,
  profile:  ()                            => [...organizationKeys.all, 'profile']   as const,
  settings: ()                            => [...organizationKeys.all, 'settings']  as const,
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useOrganization() {
  return useQuery({
    queryKey: organizationKeys.profile(),
    queryFn:  () => getOrganization(),
  });
}

export function useOrganizationSettings() {
  return useQuery({
    queryKey: organizationKeys.settings(),
    queryFn:  () => getOrganizationSettings(),
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

export function useUpdateOrgProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateOrgProfileDto) => updateOrganizationProfile(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.profile() });
    },
  });
}

export function useUpdateOrgSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateOrgSettingsDto) => updateOrganizationSettings(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.settings() });
    },
  });
}
