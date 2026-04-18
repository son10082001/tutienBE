import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
    const adminPassword = await bcrypt.hash("Admin@123", 10);
    const userPassword = await bcrypt.hash("User@123", 10);
    await prisma.user.upsert({
        where: { email: "admin@tutien.local" },
        update: {},
        create: {
            email: "admin@tutien.local",
            passwordHash: adminPassword,
            fullName: "System Admin",
            role: Role.ADMIN,
        },
    });
    await prisma.user.upsert({
        where: { email: "user@tutien.local" },
        update: {},
        create: {
            email: "user@tutien.local",
            passwordHash: userPassword,
            fullName: "Normal User",
            role: Role.USER,
        },
    });
    console.log("Seeded users: admin@tutien.local / user@tutien.local");
}
main()
    .catch((err) => {
    console.error(err);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
