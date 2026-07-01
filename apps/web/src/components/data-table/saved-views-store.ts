'use client';

import type { SavedView } from './types';

/**
 * localStorage-backed saved views (Phase 2). Phase 5 migrates to a
 * server-backed store; this module's public shape is stable so the
 * swap is a single-file change.
 *
 * Namespace = a per-list key like 'candidates' so different tables
 * don't collide.
 */

const KEY = (namespace: string) => `tf.saved-views.${namespace}`;

export function loadViews(namespace: string): SavedView[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY(namespace));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function saveViews(namespace: string, views: SavedView[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY(namespace), JSON.stringify(views));
  } catch { /* quota / private-browsing */ }
}

export function addView(namespace: string, view: SavedView): SavedView[] {
  const next = [...loadViews(namespace), view];
  saveViews(namespace, next);
  return next;
}

export function removeView(namespace: string, id: string): SavedView[] {
  const next = loadViews(namespace).filter((v) => v.id !== id);
  saveViews(namespace, next);
  return next;
}
