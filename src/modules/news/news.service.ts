import { prisma } from "../../lib/prisma.js";
import type { AdminNewsUpsertInput } from "./news.schema.js";

function toPublishedAt(input: AdminNewsUpsertInput): Date | null {
  if (input.isPublished) {
    return input.publishedAt ? new Date(input.publishedAt) : new Date();
  }
  return null;
}

export async function createNewsPostService(userId: string, input: AdminNewsUpsertInput) {
  return prisma.newsPost.create({
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage ?? null,
      isFeatured: input.isFeatured ?? false,
      isPublished: input.isPublished ?? true,
      publishedAt: toPublishedAt(input),
      createdBy: userId,
    },
  });
}

export async function updateNewsPostService(id: string, input: AdminNewsUpsertInput) {
  return prisma.newsPost.update({
    where: { id },
    data: {
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      coverImage: input.coverImage ?? null,
      isFeatured: input.isFeatured ?? false,
      isPublished: input.isPublished ?? true,
      publishedAt: toPublishedAt(input),
    },
  });
}

export async function deleteNewsPostService(id: string) {
  return prisma.newsPost.delete({ where: { id } });
}

export async function getNewsBySlugService(slug: string) {
  return prisma.newsPost.findFirst({
    where: {
      slug,
      isPublished: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    },
  });
}

export async function listAdminNewsService(page: number, limit: number, search?: string) {
  const where = search
    ? {
        OR: [
          { title: { contains: search } },
          { slug: { contains: search } },
          { excerpt: { contains: search } },
        ],
      }
    : {};
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.newsPost.findMany({ where, skip, take: limit, orderBy: [{ createdAt: "desc" }] }),
    prisma.newsPost.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listPublicNewsService(page: number, limit: number) {
  const where = {
    isPublished: true,
    OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
  };
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.newsPost.findMany({ where, skip, take: limit, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
    prisma.newsPost.count({ where }),
  ]);
  return { items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listFeaturedNewsService(limit: number) {
  return prisma.newsPost.findMany({
    where: {
      isPublished: true,
      isFeatured: true,
      OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }],
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}
