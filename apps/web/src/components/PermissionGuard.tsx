import React from 'react';
import { useTimetableStore } from '../store/useTimetableStore.js';
import { UserRole } from '@lfps/core';

export interface Permissions {
  role: UserRole;
  isAdmin: boolean;
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
 * Role model (Bundle 34, SEC-01 interim — client-side only, NOT real security; see
 * docs/ADMIN_ACCESS.md and TODO SEC-02):
 * - GUEST ("Front Desk", the default) and TEACHER run the day: absences, availability,
 *   assigning/removing substitutes, Auto-Resolve, Off. AC / Off. CT, Excel export.
 *   The front desk never hits a login wall.
 * - TEACHER additionally accepts/disputes their own duties.
 * - ADMIN (passcode unlock) adds routine edits, Limbo restore/clear, Reset Day,
 *   Purge History, Auto-Resolve policy and Developer Options.
 */
export function usePermissions(): Permissions {
  const operatingRole = useTimetableStore((s) => s.operatingRole);
  const loggedInTeacher = useTimetableStore((s) => s.loggedInTeacher);

  const isAdmin = operatingRole === 'ADMIN';
  const isTeacher = operatingRole === 'TEACHER';
  const isGuest = operatingRole === 'GUEST';

  return {
    role: operatingRole,
    isAdmin,
    isTeacher,
    isGuest,
    canEditSchedule: isAdmin,
    canAssignSubs: true,
    canManageAttendance: true,
    canAppointOfficiating: true,
    canConfigureSolver: isAdmin,
    canResetDay: isAdmin,
    canActOnSub: (substituteTeacher?: string) => {
      if (isAdmin) return true;
      if (!substituteTeacher || !loggedInTeacher) return false;
      return substituteTeacher === loggedInTeacher;
    },
  };
}

interface PermissionGuardProps {
  requiredRole?: UserRole | UserRole[];
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
  const { role, isAdmin } = usePermissions();

  if (requireAdmin && !isAdmin) {
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

