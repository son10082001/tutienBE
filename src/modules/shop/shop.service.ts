import { prisma } from "../../lib/prisma.js";
import { getAvailableBalance, listExchangeCharacters, listExchangeServers } from "../ticket-exchange/ticket-exchange.service.js";
import { fetchExternalItems, sendItemMailByRoleUid } from "./external-mail-api.js";
import type {
  BuyShopItemInput,
  CreateShopItemInput,
  ListShopItemsUserQueryInput,
  UpdateShopItemInput,
} from "./shop.schema.js";

export async function listExternalItemsService() {
  return fetchExternalItems();
}

export async function listShopItemsAdminService() {
  return (prisma as any).shopItem.findMany({ orderBy: { createdAt: "desc" } });
}

export async function createShopItemService(input: CreateShopItemInput) {
  return (prisma as any).shopItem.create({
    data: {
      externalItemId: input.externalItemId,
      itemName: input.itemName.trim(),
      itemQuantity: input.itemQuantity,
      price: input.price,
      imageUrl: input.imageUrl?.trim() || null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateShopItemService(id: string, input: UpdateShopItemInput) {
  return (prisma as any).shopItem.update({
    where: { id },
    data: {
      ...(input.externalItemId !== undefined && { externalItemId: input.externalItemId }),
      ...(input.itemName !== undefined && { itemName: input.itemName.trim() }),
      ...(input.itemQuantity !== undefined && { itemQuantity: input.itemQuantity }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl?.trim() || null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deleteShopItemService(id: string) {
  await (prisma as any).shopItem.delete({ where: { id } });
}

export async function listShopItemsUserService(query: ListShopItemsUserQueryInput) {
  const where: any = {
    isActive: true,
  };

  if (query.search) {
    where.itemName = { contains: query.search };
  }

  if (query.priceRank === "low") {
    where.price = { lt: 50_000 };
  } else if (query.priceRank === "mid") {
    where.price = { gte: 50_000, lt: 200_000 };
  } else if (query.priceRank === "high") {
    where.price = { gte: 200_000, lt: 500_000 };
  } else if (query.priceRank === "vip") {
    where.price = { gte: 500_000 };
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const price = where.price ?? {};
    if (query.minPrice !== undefined) {
      price.gte = Math.max(price.gte ?? 0, query.minPrice);
    }
    if (query.maxPrice !== undefined) {
      price.lte = query.maxPrice;
    }
    where.price = price;
  }

  const orderBy =
    query.sort === "price-asc"
      ? { price: "asc" }
      : query.sort === "price-desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const [items, total] = await prisma.$transaction([
    (prisma as any).shopItem.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    (prisma as any).shopItem.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { items, total, page, limit, totalPages };
}

export async function getShopMetaForUserService(userId: string) {
  const [servers, characters, balance] = await Promise.all([
    listExchangeServers(),
    listExchangeCharacters(userId),
    getAvailableBalance(userId),
  ]);
  return { servers, characters, balance };
}

export async function buyShopItemService(userId: string, input: BuyShopItemInput) {
  const item = await (prisma as any).shopItem.findUnique({ where: { id: input.shopItemId } });
  if (!item || !item.isActive) {
    throw new Error("Sản phẩm không tồn tại hoặc đã ngừng bán");
  }
  if (item.itemQuantity < input.buyQuantity) {
    throw new Error(`Số lượng tồn kho không đủ (còn ${item.itemQuantity})`);
  }

  const character = (await listExchangeCharacters(userId)).find((c) => c.serverId === input.serverId);
  if (!character) {
    throw new Error("Tài khoản chưa có nhân vật ở server đã chọn");
  }

  const totalPrice = item.price * input.buyQuantity;
  const available = await getAvailableBalance(userId);
  if (totalPrice > available) {
    throw new Error(`Số dư không đủ (còn ${available})`);
  }

  const totalItemQuantity = input.buyQuantity;
  const order = await prisma.$transaction(async (tx: any) => {
    const db = tx as typeof prisma;
    const updated = await (db as any).shopItem.updateMany({
      where: {
        id: item.id,
        isActive: true,
        itemQuantity: { gte: input.buyQuantity },
      },
      data: {
        itemQuantity: { decrement: input.buyQuantity },
      },
    });
    if (updated.count < 1) {
      throw new Error("Sản phẩm không đủ tồn kho hoặc đã ngừng bán");
    }

    return (db as any).shopOrder.create({
      data: {
        userId,
        shopItemId: item.id,
        externalItemId: item.externalItemId,
        itemName: item.itemName,
        unitItemQuantity: 1,
        buyQuantity: input.buyQuantity,
        totalItemQuantity,
        unitPrice: item.price,
        totalPrice,
        serverId: character.serverId,
        playerUid: character.uid,
        playerName: character.name,
      },
    });
  });

  try {
    await sendItemMailByRoleUid(character.uid, item.externalItemId, totalItemQuantity);
  } catch (error) {
    // Best-effort rollback khi gửi mail thất bại.
    await prisma.$transaction([
      (prisma as any).shopOrder.delete({ where: { id: order.id } }),
      (prisma as any).shopItem.update({
        where: { id: item.id },
        data: { itemQuantity: { increment: input.buyQuantity } },
      }),
    ]);
    throw error;
  }

  const balanceAfter = await getAvailableBalance(userId);
  return { order, balanceAfter };
}
