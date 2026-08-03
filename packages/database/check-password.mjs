import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const users = await db.user.findMany({
  take: 5,
  select: { email: true, passwordHash: true, status: true },
  where: { organization: { slug: 'acme' } },
});
console.log(JSON.stringify(users, null, 2));
await db.$disconnect();
