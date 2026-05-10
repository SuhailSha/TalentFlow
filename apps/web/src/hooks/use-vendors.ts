'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import {
  addVendorContact,
  addVendorNote,
  createVendor,
  deleteVendor,
  getVendor,
  getVendorNotes,
  listVendors,
  removeVendorContact,
  transitionVendorStatus,
  updateVendor,
  updateVendorContact,
} from '@/lib/api/vendors';
import type {
  CreateVendorContactDto,
  CreateVendorDto,
  CreateVendorNoteDto,
  ListVendorsParams,
  UpdateVendorContactDto,
  UpdateVendorDto,
  VendorStatus,
} from '@/types/vendors';

// ── Query key factory ──────────────────────────────────────────────────────────

export const vendorKeys = {
  all:     ['vendors']          as const,
  lists:   ()                   => [...vendorKeys.all, 'list']         as const,
  list:    (p: ListVendorsParams) => [...vendorKeys.lists(), p]        as const,
  details: ()                   => [...vendorKeys.all, 'detail']       as const,
  detail:  (id: string)         => [...vendorKeys.details(), id]       as const,
  notes:   (id: string)         => [...vendorKeys.detail(id), 'notes'] as const,
};

// ── Query hooks ───────────────────────────────────────────────────────────────

export function useVendors(params: ListVendorsParams = {}) {
  return useQuery({
    queryKey: vendorKeys.list(params),
    queryFn:  () => listVendors(params),
  });
}

export function useVendor(id: string) {
  return useQuery({
    queryKey: vendorKeys.detail(id),
    queryFn:  () => getVendor(id),
    enabled:  !!id,
  });
}

export function useVendorNotes(vendorId: string) {
  return useQuery({
    queryKey: vendorKeys.notes(vendorId),
    queryFn:  () => getVendorNotes(vendorId),
    enabled:  !!vendorId,
  });
}

// ── Mutation hooks ────────────────────────────────────────────────────────────

export function useCreateVendor() {
  const router       = useRouter();
  const queryClient  = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateVendorDto) => createVendor(dto),
    onSuccess: ({ vendor }) => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      router.push(`/vendors/${vendor.id}`);
    },
  });
}

export function useUpdateVendor(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateVendorDto) => updateVendor(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

export function useDeleteVendor() {
  const router      = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
      router.push('/vendors');
    },
  });
}

export function useTransitionVendorStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: VendorStatus) => transitionVendorStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.lists() });
    },
  });
}

export function useAddVendorContact(vendorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateVendorContactDto) => addVendorContact(vendorId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
    },
  });
}

export function useUpdateVendorContact(vendorId: string, contactId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: UpdateVendorContactDto) =>
      updateVendorContact(vendorId, contactId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
    },
  });
}

export function useRemoveVendorContact(vendorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contactId: string) => removeVendorContact(vendorId, contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
    },
  });
}

export function useAddVendorNote(vendorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateVendorNoteDto) => addVendorNote(vendorId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: vendorKeys.detail(vendorId) });
      queryClient.invalidateQueries({ queryKey: vendorKeys.notes(vendorId) });
    },
  });
}
