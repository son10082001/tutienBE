import { prisma } from "../../lib/prisma.js";

export const ADMIN_ROLES = ["SUPERADMIN", "OPERATOR", "ADVERTISER"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PERMISSIONS = [
  "dashboard.view",
  "reports.view",
  "users.view",
  "users.delete",
  "deposits.view",
  "deposits.approve",
  "deposits.edit",
  "promotions.manage",
  "shop.manage",
  "giftcode.manage",
  "news.manage",
  "settings.manage",
  "admins.manage",
  "game_servers.manage",
  "payments.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

const PERMISSION_SET = new Set<string>(ADMIN_PERMISSIONS);

const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPERADMIN: [...ADMIN_PERMISSIONS],
  OPERATOR: [
    "dashboard.view",
    "reports.view",
    "users.view",
    "deposits.view",
    "deposits.approve",
    "deposits.edit",
    "promotions.manage",
    "shop.manage",
    "giftcode.manage",
    "news.manage",
  ],
  ADVERTISER: ["dashboard.view", "reports.view"],
};

function isValidAdminRole(role: string): role is AdminRole {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

function normalizePermissions(input: unknown, fallback: AdminPermission[]): AdminPermission[] {
  if (!Array.isArray(input)) return fallback;
  const set = new Set<AdminPermission>();
  for (const item of input) {
    if (typeof item !== "string") continue;
    if (PERMISSION_SET.has(item)) {
      set.add(item as AdminPermission);
    }
  }
  if (set.size === 0) return fallback;
  return Array.from(set);
}

export async function getOrCreateAdminAccess(userId: string): Promise<{
  role: AdminRole;
  permissions: AdminPermission[];
  isSuperAdmin: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { userId: true, type: true },
  });
  if (!user || user.type !== 1) {
    throw new Error("Tài khoản không phải quản trị viên");
  }

  const existing = await prisma.adminAccess.findUnique({ where: { userId } });

  if (!existing) {
    const hasAnyAdmin = (await prisma.adminAccess.count()) > 0;
    const role: AdminRole = hasAnyAdmin ? "OPERATOR" : "SUPERADMIN";
    const created = await prisma.adminAccess.create({
      data: {
        userId,
        role,
        permissions: ROLE_DEFAULT_PERMISSIONS[role],
        createdBy: userId,
      },
    });
    const permissions = normalizePermissions(created.permissions, ROLE_DEFAULT_PERMISSIONS[role]);
    return { role, permissions, isSuperAdmin: role === "SUPERADMIN" };
  }

  const role = isValidAdminRole(existing.role) ? existing.role : "OPERATOR";
  const permissions = await resolveRolePermissions(role, existing.permissions);

  if (role === "SUPERADMIN") {
    return { role, permissions, isSuperAdmin: true };
  }

  return { role, permissions, isSuperAdmin: false };
}

export function hasPermission(permissions: string[], expected: AdminPermission): boolean {
  return permissions.includes(expected);
}

export function getDefaultPermissionsByRole(role: AdminRole): AdminPermission[] {
  return [...ROLE_DEFAULT_PERMISSIONS[role]];
}

export function sanitizePermissionList(list: string[]): AdminPermission[] {
  return normalizePermissions(list, []);
}

export async function resolveRolePermissions(role: AdminRole, _userLevelPermissions?: unknown): Promise<AdminPermission[]> {
  if (role === "SUPERADMIN") {
    return [...ADMIN_PERMISSIONS];
  }
  const roleRow = await prisma.adminRolePermission.findUnique({ where: { role } });
  return normalizePermissions(roleRow?.permissions, ROLE_DEFAULT_PERMISSIONS[role]);
}

export async function listRolePermissions(): Promise<Record<Exclude<AdminRole, "SUPERADMIN">, AdminPermission[]>> {
  const roles: Exclude<AdminRole, "SUPERADMIN">[] = ["OPERATOR", "ADVERTISER"];
  const result = {} as Record<Exclude<AdminRole, "SUPERADMIN">, AdminPermission[]>;
  for (const role of roles) {
    const row = await prisma.adminRolePermission.findUnique({ where: { role } });
    result[role] = normalizePermissions(row?.permissions, ROLE_DEFAULT_PERMISSIONS[role]);
  }
  return result;
}

export async function upsertRolePermissions(
  actorUserId: string,
  role: Exclude<AdminRole, "SUPERADMIN">,
  permissions: string[],
): Promise<AdminPermission[]> {
  const normalized = sanitizePermissionList(permissions);
  if (normalized.length === 0) {
    throw new Error("Danh sách quyền không hợp lệ");
  }
  await prisma.adminRolePermission.upsert({
    where: { role },
    update: { permissions: normalized, updatedBy: actorUserId },
    create: { role, permissions: normalized, updatedBy: actorUserId },
  });
  return normalized;
}
