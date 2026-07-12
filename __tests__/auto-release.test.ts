import { findEligibleProjects, runAutoRelease } from "@/lib/cron/auto-release";
import { GET as adminOverviewHandler } from "@/app/api/admin/overview/route";
import { GET as listProjectsHandler } from "@/app/api/projects/route";
import { EscrowStatus, ProjectStatus, DisputeStatus, PaymentStatus } from "@prisma/client";
import { NotificationService } from "@/lib/services/notification-service";

// Mock Mailer & NotificationService
jest.mock("@/lib/notifications/mailer", () => ({
  Mailer: {
    sendEmail: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("@/lib/services/notification-service", () => ({
  NotificationService: {
    notify: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock requireRole
jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn().mockResolvedValue({
    authorized: true,
    status: 200,
    error: null,
    session: { user: { id: "admin_user", role: "ADMIN" } },
  }),
}));

// Mock getServerSession
jest.mock("@/lib/auth/get-server-session", () => ({
  getServerSession: jest.fn().mockResolvedValue({
    user: { id: "client_user", role: "FREELANCER" },
  }),
}));

// Setup mock database tables
interface MockProject {
  id: string;
  status: ProjectStatus;
  clientId?: string;
  skills?: string[];
  budget?: number;
  deadline?: Date;
}

interface MockEscrow {
  id: string;
  projectId: string;
  status: EscrowStatus;
}

interface MockDispute {
  id: string;
  escrowId: string;
  status: DisputeStatus;
}

interface MockSubmission {
  id: string;
  projectId: string;
  createdAt: Date;
}

interface MockPayment {
  id: string;
  amount: number;
  status: PaymentStatus;
}

let mockProjectDb: Record<string, MockProject> = {};
let mockEscrowDb: Record<string, MockEscrow> = {};
let mockDisputeDb: Record<string, MockDispute> = {};
let mockSubmissionDb: Record<string, MockSubmission> = {};
let mockPaymentDb: Record<string, MockPayment> = {};
let mockAuditLogDb: Record<string, unknown>[] = [];

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn((args) => {
        const id = args.where.id;
        const project = mockProjectDb[id];
        if (!project) return null;
        return {
          ...project,
          escrow: Object.values(mockEscrowDb).find((e) => e.projectId === project.id) || null,
        };
      }),
      count: jest.fn((args) => {
        const where = args.where || {};
        return Object.values(mockProjectDb).filter((p) => {
          if (where.status && p.status !== where.status) return false;
          if (where.clientId && p.clientId !== where.clientId) return false;
          if (where.skills?.hasSome) {
            const matches = p.skills?.some((s) => where.skills.hasSome.includes(s));
            if (!matches) return false;
          }
          if (where.budget) {
            if (where.budget.gte !== undefined && p.budget !== undefined && p.budget < where.budget.gte) return false;
            if (where.budget.lte !== undefined && p.budget !== undefined && p.budget > where.budget.lte) return false;
          }
          if (where.deadline) {
            if (where.deadline.lte !== undefined && p.deadline !== undefined && new Date(p.deadline) > where.deadline.lte) return false;
            if (where.deadline.gte !== undefined && p.deadline !== undefined && new Date(p.deadline) < where.deadline.gte) return false;
          }
          return true;
        }).length;
      }),
      findMany: jest.fn((args) => {
        const where = args.where || {};
        const items = Object.values(mockProjectDb).filter((p) => {
          if (where.status && p.status !== where.status) return false;
          if (where.clientId && p.clientId !== where.clientId) return false;
          if (where.skills?.hasSome) {
            const matches = p.skills?.some((s) => where.skills.hasSome.includes(s));
            if (!matches) return false;
          }
          if (where.budget) {
            if (where.budget.gte !== undefined && p.budget !== undefined && p.budget < where.budget.gte) return false;
            if (where.budget.lte !== undefined && p.budget !== undefined && p.budget > where.budget.lte) return false;
          }
          if (where.deadline) {
            if (where.deadline.lte !== undefined && p.deadline !== undefined && new Date(p.deadline) > where.deadline.lte) return false;
            if (where.deadline.gte !== undefined && p.deadline !== undefined && new Date(p.deadline) < where.deadline.gte) return false;
          }
          return true;
        });
        return items.map((p) => ({
          ...p,
          client: { id: p.clientId || "client", name: "Client", email: "client@test.com" },
        }));
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockProjectDb[id]) {
          mockProjectDb[id] = { ...mockProjectDb[id], ...args.data };
        }
        return mockProjectDb[id];
      }),
      groupBy: jest.fn(() => {
        const statuses = Object.values(ProjectStatus);
        return statuses.map((status) => {
          const count = Object.values(mockProjectDb).filter((p) => p.status === status).length;
          return {
            status,
            _count: { id: count },
          };
        });
      }),
    },
    escrow: {
      findMany: jest.fn((args) => {
        const where = args.where || {};
        const results = Object.values(mockEscrowDb).filter((e) => {
          if (where.status && e.status !== where.status) return false;
          if (where.NOT?.dispute?.status?.in) {
            const dispute = Object.values(mockDisputeDb).find((d) => d.escrowId === e.id);
            if (dispute && where.NOT.dispute.status.in.includes(dispute.status)) return false;
          }
          return true;
        });

        return results.map((e) => {
          const project = mockProjectDb[e.projectId];
          const projectSubmissions = Object.values(mockSubmissionDb)
            .filter((s) => s.projectId === e.projectId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          return {
            ...e,
            project: project ? {
              ...project,
              submissions: projectSubmissions,
            } : null,
          };
        });
      }),
      findUnique: jest.fn((args) => {
        const id = args.where.id;
        return mockEscrowDb[id] || null;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockEscrowDb[id]) {
          mockEscrowDb[id] = { ...mockEscrowDb[id], ...args.data };
        }
        return mockEscrowDb[id];
      }),
    },
    dispute: {
      count: jest.fn((args) => {
        const where = args.where || {};
        return Object.values(mockDisputeDb).filter((d) => {
          if (where.status?.in) {
            return where.status.in.includes(d.status);
          }
          return true;
        }).length;
      }),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(() => {
        const successPayments = Object.values(mockPaymentDb).filter((p) => p.status === PaymentStatus.SUCCESS);
        const sum = successPayments.reduce((total: number, p) => total + p.amount, 0);
        return {
          _sum: { amount: sum },
        };
      }),
    },
    auditLog: {
      create: jest.fn((args) => {
        mockAuditLogDb.push(args.data);
        return args.data;
      }),
      findFirst: jest.fn((args) => {
        const where = args.where || {};
        return mockAuditLogDb.find((log) => {
          if (where.entityType && log.entityType !== where.entityType) return false;
          if (where.entityId && log.entityId !== where.entityId) return false;
          if (where.action && log.action !== where.action) return false;
          return true;
        }) || null;
      }),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  return { prisma: mockPrisma };
});

describe("Phase 11: Auto-Release & Admin Overview Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectDb = {};
    mockEscrowDb = {};
    mockDisputeDb = {};
    mockSubmissionDb = {};
    mockPaymentDb = {};
    mockAuditLogDb = [];
  });

  it("1. findEligibleProjects correctly includes a project past the grace period with no open dispute", async () => {
    const submissionDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago

    mockProjectDb["proj_eligible"] = {
      id: "proj_eligible",
      status: ProjectStatus.UNDER_REVIEW,
      clientId: "client_user",
    };

    mockEscrowDb["escrow_eligible"] = {
      id: "escrow_eligible",
      projectId: "proj_eligible",
      status: EscrowStatus.UNDER_REVIEW,
    };

    mockSubmissionDb["sub_eligible"] = {
      id: "sub_eligible",
      projectId: "proj_eligible",
      createdAt: submissionDate,
    };

    const eligible = await findEligibleProjects(5);
    expect(eligible.length).toBe(1);
    expect(eligible[0].id).toBe("escrow_eligible");
  });

  it("2. findEligibleProjects correctly EXCLUDES a project past the grace period that DOES have an open dispute", async () => {
    const submissionDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago

    mockProjectDb["proj_disputed"] = {
      id: "proj_disputed",
      status: ProjectStatus.UNDER_REVIEW,
      clientId: "client_user",
    };

    mockEscrowDb["escrow_disputed"] = {
      id: "escrow_disputed",
      projectId: "proj_disputed",
      status: EscrowStatus.UNDER_REVIEW,
    };

    mockSubmissionDb["sub_disputed"] = {
      id: "sub_disputed",
      projectId: "proj_disputed",
      createdAt: submissionDate,
    };

    mockDisputeDb["dispute_open"] = {
      id: "dispute_open",
      escrowId: "escrow_disputed",
      status: DisputeStatus.OPEN,
    };

    const eligible = await findEligibleProjects(5);
    expect(eligible.length).toBe(0);
  });

  it("3. findEligibleProjects correctly excludes a project still within the grace period", async () => {
    const submissionDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago

    mockProjectDb["proj_recent"] = {
      id: "proj_recent",
      status: ProjectStatus.UNDER_REVIEW,
      clientId: "client_user",
    };

    mockEscrowDb["escrow_recent"] = {
      id: "escrow_recent",
      projectId: "proj_recent",
      status: EscrowStatus.UNDER_REVIEW,
    };

    mockSubmissionDb["sub_recent"] = {
      id: "sub_recent",
      projectId: "proj_recent",
      createdAt: submissionDate,
    };

    const eligible = await findEligibleProjects(5);
    expect(eligible.length).toBe(0);
  });

  it("4. runAutoRelease correctly transitions an eligible project's Escrow to RELEASED and Project to COMPLETED, using the SYSTEM_AUTO_RELEASE_ACTOR constant, and this is visible and distinguishable in AuditLog from a manual approval", async () => {
    const submissionDate = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000); // 6 days ago

    mockProjectDb["proj_release"] = {
      id: "proj_release",
      status: ProjectStatus.UNDER_REVIEW,
      clientId: "client_user",
    };

    mockEscrowDb["escrow_release"] = {
      id: "escrow_release",
      projectId: "proj_release",
      status: EscrowStatus.UNDER_REVIEW,
    };

    mockSubmissionDb["sub_release"] = {
      id: "sub_release",
      projectId: "proj_release",
      createdAt: submissionDate,
    };

    const count = await runAutoRelease(5);
    expect(count).toBe(1);

    expect(mockProjectDb["proj_release"].status).toBe(ProjectStatus.COMPLETED);
    expect(mockEscrowDb["escrow_release"].status).toBe(EscrowStatus.RELEASED);

    // Verify AuditLog entries
    expect(mockAuditLogDb.length).toBe(2);

    const projectLog = mockAuditLogDb.find((l) => l.entityType === "Project");
    const escrowLog = mockAuditLogDb.find((l) => l.entityType === "Escrow");

    expect(projectLog).toBeDefined();
    expect(projectLog.action).toBe("TRANSITION_COMPLETED");
    expect(projectLog.actorId).toBe("SYSTEM_AUTO_RELEASE");

    expect(escrowLog).toBeDefined();
    expect(escrowLog.action).toBe("TRANSITION_RELEASED");
    expect(escrowLog.actorId).toBe("SYSTEM_AUTO_RELEASE");

    expect(NotificationService.notify).toHaveBeenCalledWith("PAYMENT_RELEASED", {
      projectId: "proj_release",
    });
  });

  it("5. GET /api/admin/overview returns correct counts against known seeded/test data", async () => {
    mockProjectDb["proj_1"] = { id: "proj_1", status: ProjectStatus.OPEN };
    mockProjectDb["proj_2"] = { id: "proj_2", status: ProjectStatus.OPEN };
    mockProjectDb["proj_3"] = { id: "proj_3", status: ProjectStatus.COMPLETED };

    mockDisputeDb["disp_1"] = { id: "disp_1", status: DisputeStatus.OPEN };
    mockDisputeDb["disp_2"] = { id: "disp_2", status: DisputeStatus.ADMIN_REVIEW };
    mockDisputeDb["disp_3"] = { id: "disp_3", status: DisputeStatus.RESOLVED };

    mockPaymentDb["pay_1"] = { id: "pay_1", amount: 1000, status: PaymentStatus.SUCCESS };
    mockPaymentDb["pay_2"] = { id: "pay_2", amount: 2500, status: PaymentStatus.SUCCESS };
    mockPaymentDb["pay_3"] = { id: "pay_3", amount: 1500, status: PaymentStatus.FAILED };

    const res = await adminOverviewHandler();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.projectsByStatus[ProjectStatus.OPEN]).toBe(2);
    expect(data.projectsByStatus[ProjectStatus.COMPLETED]).toBe(1);
    expect(data.openDisputesCount).toBe(2);
    expect(data.totalPaymentVolume).toBe(3500);
  });

  it("6. GET /api/projects with combined filters (e.g. skill + budget range) returns only matching projects", async () => {
    mockProjectDb["proj_1"] = {
      id: "proj_1",
      title: "React Developer Needed",
      status: ProjectStatus.OPEN,
      skills: ["React", "JavaScript"],
      budget: 15000,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    };

    mockProjectDb["proj_2"] = {
      id: "proj_2",
      title: "Solidity Smart Contract Expert",
      status: ProjectStatus.OPEN,
      skills: ["Solidity", "Ethereum"],
      budget: 50000,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };

    mockProjectDb["proj_3"] = {
      id: "proj_3",
      title: "React Native App Implementation",
      status: ProjectStatus.OPEN,
      skills: ["React Native", "React"],
      budget: 35000,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    };

    const req = new Request("http://localhost:3000/api/projects?skills=React&minBudget=20000&maxBudget=40000");
    const res = await listProjectsHandler(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.items.length).toBe(1);
    expect(data.items[0].id).toBe("proj_3");
  });
});
