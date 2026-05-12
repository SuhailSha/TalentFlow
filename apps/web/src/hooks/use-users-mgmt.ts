'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  activateUser,
  assignUserRoles,
  deactivateUser,
  getUser,
  inviteUser,
  listInvitations,
  listUsers,
  resendInvitation,
  revokeInvitation,
} from '@/lib/api/users-mgmt';
import type { AssignRolesDto, InviteUserDto, ListUsersParams } from '@/types/settings';

// ── Query key factory ──────────────────────────────────────────────────────────

export const userMgmtKeys = {
  all:         ['users-mgmt']              as const,
  lists:       ()                          => [...userMgmtKeys.all, 'list']           as const,
  list:        (p: ListUsersParams)        => [...userMgmtKeys.lists(), p]            as const,
  details:     ()                          => [...userMgmtKeys.all, 'detail']         as const,
  detail:      (id: string)               => [...userMgmtKeys.details(), id]          as const,
  invitations: ()                          => [...userMgmtKeys.all, 'invitations']    as const,
};

// ── Query hooks ────────────────────────────────────────────────────────────────

export function useUsers(params: ListUsersParams = {}) {
  return useQuery({
    queryKey: userMgmtKeys.list(params),
    queryFn:  () => listUsers(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userMgmtKeys.detail(id),
    queryFn:  () => getUser(id),
    enabled:  !!id,
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: userMgmtKeys.invitations(),
    queryFn:  () => listInvitations(),
  });
}

// ── Mutation hooks ─────────────────────────────────────────────────────────────

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: InviteUserDto) => inviteUser(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.invitations() });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.invitations() });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resendInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.invitations() });
    },
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => activateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.lists() });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.lists() });
    },
  });
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: AssignRolesDto }) => assignUserRoles(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userMgmtKeys.lists() });
    },
  });
}
