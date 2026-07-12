import { submitProposalSchema } from "@/lib/validators/proposal";
import { POST as applyHandler } from "@/app/api/projects/[id]/apply/route";
import { GET as listProposalsHandler } from "@/app/api/projects/[id]/proposals/route";
import { POST as selectFreelancerHandler } from "@/app/api/projects/[id]/select-freelancer/route";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, ProposalStatus } from "@prisma/client";

// Mock auth guards
jest.mock("@/lib/auth/require-role");

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    proposal: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Proposal Validator Unit Tests", () => {
  it("should reject a proposal with estimatedDays <= 0", () => {
    const result = submitProposalSchema.safeParse({
      message: "This is a detailed proposal explanation that meets the length check.",
      estimatedDays: 0,
      price: 5000,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.estimatedDays?.[0]).toContain("must be greater than 0");
    }
  });
});

describe("Proposal API Integration Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject duplicate proposal applications by a freelancer", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "free_123", role: Role.FREELANCER },
        expires: "2026-12-31",
      },
    });

    // Mock project is OPEN
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      status: ProjectStatus.OPEN,
      budget: 10000,
    });

    // Mock an already existing proposal (duplicate check trigger)
    (prisma.proposal.findFirst as jest.Mock).mockResolvedValue({
      id: "existing_prop",
      projectId: "proj_abc",
      freelancerId: "free_123",
    });

    const req = new Request("http://localhost:3000/api/projects/proj_abc/apply", {
      method: "POST",
      body: JSON.stringify({
        message: "Applying again should fail matching constraints.",
        estimatedDays: 5,
        price: 8000,
      }),
    });

    const res = await applyHandler(req, { params: Promise.resolve({ id: "proj_abc" }) });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toContain("already applied");
    expect(prisma.proposal.create).not.toHaveBeenCalled();
  });

  it("should reject applying to a project that is not OPEN", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "free_123", role: Role.FREELANCER },
        expires: "2026-12-31",
      },
    });

    // Mock project in ASSIGNED status
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      status: ProjectStatus.ASSIGNED,
      budget: 10000,
    });

    (prisma.proposal.findFirst as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/projects/proj_abc/apply", {
      method: "POST",
      body: JSON.stringify({
        message: "Applying to an assigned project should be rejected.",
        estimatedDays: 5,
      }),
    });

    const res = await applyHandler(req, { params: Promise.resolve({ id: "proj_abc" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("You can only apply to projects that are currently OPEN");
  });

  it("should prevent non-owning Clients and Freelancers from viewing project proposals", async () => {
    // Case A: Non-owning Client gets blocked
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_other", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    // Mock project owned by "client_123"
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      clientId: "client_123",
    });

    const req1 = new Request("http://localhost:3000/api/projects/proj_abc/proposals");
    const res1 = await listProposalsHandler(req1, { params: Promise.resolve({ id: "proj_abc" }) });
    const data1 = await res1.json();

    expect(res1.status).toBe(403);
    expect(data1.error).toContain("Only the project owner can view proposals");

    // Case B: Freelancer role gets blocked from endpoint
    mockedRequireRole.mockResolvedValue({
      authorized: false,
      status: 403,
      error: "Forbidden: Mismatched role.",
      session: null,
    });

    const req2 = new Request("http://localhost:3000/api/projects/proj_abc/proposals");
    const res2 = await listProposalsHandler(req2, { params: Promise.resolve({ id: "proj_abc" }) });
    const data2 = await res2.json();

    expect(res2.status).toBe(403);
    expect(data2.error).toContain("Forbidden");
  });

  it("should successfully assign project to freelancer, set agreedAmount and transition status to ASSIGNED", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_123", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    // Mock project is OPEN and owned by client_123
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      clientId: "client_123",
      status: ProjectStatus.OPEN,
      budget: 10000,
    });

    // Mock matching pending proposal at counter cost 9500
    (prisma.proposal.findFirst as jest.Mock).mockResolvedValue({
      id: "prop_xyz",
      projectId: "proj_abc",
      freelancerId: "free_123",
      price: 9500,
      status: ProposalStatus.PENDING,
    });

    // Mock project update returning correct results
    (prisma.project.update as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      status: ProjectStatus.ASSIGNED,
      freelancerId: "free_123",
      agreedAmount: 9500,
    });

    const req = new Request("http://localhost:3000/api/projects/proj_abc/select-freelancer", {
      method: "POST",
      body: JSON.stringify({ freelancerId: "free_123" }),
    });

    const res = await selectFreelancerHandler(req, { params: Promise.resolve({ id: "proj_abc" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe(ProjectStatus.ASSIGNED);
    expect(data.freelancerId).toBe("free_123");
    expect(data.agreedAmount).toBe(9500);

    // Verify transaction operations happened
    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ProjectStatus.ASSIGNED,
          freelancerId: "free_123",
          agreedAmount: 9500,
        }),
      })
    );
    expect(prisma.proposal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prop_xyz" },
        data: { status: ProposalStatus.ACCEPTED },
      })
    );
    expect(prisma.proposal.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: "proj_abc",
          id: { not: "prop_xyz" },
        },
        data: { status: ProposalStatus.REJECTED },
      })
    );
  });

  it("should prevent submitting proposals once project status is ASSIGNED", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "free_123", role: Role.FREELANCER },
        expires: "2026-12-31",
      },
    });

    // Mock project is ASSIGNED
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      status: ProjectStatus.ASSIGNED,
    });

    const req = new Request("http://localhost:3000/api/projects/proj_abc/apply", {
      method: "POST",
      body: JSON.stringify({
        message: "Proposal on an assigned project must fail.",
        estimatedDays: 4,
      }),
    });

    const res = await applyHandler(req, { params: Promise.resolve({ id: "proj_abc" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("You can only apply to projects that are currently OPEN");
    expect(prisma.proposal.create).not.toHaveBeenCalled();
  });

  it("should block non-owner Client or any Freelancer from selecting a freelancer", async () => {
    // Case A: Non-owner client is blocked
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_other", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      clientId: "client_123",
      status: ProjectStatus.OPEN,
    });

    const req1 = new Request("http://localhost:3000/api/projects/proj_abc/select-freelancer", {
      method: "POST",
      body: JSON.stringify({ freelancerId: "free_123" }),
    });

    const res1 = await selectFreelancerHandler(req1, { params: Promise.resolve({ id: "proj_abc" }) });
    const data1 = await res1.json();

    expect(res1.status).toBe(403);
    expect(data1.error).toContain("Only the project owner can select a freelancer");

    // Case B: Freelancer is blocked
    mockedRequireRole.mockResolvedValue({
      authorized: false,
      status: 403,
      error: "Forbidden: Mismatched role.",
      session: null,
    });

    const req2 = new Request("http://localhost:3000/api/projects/proj_abc/select-freelancer", {
      method: "POST",
      body: JSON.stringify({ freelancerId: "free_123" }),
    });

    const res2 = await selectFreelancerHandler(req2, { params: Promise.resolve({ id: "proj_abc" }) });
    const data2 = await res2.json();

    expect(res2.status).toBe(403);
    expect(data2.error).toContain("Forbidden");
  });

  it("should block selecting a freelancer if project status is not OPEN", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_123", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    // Mock project is already ASSIGNED
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_abc",
      clientId: "client_123",
      status: ProjectStatus.ASSIGNED,
    });

    const req = new Request("http://localhost:3000/api/projects/proj_abc/select-freelancer", {
      method: "POST",
      body: JSON.stringify({ freelancerId: "free_123" }),
    });

    const res = await selectFreelancerHandler(req, { params: Promise.resolve({ id: "proj_abc" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain("Cannot select freelancer for a project that is already ASSIGNED");
    expect(prisma.project.update).not.toHaveBeenCalled();
  });
});
