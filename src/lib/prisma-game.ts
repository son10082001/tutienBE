import { PrismaClient } from "../../node_modules/.prisma/game-client/index.js";

const base = process.env.DATABASE_URL!;

export const prismaGame = new PrismaClient({
  datasources: { db: { url: `${base}/game` } },
});
