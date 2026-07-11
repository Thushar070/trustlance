import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with default user overrides...");

  const admin = await prisma.user.upsert({
    where: { email: "thusharyyy@gmail.com" },
    update: { role: Role.ADMIN },
    create: {
      email: "thusharyyy@gmail.com",
      name: "Thushar Admin",
      role: Role.ADMIN,
    },
  });
  console.log(`Upserted ADMIN user: ${admin.email} (Role: ${admin.role})`);

  const client = await prisma.user.upsert({
    where: { email: "thushar2410612@ssn.edu.in" },
    update: { role: Role.CLIENT },
    create: {
      email: "thushar2410612@ssn.edu.in",
      name: "Thushar Client",
      role: Role.CLIENT,
    },
  });
  console.log(`Upserted CLIENT user: ${client.email} (Role: ${client.role})`);

  const freelancer = await prisma.user.upsert({
    where: { email: "thushar.tl.dev@gmail.com" },
    update: { role: Role.FREELANCER },
    create: {
      email: "thushar.tl.dev@gmail.com",
      name: "Thushar Freelancer",
      role: Role.FREELANCER,
    },
  });
  console.log(`Upserted FREELANCER user: ${freelancer.email} (Role: ${freelancer.role})`);

  console.log("Database seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
