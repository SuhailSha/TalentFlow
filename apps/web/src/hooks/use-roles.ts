'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRole,
  deleteRole,
  getRole,
  listRoles,
  updateRole,
} from '@/lib/api/roles';
import type { CreateRoleDto, UpdateRoleDto } from '@/types/settings';

// ── Query key factory ──────────────────────────────────────────────────────────

export const roleKeys = {
  all:     ['roles']          as const,
  lists:   ()                 => [...roleKeys.all, 'list']    as const,
  details: ()                 => [...roleKeys.all, 'detail']  as const,
  detail:  (id: string)       => [...roleKeys.details(), id]  as const,
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.lists(),
    queryFn:  () => listRoles(),
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn:  () => getRole(id),
    enabled:  !!id,
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateRoleDto) => createRole(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRoleDto }) => updateRole(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
    },
  });
}
