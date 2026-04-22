import { prisma } from "../../lib/prisma.js";
import type {
  CreateSupportChannelInput,
  CreateSupportTicketInput,
  UpdateSupportChannelInput,
} from "./support.schema.js";

const DEFAULT_CHANNELS = [
  { code: "facebook", name: "Facebook", url: "https://facebook.com", icon: "fb", sortOrder: 1 },
  { code: "zalo", name: "Zalo", url: "https://zalo.me", icon: "zl", sortOrder: 2 },
] as const;

function normalizeText(v?: string | null): string | null {
  const x = v?.trim() ?? "";
  return x.length > 0 ? x : null;
}

export async function ensureSupportChannels() {
  for (const channel of DEFAULT_CHANNELS) {
    await prisma.supportChannel.upsert({
      where: { code: channel.code },
      update: {},
      create: {
        code: channel.code,
        name: channel.name,
        url: channel.url,
        icon: channel.icon,
        sortOrder: channel.sortOrder,
        isActive: true,
      },
    });
  }
}

export async function listSupportMetaService() {
  await ensureSupportChannels();
  const channels = await prisma.supportChannel.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return {
    channels,
    statusOptions: [
      { value: "open", label: "Đang mở" },
      { value: "processing", label: "Đang xử lý" },
      { value: "resolved", label: "Đã xử lý" },
      { value: "closed", label: "Đã đóng" },
    ],
  };
}

export async function createSupportTicketService(userId: string, input: CreateSupportTicketInput) {
  return prisma.supportTicket.create({
    data: {
      userId,
      characterName: normalizeText(input.characterName),
      serverName: normalizeText(input.serverName),
      title: input.title.trim(),
      content: input.content.trim(),
      status: "open",
    },
  });
}

export async function listMySupportTicketsService(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.supportTicket.count({ where: { userId } }),
  ]);
  return { items, total, page, limit };
}

export async function listSupportChannelsForAdminService() {
  await ensureSupportChannels();
  return prisma.supportChannel.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function createSupportChannelService(input: CreateSupportChannelInput) {
  return prisma.supportChannel.create({
    data: {
      code: input.code.trim().toLowerCase(),
      name: input.name.trim(),
      url: input.url.trim(),
      icon: normalizeText(input.icon),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateSupportChannelService(id: string, input: UpdateSupportChannelInput) {
  return prisma.supportChannel.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.url !== undefined ? { url: input.url.trim() } : {}),
      ...(input.icon !== undefined ? { icon: normalizeText(input.icon) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });
}

export async function deleteSupportChannelService(id: string) {
  await prisma.supportChannel.delete({ where: { id } });
}
