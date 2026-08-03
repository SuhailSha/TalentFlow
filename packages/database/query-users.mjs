import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const users = await db.user.findMany({
  take: 5,
  include: { organization: { select: { slug: true } } },
  where: { organization: { slug: 'acme' } },
});
console.log(JSON.stringify(users.map(u => ({ email: u.email, firstName: u.firstName, status: u.status })), null, 2));
await db.$disconnect();
