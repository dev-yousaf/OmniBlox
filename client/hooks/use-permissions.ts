import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";

const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  OBSERVER: "OBSERVER",
} as const;

type Role = (typeof ROLES)[keyof typeof ROLES];

const CREATE_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const EDIT_ROLES: Role[] = ["OWNER", "ADMIN", "MANAGER"];
const DELETE_ROLES: Role[] = ["OWNER", "ADMIN"];

export function usePermissions() {
  const { user } = useAuth();
  const role = (user?.role as Role) || ROLES.OBSERVER;

  return useMemo(
    () => ({
      role,
      isOwner: role === ROLES.OWNER,
      isAdmin: role === ROLES.ADMIN,
      isManager: role === ROLES.MANAGER,
      isObserver: role === ROLES.OBSERVER,
      canCreate: CREATE_ROLES.includes(role),
      canEdit: EDIT_ROLES.includes(role),
      canDelete: DELETE_ROLES.includes(role),
      isReadOnly: role === ROLES.OBSERVER,
      isManagement: role === ROLES.OWNER || role === ROLES.ADMIN || role === ROLES.MANAGER,
    }),
    [role],
  );
}
