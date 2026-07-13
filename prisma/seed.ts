import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with default user overrides...");

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

  const client = await prisma.user.upsert({
    where: { email: "thushar2410612@ssn.edu.in" },
    update: {
      role: Role.CLIENT,
      profileCompleted: true,
      phone: "+919876543210",
      location: "Chennai, India",
      businessName: "Thushar Enterprise Ltd",
      bio: "High-growth enterprise logistics and security systems provider.",
    },
    create: {
      email: "thushar2410612@ssn.edu.in",
      name: "Thushar Client",
      role: Role.CLIENT,
      profileCompleted: true,
      phone: "+919876543210",
      location: "Chennai, India",
      businessName: "Thushar Enterprise Ltd",
      bio: "High-growth enterprise logistics and security systems provider.",
    },
  });
  console.log(`Upserted CLIENT user: ${client.email} (Role: ${client.role})`);

  const freelancer = await prisma.user.upsert({
    where: { email: "thushar.tl.dev@gmail.com" },
    update: {
      role: Role.FREELANCER,
      profileCompleted: true,
      phone: "+918765432109",
      location: "Bangalore, India",
      bio: "Senior Full-Stack Architect specializing in Next.js, Node.js, and secure escrow systems.",
    },
    create: {
      email: "thushar.tl.dev@gmail.com",
      name: "Thushar Freelancer",
      role: Role.FREELANCER,
      profileCompleted: true,
      phone: "+918765432109",
      location: "Bangalore, India",
      bio: "Senior Full-Stack Architect specializing in Next.js, Node.js, and secure escrow systems.",
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
