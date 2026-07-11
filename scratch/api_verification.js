const { PrismaClient, ProjectStatus, Role, ProposalStatus } = require("@prisma/client");
const { encode } = require("next-auth/jwt");
const fs = require("fs");
const path = require("path");

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  }
} catch (e) {
  console.log("No .env file found, relying on process.env");
}

const prisma = new PrismaClient();
const secret = process.env.NEXTAUTH_SECRET || "e9a9b2b1cf58a5c317d747a7b8e19c3b8fd72199b1a0be5fe79b8a8b13bf7ee9";
const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("Starting API Verification Script...");

  // 1. Seed or fetch users
  console.log("Setting up users in DB...");
  const clientUser = await prisma.user.upsert({
    where: { email: "thushar2410612@ssn.edu.in" },
    update: { role: Role.CLIENT, name: "Client Test" },
    create: { email: "thushar2410612@ssn.edu.in", name: "Client Test", role: Role.CLIENT },
  });

  const freelancerUser = await prisma.user.upsert({
    where: { email: "thushartl0188@gmail.com" },
    update: { role: Role.FREELANCER, name: "Freelancer Test" },
    create: { email: "thushartl0188@gmail.com", name: "Freelancer Test", role: Role.FREELANCER },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "thusharyyy@gmail.com" },
    update: { role: Role.ADMIN, name: "Admin Test" },
    create: { email: "thusharyyy@gmail.com", name: "Admin Test", role: Role.ADMIN },
  });

  const unassignedFreelancer = await prisma.user.upsert({
    where: { email: "unassigned_free@gmail.com" },
    update: { role: Role.FREELANCER, name: "Other Freelancer" },
    create: { email: "unassigned_free@gmail.com", name: "Other Freelancer", role: Role.FREELANCER },
  });

  // 2. Setup a project
  console.log("Setting up test project...");
  // Delete existing test projects to prevent collision
  await prisma.project.deleteMany({
    where: { title: "API Verification Project" },
  });

  const project = await prisma.project.create({
    data: {
      title: "API Verification Project",
      description: "This is a verification project description that has enough characters.",
      budget: 15000,
      deadline: new Date(Date.now() + 86400 * 1000 * 5), // 5 days from now
      skills: ["NodeJS", "React"],
      status: ProjectStatus.ASSIGNED, // Directly set assigned to test private routes
      clientId: clientUser.id,
      freelancerId: freelancerUser.id,
    },
  });

  console.log(`Created test project ID: ${project.id}`);

  // 3. Generate NextAuth tokens
  console.log("Generating NextAuth JWT cookies...");
  const clientCookie = await generateCookie(clientUser);
  const freelancerCookie = await generateCookie(freelancerUser);
  const adminCookie = await generateCookie(adminUser);
  const otherFreelancerCookie = await generateCookie(unassignedFreelancer);

  const report = [];

  // ============================================
  // Test A1: Project Visibility in list projects
  // ============================================
  try {
    // Other freelancer listing projects: should not see this ASSIGNED project
    const res = await fetch(`${BASE_URL}/api/projects?status=ASSIGNED`, {
      headers: { Cookie: `next-auth.session-token=${otherFreelancerCookie}` },
    });
    const data = await res.json();
    const found = data.items && data.items.some((p) => p.id === project.id);
    report.push({
      feature: "Project Visibility (Browse List)",
      phase: "Part A (Visibility)",
      expected: "Project not returned in list for unassigned users",
      actual: found ? "Project was returned in list" : "Project was hidden",
      status: !found ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Project Visibility (Browse List)",
      phase: "Part A (Visibility)",
      expected: "Project not returned in list",
      actual: err.message,
      status: "Error",
    });
  }

  // ============================================
  // Test A2: Direct Project Access Gating
  // ============================================
  try {
    // Unassigned freelancer direct access -> should be 403 Forbidden
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}`, {
      headers: { Cookie: `next-auth.session-token=${otherFreelancerCookie}` },
    });
    report.push({
      feature: "Direct Project Access (Other Freelancer)",
      phase: "Part A (Visibility)",
      expected: "403 Forbidden",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Direct Project Access (Other Freelancer)",
      phase: "Part A (Visibility)",
      expected: "403",
      actual: err.message,
      status: "Error",
    });
  }

  try {
    // Client owner direct access -> should be 200 OK
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}`, {
      headers: { Cookie: `next-auth.session-token=${clientCookie}` },
    });
    report.push({
      feature: "Direct Project Access (Client Owner)",
      phase: "Part A (Visibility)",
      expected: "200 OK",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Direct Project Access (Client Owner)",
      phase: "Part A (Visibility)",
      expected: "200",
      actual: err.message,
      status: "Error",
    });
  }

  try {
    // Admin direct access -> should be 200 OK (admin can view for dispute checks)
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}`, {
      headers: { Cookie: `next-auth.session-token=${adminCookie}` },
    });
    report.push({
      feature: "Direct Project Access (Admin)",
      phase: "Part A (Visibility)",
      expected: "200 OK",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Direct Project Access (Admin)",
      phase: "Part A (Visibility)",
      expected: "200",
      actual: err.message,
      status: "Error",
    });
  }

  // ============================================
  // Test B1: Messaging Authorization (Send Message)
  // ============================================
  try {
    // Client owner sends message -> should be 201 Created
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${clientCookie}`,
      },
      body: JSON.stringify({ content: "Hello from client" }),
    });
    report.push({
      feature: "Send Message (Client)",
      phase: "Part B (Messaging)",
      expected: "201 Created",
      actual: `HTTP ${res.status}`,
      status: res.status === 201 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Send Message (Client)",
      phase: "Part B (Messaging)",
      expected: "201",
      actual: err.message,
      status: "Error",
    });
  }

  try {
    // Admin sends message -> should be 403 Forbidden (Admin cannot chat directly)
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${adminCookie}`,
      },
      body: JSON.stringify({ content: "Hello from admin" }),
    });
    report.push({
      feature: "Send Message (Admin)",
      phase: "Part B (Messaging)",
      expected: "403 Forbidden",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Send Message (Admin)",
      phase: "Part B (Messaging)",
      expected: "403",
      actual: err.message,
      status: "Error",
    });
  }

  // ============================================
  // Test B2: Messaging Authorization (List Messages)
  // ============================================
  try {
    // Admin lists messages -> should be 403 Forbidden
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}/messages`, {
      headers: { Cookie: `next-auth.session-token=${adminCookie}` },
    });
    report.push({
      feature: "List Messages (Admin Reject)",
      phase: "Part B (Messaging)",
      expected: "403 Forbidden",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "List Messages (Admin Reject)",
      phase: "Part B (Messaging)",
      expected: "403",
      actual: err.message,
      status: "Error",
    });
  }

  try {
    // Freelancer lists messages -> should be 200 OK
    const res = await fetch(`${BASE_URL}/api/projects/${project.id}/messages`, {
      headers: { Cookie: `next-auth.session-token=${freelancerCookie}` },
    });
    report.push({
      feature: "List Messages (Freelancer)",
      phase: "Part B (Messaging)",
      expected: "200 OK",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "List Messages (Freelancer)",
      phase: "Part B (Messaging)",
      expected: "200",
      actual: err.message,
      status: "Error",
    });
  }

  // ============================================
  // Test C1: Profile Page Update Permissions & Format
  // ============================================
  try {
    // Valid update
    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${clientCookie}`,
      },
      body: JSON.stringify({
        name: "Client Updated Name",
        phone: "+919988776655",
        location: "Mumbai, India",
        businessName: "Seeded Enterprise",
        bio: "Seeded test account biography.",
      }),
    });
    report.push({
      feature: "Update Profile (Valid Payload)",
      phase: "Part C (Profiles)",
      expected: "200 OK",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Update Profile (Valid Payload)",
      phase: "Part C (Profiles)",
      expected: "200",
      actual: err.message,
      status: "Error",
    });
  }

  try {
    // Invalid phone validation trigger
    const res = await fetch(`${BASE_URL}/api/users/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `next-auth.session-token=${clientCookie}`,
      },
      body: JSON.stringify({
        phone: "1234", // malformed (too short / invalid regex)
      }),
    });
    report.push({
      feature: "Update Profile (Malformed Phone)",
      phase: "Part C (Profiles)",
      expected: "400 Bad Request",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "Working" : "Broken",
    });
  } catch (err) {
    report.push({
      feature: "Update Profile (Malformed Phone)",
      phase: "Part C (Profiles)",
      expected: "400",
      actual: err.message,
      status: "Error",
    });
  }

  // Print Report
  console.log("\n=========================================================================");
  console.log("                       API VERIFICATION REPORT                           ");
  console.log("=========================================================================");
  console.log("Feature | Phase | Expected | Actual | Status");
  console.log("-------------------------------------------------------------------------");
  for (const row of report) {
    console.log(`${row.feature} | ${row.phase} | ${row.expected} | ${row.actual} | ${row.status}`);
  }
  console.log("=========================================================================\n");

  await prisma.$disconnect();
}

async function generateCookie(user) {
  // Derive session token structure
  const token = {
    name: user.name,
    email: user.email,
    sub: user.id,
    id: user.id,
    role: user.role,
  };
  
  // Encrypt token via next-auth JWE encode method
  return encode({
    token,
    secret,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });
}

main().catch((err) => {
  console.error("Fatal script error:", err);
  process.exit(1);
});
