const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding visual demo database records...");

  const clientId = "cmrhg4ehx0001cp8bay5ddwrv";
  const freelancerId = "cmrhhv7110003cpg7w19xinvn";

  // 1. Create/Upsert Client
  const client = await prisma.user.upsert({
    where: { id: clientId },
    update: {
      email: "thushar2410612@ssn.edu.in",
      name: "Thushar Client",
      role: "CLIENT",
      profileCompleted: true,
      businessName: "TrustLance Client Labs",
      location: "Chennai, India",
      bio: "Managing enterprise escrow and outsourcing operations."
    },
    create: {
      id: clientId,
      email: "thushar2410612@ssn.edu.in",
      name: "Thushar Client",
      role: "CLIENT",
      profileCompleted: true,
      businessName: "TrustLance Client Labs",
      location: "Chennai, India",
      bio: "Managing enterprise escrow and outsourcing operations."
    }
  });

  // 2. Create/Upsert Freelancer
  const freelancer = await prisma.user.upsert({
    where: { id: freelancerId },
    update: {
      email: "thushartl0188@gmail.com",
      name: "Thushar Freelancer",
      role: "FREELANCER",
      profileCompleted: true,
      businessName: "TL Solutions",
      location: "Bangalore, India",
      bio: "Full Stack Engineer specializing in Next.js, React, Node.js and Solidity smart contracts."
    },
    create: {
      id: freelancerId,
      email: "thushartl0188@gmail.com",
      name: "Thushar Freelancer",
      role: "FREELANCER",
      profileCompleted: true,
      businessName: "TL Solutions",
      location: "Bangalore, India",
      bio: "Full Stack Engineer specializing in Next.js, React, Node.js and Solidity smart contracts."
    }
  });

  // 3. Create Connection between client and freelancer
  await prisma.connection.upsert({
    where: {
      requesterId_addresseeId: {
        requesterId: clientId,
        addresseeId: freelancerId
      }
    },
    update: { status: "ACCEPTED", respondedAt: new Date() },
    create: {
      requesterId: clientId,
      addresseeId: freelancerId,
      status: "ACCEPTED",
      respondedAt: new Date()
    }
  });

  // 4. Create first project (Success payment)
  const p1 = await prisma.project.upsert({
    where: { id: "demo_proj_1" },
    update: {
      title: "E-Commerce Gateway Redesign",
      description: "Overhaul checkout systems for multi-vendor market integration.",
      status: "COMPLETED",
      budget: 150000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      clientId,
      freelancerId
    },
    create: {
      id: "demo_proj_1",
      title: "E-Commerce Gateway Redesign",
      description: "Overhaul checkout systems for multi-vendor market integration.",
      status: "COMPLETED",
      budget: 150000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      clientId,
      freelancerId
    }
  });

  // 5. Create payment for first project
  await prisma.payment.upsert({
    where: { projectId: "demo_proj_1" },
    update: { amount: 150000, status: "SUCCESS" },
    create: {
      projectId: "demo_proj_1",
      razorpayOrderId: "order_demo_1",
      razorpayPaymentId: "pay_demo_1",
      amount: 150000,
      status: "SUCCESS"
    }
  });

  // 6. Create Rating for first project
  await prisma.rating.upsert({
    where: {
      projectId_raterId: {
        projectId: "demo_proj_1",
        raterId: clientId
      }
    },
    update: { score: 5, comment: "Exemplary checkout gateway implementation. Code is fully clean!" },
    create: {
      projectId: "demo_proj_1",
      raterId: clientId,
      rateeId: freelancerId,
      score: 5,
      comment: "Exemplary checkout gateway implementation. Code is fully clean!"
    }
  });

  // 7. Create second project (Pending payment)
  await prisma.project.upsert({
    where: { id: "demo_proj_2" },
    update: {
      title: "Smart Contract Escrow Audit",
      description: "Audit decentralized multi-sig solidity escrow systems.",
      status: "ASSIGNED",
      budget: 75000,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      clientId,
      freelancerId
    },
    create: {
      id: "demo_proj_2",
      title: "Smart Contract Escrow Audit",
      description: "Audit decentralized multi-sig solidity escrow systems.",
      status: "ASSIGNED",
      budget: 75000,
      deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      clientId,
      freelancerId
    }
  });

  // 8. Create payment for second project
  await prisma.payment.upsert({
    where: { projectId: "demo_proj_2" },
    update: { amount: 75000, status: "PENDING" },
    create: {
      projectId: "demo_proj_2",
      razorpayOrderId: "order_demo_2",
      amount: 75000,
      status: "PENDING"
    }
  });

  console.log("Mock data seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding mock data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
