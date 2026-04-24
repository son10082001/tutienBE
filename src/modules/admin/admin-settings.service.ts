import { prisma } from "../../lib/prisma.js";
import {
  AdminRole,
  ADMIN_PERMISSIONS,
  getDefaultPermissionsByRole,
  getOrCreateAdminAccess,
  listRolePermissions,
  resolveRolePermissions,
  upsertRolePermissions,
} from "./admin-access.service.js";
import type {
  CreateAdminAccountInput,
  CreateGameServerInput,
  UpdateAdminAccountInput,
  UpdatePaymentMethodConfigInput,
} from "./admin-settings.schema.js";

function normalizeText(v?: string | null): string | null {
  const x = v?.trim() ?? "";
  return x.length > 0 ? x : null;
}

const FIXED_PAYMENT_CODES = ["vietqr", "momo"] as const;
/** SePay QR: https://qr.sepay.vn — `bank` = mã ngân hàng (VD: BIDV, VCB), `des` = nội dung CK (mã NT). */
const HARDCODED_VIETQR_TEMPLATE =
  "https://qr.sepay.vn/img?acc={accountNumber}&bank={bankCode}&amount={amount}&des={note}&template=compact&download=0";
const HARDCODED_MOMO_TEMPLATE =
  "https://momosv3.apimienphi.com/api/QRCode?phone={phoneNumber}&amount={amount}&note={note}";

function toPaymentName(code: string): string {
  return code === "momo" ? "MoMo" : "VietQR";
}

function toPaymentChannel(code: string): "bank_transfer" | "ewallet" {
  return code === "momo" ? "ewallet" : "bank_transfer";
}

async function ensureFixedPaymentMethods() {
  for (const code of FIXED_PAYMENT_CODES) {
    await prisma.paymentMethodSetting.upsert({
      where: { code },
      update: code === "vietqr" ? { qrTemplate: HARDCODED_VIETQR_TEMPLATE } : {},
      create: {
        code,
        name: toPaymentName(code),
        channel: toPaymentChannel(code),
        isActive: true,
        accountNumber: null,
        qrTemplate: code === "vietqr" ? HARDCODED_VIETQR_TEMPLATE : HARDCODED_MOMO_TEMPLATE,
        banks: code === "vietqr" ? [{ code: "vcb", name: "Vietcombank", accountName: null, accountNumber: null }] : [],
      },
    });
  }
}

export async function listAdminSettingsService() {
  const rolePermissions = await listRolePermissions();
  await ensureFixedPaymentMethods();
  const [paymentMethods, configServers] = await Promise.all([
    prisma.paymentMethodSetting.findMany({
      where: { code: { in: [...FIXED_PAYMENT_CODES] } },
      orderBy: { code: "asc" },
    }),
    prisma.configserver.findMany({
      where: { state: { not: 1 } },
      orderBy: { id: "asc" },
      select: { id: true, name: true, ip: true, host: true, desc: true },
    }),
  ]);

  return {
    rolePermissions,
    paymentMethods,
    gameServers: configServers.map((s) => ({
      id: String(s.id),
      code: String(s.id),
      name: s.name,
      host: s.ip || s.host || null,
      desc: s.desc || "",
      state: 1,
    })),
    allPermissions: ADMIN_PERMISSIONS,
  };
}

export async function ensureAdminAccessForUserService(userId: string) {
  return getOrCreateAdminAccess(userId);
}

export async function listAdminAccountsService() {
  const rows = await prisma.adminAccess.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  const users = await prisma.user.findMany({
    where: { userId: { in: rows.map((r) => r.userId) } },
    select: { userId: true, name: true, createTime: true },
  });
  const userMap = new Map(users.map((u) => [u.userId, u]));

  return Promise.all(
    rows.map(async (row) => {
      const role = (row.role as AdminRole) || "OPERATOR";
      const perms = await resolveRolePermissions(role, row.permissions);
      const user = userMap.get(row.userId);
      return {
        userId: row.userId,
        name: user?.name ?? row.userId,
        role,
        permissions: perms,
        createdAt: user?.createTime ?? row.createdAt,
      };
    }),
  );
}

export async function createAdminAccountService(actorUserId: string, input: CreateAdminAccountInput) {
  const userId = input.userId.trim();
  const exists = await prisma.user.findUnique({ where: { userId }, select: { userId: true } });
  if (exists) {
    throw new Error("Tài khoản đã tồn tại");
  }
  await prisma.$executeRaw`
    INSERT INTO user (userId, password, name, type, serverId, lastLoginServerId)
    VALUES (${userId}, ${input.password}, ${input.name.trim()}, 1, 0, 0)
  `;

  const existing = await prisma.adminAccess.findUnique({ where: { userId } });
  if (existing) {
    throw new Error("Admin này đã có cấu hình quyền");
  }

  const permissions = await resolveRolePermissions(input.role, getDefaultPermissionsByRole(input.role));
  return prisma.adminAccess.create({
    data: {
      userId,
      role: input.role,
      permissions,
      createdBy: actorUserId,
      isActive: true,
    },
  });
}

export async function updateAdminAccountService(targetUserId: string, input: UpdateAdminAccountInput) {
  const existing = await prisma.adminAccess.findUnique({ where: { userId: targetUserId } });
  if (!existing) {
    throw new Error("Không tìm thấy cấu hình admin");
  }
  if (existing.role === "SUPERADMIN" && input.role && input.role !== "SUPERADMIN") {
    throw new Error("Không thể thay đổi role của superadmin");
  }

  if (input.name !== undefined || input.password !== undefined) {
    await prisma.user.update({
      where: { userId: targetUserId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.password !== undefined ? { password: input.password } : {}),
      },
    });
  }

  if (input.role !== undefined && input.role !== existing.role) {
    const nextPermissions = await resolveRolePermissions(input.role, getDefaultPermissionsByRole(input.role));
    await prisma.adminAccess.update({
      where: { userId: targetUserId },
      data: { role: input.role, permissions: nextPermissions },
    });
  }
}

export async function deleteAdminAccountService(actorUserId: string, targetUserId: string) {
  if (actorUserId === targetUserId) {
    throw new Error("Không thể tự xoá tài khoản superadmin đang đăng nhập");
  }
  const access = await prisma.adminAccess.findUnique({ where: { userId: targetUserId } });
  if (!access) throw new Error("Không tìm thấy admin");
  if (access.role === "SUPERADMIN") throw new Error("Không thể xoá superadmin");

  await prisma.$transaction([
    prisma.adminAccess.delete({ where: { userId: targetUserId } }),
    prisma.portalAccessSession.deleteMany({ where: { userId: targetUserId } }),
    prisma.user.delete({ where: { userId: targetUserId } }),
  ]);
}

export async function listDepositOptionsService() {
  await ensureFixedPaymentMethods();
  const [servers, methods] = await Promise.all([
    prisma.configserver.findMany({
      where: { state: { not: 1 } },
      orderBy: { id: "asc" },
      select: { id: true, name: true, ip: true, host: true },
    }),
    prisma.paymentMethodSetting.findMany({
      where: { code: { in: [...FIXED_PAYMENT_CODES] }, isActive: true },
      orderBy: { code: "asc" },
    }),
  ]);
  return {
    servers: servers.map((s) => ({
      id: String(s.id),
      code: String(s.id),
      name: s.name,
      host: s.ip || s.host || null,
      isActive: true,
    })),
    methods,
  };
}

export async function updateRolePermissionsService(
  actorUserId: string,
  role: Exclude<AdminRole, "SUPERADMIN">,
  permissions: string[],
) {
  return upsertRolePermissions(actorUserId, role, permissions);
}

export async function createGameServerService(input: CreateGameServerInput) {
  const maxRow = await prisma.configserver.findFirst({
    orderBy: { id: "desc" },
    select: { id: true },
  });
  const nextId = (maxRow?.id ?? 0) + 1;
  const host = normalizeText(input.host) ?? "127.0.0.1";
  return prisma.configserver.create({
    data: {
      id: nextId,
      name: input.name.trim(),
      mergeId: -1,
      status: 3,
      desc: input.code.trim(),
      isSsl: 0,
      host: host.slice(0, 24),
      redis: 6379,
      debug: 5555,
      pay: 8011,
      admin: 13011,
      websocket: 8889,
      watchdog: 8889,
      deployId: 1,
      state: 0,
      gameDir: "auto",
      inst: "1",
      dbname: "game",
      type: "release",
      regCount: 0,
      openTime: new Date(),
      platform: "1010",
      ip: host,
    },
  });
}

export async function deleteGameServerService(id: string) {
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) throw new Error("ID server không hợp lệ");
  await prisma.configserver.delete({ where: { id: idNum } });
}

export async function updateFixedPaymentMethodService(code: "vietqr" | "momo", input: UpdatePaymentMethodConfigInput) {
  await ensureFixedPaymentMethods();
  const normalizedAccountName = normalizeText(input.accountName);
  const normalizedBankName = normalizeText(input.bankName);
  const normalizedBankCode = normalizeText(input.bankCode);
  const normalizedBankNumber = normalizeText(input.bankNumber);
  const normalizedPhone = normalizeText(input.phoneNumber);

  return prisma.paymentMethodSetting.update({
    where: { code },
    data: {
      ...(input.accountName !== undefined ? { accountName: normalizedAccountName } : {}),
      ...(input.phoneNumber !== undefined ? { phoneNumber: normalizedPhone } : {}),
      ...(code === "vietqr"
        ? { accountNumber: normalizedBankNumber, qrTemplate: HARDCODED_VIETQR_TEMPLATE }
        : { qrTemplate: HARDCODED_MOMO_TEMPLATE }),
      ...((input.bankName !== undefined || input.bankCode !== undefined || input.bankNumber !== undefined || input.accountName !== undefined) &&
      code === "vietqr"
        ? {
            // Enforce only one configured bank record.
            banks: [
              {
                code: normalizedBankCode ?? "vcb",
                name: normalizedBankName ?? "Ngân hàng mặc định",
                accountName: normalizedAccountName,
                accountNumber: normalizedBankNumber,
              },
            ],
          }
        : {}),
    },
  });
}
