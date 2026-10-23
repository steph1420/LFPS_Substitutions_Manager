import {
  adminOfficeFor,
  schoolDayForDate,
  type AbsenceRecord,
  type AdminOffice,
  type DayOfWeek,
  type StaffDirectory,
  type UserRole,
} from '@lfps/core';

/**
 * Central permission helper (Bundle 34a). Every admin-gated action (store guards) and
 * screen (usePermissions / PermissionGuard) goes through resolveAccess(); nothing else
 * decides who may edit. Client-side only — see docs/ADMIN_ACCESS.md and TODO SEC-02.
 */

/**
 * Dev Options → "Edit without login". Device-local (localStorage), never part of the
 * synced operational state, so it can't spread to other devices.
 */
export const EDITING_OVERRIDE_KEY = 'lfps_dev_editing_unlocked_v1';

function localStore(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readEditingOverride(): boolean {
  try {
    return localStore()?.getItem(EDITING_OVERRIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeEditingOverride(on: boolean): void {
  try {
    if (on) localStore()?.setItem(EDITING_OVERRIDE_KEY, '1');
    else localStore()?.removeItem(EDITING_OVERRIDE_KEY);
  } catch {
    // Storage unavailable: the override lasts for this page only.
  }
}

export interface AccessInputs {
  /** Identity that entered the admin passcode in this tab (null: no admin session). */
  adminIdentity: string | null;
  loggedInTeacher: string | null;
  directory: StaffDirectory;
  absences: AbsenceRecord[];
  officiatingAC: Partial<Record<DayOfWeek, string | null>>;
  editingOverride: boolean;
}

export interface Access {
  role: UserRole;
  /** Signed in as an admin office holder with the passcode. */
  isAdmin: boolean;
  office: AdminOffice | null;
  /** May use admin-gated actions: admin session, or this device's dev override. */
  canEdit: boolean;
  /** canEdit only because of the dev override (drives the "Editing unlocked" badge). */
  editingUnlocked: boolean;
}

/** Which admin office `identity` holds today (school time zone); null = identification only. */
export function adminOfficeToday(
  identity: string | null,
  inputs: Pick<AccessInputs, 'directory' | 'absences' | 'officiatingAC'>,
  now: Date = new Date()
): AdminOffice | null {
  return adminOfficeFor({
    identity,
    directory: inputs.directory,
    day: schoolDayForDate(now),
    absences: inputs.absences,
    officiatingACMap: inputs.officiatingAC,
  });
}

export function resolveAccess(inputs: AccessInputs, now: Date = new Date()): Access {
  // The admin session counts only for the identity that is logged in, and only while that
  // identity still holds an office today (an Off. AC loses it when the day or appointment ends).
  const office =
    inputs.adminIdentity && inputs.adminIdentity === inputs.loggedInTeacher
      ? adminOfficeToday(inputs.adminIdentity, inputs, now)
      : null;
  const isAdmin = office !== null;
  return {
    role: isAdmin ? 'ADMIN' : inputs.loggedInTeacher ? 'TEACHER' : 'GUEST',
    isAdmin,
    office,
    canEdit: isAdmin || inputs.editingOverride,
    editingUnlocked: !isAdmin && inputs.editingOverride,
  };
}

export function sameAccess(a: Access, b: Access): boolean {
  return (
    a.role === b.role &&
    a.isAdmin === b.isAdmin &&
    a.office === b.office &&
    a.canEdit === b.canEdit &&
    a.editingUnlocked === b.editingUnlocked
  );
}
