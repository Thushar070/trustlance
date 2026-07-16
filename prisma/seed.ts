import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all existing database tables...");
  await prisma.evidence.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.escrow.deleteMany({});
  await prisma.submission.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.rating.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.connection.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.webhookEvent.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // Remove all users except the Admin
  await prisma.user.deleteMany({
    where: {
      email: {
        not: "thusharyyy@gmail.com",
      },
    },
  });
  console.log("Database cleared successfully.");

  console.log("Seeding database with ADMIN user...");
  const admin = await prisma.user.upsert({
    where: { email: "thusharyyy@gmail.com" },
    update: {
      role: Role.ADMIN,
      profileCompleted: true,
      phone: "+917654321098",
      location: "Mumbai, India",
      bio: "Global Security Administrator for TrustLance.",
    },
    create: {
      email: "thusharyyy@gmail.com",
      name: "Thushar Admin",
      role: Role.ADMIN,
      profileCompleted: true,
      phone: "+917654321098",
      location: "Mumbai, India",
      bio: "Global Security Administrator for TrustLance.",
    },
  });
  console.log(`Upserted ADMIN user: ${admin.email} (Role: ${admin.role})`);

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
