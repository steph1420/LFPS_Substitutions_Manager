import React from 'react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { UserRole } from '@lfps/core';

export interface Permissions {
  role: UserRole;
  /** Signed in as an admin office holder (Principal, AC, AAC, today's Off. AC) with the passcode. */
  isAdmin: boolean;
  /** Admin-gated actions allowed: admin session, or this device's "Edit without login". */
  canEdit: boolean;
  /** Editing allowed only via the dev override (show the "Editing unlocked" badge). */
  editingUnlocked: boolean;
  isTeacher: boolean;
  isGuest: boolean;
  canEditSchedule: boolean;
  canAssignSubs: boolean;
  canManageAttendance: boolean;
  canAppointOfficiating: boolean;
  canConfigureSolver: boolean;
  canResetDay: boolean;
  canActOnSub: (substituteTeacher?: string) => boolean;
}

/**
 * Role model (SEC-01 interim, Bundle 34a hierarchy — client-side only, NOT real security;
 * see docs/ADMIN_ACCESS.md and TODO SEC-02):
 * - GUEST ("Front Desk", the default) and TEACHER run the day: absences, availability,
 *   assigning/removing substitutes, Auto-Resolve, Off. AC / Off. CT, Excel export.
 *   The front desk never hits a login wall.
 * - TEACHER additionally accepts/disputes their own duties.
 * - ADMIN = the Principal, AC, AAC or today's Off. AC, signed in at Staff Login with the
 *   passcode. Adds routine edits, Limbo restore/clear, Reset Day, Purge History,
 *   Auto-Resolve policy and Developer Options.
 * - Dev override ("Edit without login", this device only) grants the same admin-gated
 *   actions without a login.
 * All of it comes from store.access, which lib/access.ts resolveAccess() derives — the same
 * function the store's own guards use.
 */
export function usePermissions(): Permissions {
  const access = useTimetableStore((s) => s.access);
  const loggedInTeacher = useTimetableStore((s) => s.loggedInTeacher);
  const { role, isAdmin, canEdit, editingUnlocked } = access;

  return {
    role,
    isAdmin,
    canEdit,
    editingUnlocked,
    isTeacher: role === 'TEACHER',
    isGuest: role === 'GUEST',
    canEditSchedule: canEdit,
    canAssignSubs: true,
    canManageAttendance: true,
    canAppointOfficiating: true,
    canConfigureSolver: canEdit,
    canResetDay: canEdit,
    canActOnSub: (substituteTeacher?: string) => {
      if (canEdit) return true;
      if (!substituteTeacher || !loggedInTeacher) return false;
      return substituteTeacher === loggedInTeacher;
    },
  };
}

interface PermissionGuardProps {
  requiredRole?: UserRole | UserRole[];
  /** Admin-gated: passes for an admin session or the device's dev override (canEdit). */
  requireAdmin?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  requiredRole,
  requireAdmin,
  fallback = null,
  children,
}) => {
  const { role, canEdit } = usePermissions();

  if (requireAdmin && !canEdit) {
    return <>{fallback}</>;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(role)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

