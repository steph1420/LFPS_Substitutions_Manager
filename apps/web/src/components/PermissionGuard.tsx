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

export function usePermissions(): Permissions {
  const { operatingRole, loggedInTeacher } = useTimetableStore();

  const isAdmin = operatingRole === 'ADMIN';
  const isTeacher = operatingRole === 'TEACHER';
  const isGuest = operatingRole === 'GUEST';

  return {
    role: operatingRole,
    isAdmin,
    isTeacher,
    isGuest,
    canEditSchedule: isAdmin,
    canAssignSubs: isAdmin,
    canManageAttendance: isAdmin,
    canAppointOfficiating: isAdmin,
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

