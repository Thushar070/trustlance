import { ProjectService } from "@/lib/services/project-service";
import { ProposalService } from "@/lib/services/proposal-service";
import { PaymentService } from "@/lib/services/payment-service";
import { SubmissionService } from "@/lib/services/submission-service";
import { DisputeService } from "@/lib/services/dispute-service";
import { AuditService } from "@/lib/services/audit-service";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, EscrowStatus, DisputeStatus, PaymentStatus, ProposalStatus } from "@prisma/client";

// Setup logs collection array
let auditLogs: any[] = [];

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      create: jest.fn((args) => {
        return Promise.resolve({
          id: "proj_lifecycle",
          status: ProjectStatus.OPEN,
          budget: 5000,
          clientId: "client_user",
          ...args.data,
        });
      }),
      findUnique: jest.fn(() => Promise.resolve({
        id: "proj_lifecycle",
        status: ProjectStatus.ASSIGNED,
        budget: 5000,
        agreedAmount: 6000,
        clientId: "client_user",
        freelancerId: "freelancer_user",
        escrow: { id: "escrow_lifecycle", projectId: "proj_lifecycle", status: EscrowStatus.CREATED }
      })),
      update: jest.fn((args) => {
        return Promise.resolve({
          id: "proj_lifecycle",
          ...args.data,
        });
      }),
    },
    proposal: {
      findFirst: jest.fn(() => Promise.resolve({
        id: "prop_123",
        projectId: "proj_lifecycle",
        freelancerId: "freelancer_user",
        price: 6000,
        status: ProposalStatus.PENDING,
      })),
      findUnique: jest.fn(() => Promise.resolve({
        id: "prop_123",
        projectId: "proj_lifecycle",
        freelancerId: "freelancer_user",
        price: 6000,
        status: ProposalStatus.PENDING,
      })),
      update: jest.fn(() => Promise.resolve({})),
      updateMany: jest.fn(() => Promise.resolve({})),
    },
    escrow: {
      findUnique: jest.fn(() => Promise.resolve({
        id: "escrow_lifecycle",
        projectId: "proj_lifecycle",
        status: EscrowStatus.CREATED,
      })),
      create: jest.fn((args) => Promise.resolve({
        id: "escrow_lifecycle",
        status: EscrowStatus.CREATED,
        ...args.data,
      })),
      update: jest.fn((args) => Promise.resolve({
        id: "escrow_lifecycle",
        ...args.data,
      })),
    },
    payment: {
      upsert: jest.fn((args) => Promise.resolve({
        id: "pay_123",
        projectId: "proj_lifecycle",
        status: PaymentStatus.PENDING,
      })),
      update: jest.fn((args) => Promise.resolve({
        id: "pay_123",
        projectId: "proj_lifecycle",
        status: PaymentStatus.SUCCESS,
      })),
    },
    dispute: {
      create: jest.fn((args) => Promise.resolve({
        id: "disp_123",
        status: DisputeStatus.OPEN,
        ...args.data,
      })),
      findUnique: jest.fn(() => Promise.resolve({
        id: "disp_123",
        status: DisputeStatus.OPEN,
        escrow: {
          id: "escrow_lifecycle",
          projectId: "proj_lifecycle",
          project: {
            id: "proj_lifecycle",
            clientId: "client_user",
            freelancerId: "freelancer_user",
          }
        }
      })),
      update: jest.fn((args) => Promise.resolve({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
      })),
    },
    evidence: {
      create: jest.fn(() => Promise.resolve({})),
      count: jest.fn(() => Promise.resolve(0)),
    },
    submission: {
      create: jest.fn(() => Promise.resolve({})),
    },
    auditLog: {
      create: jest.fn((args) => {
        auditLogs.push(args.data);
        return Promise.resolve({ id: "log_" + auditLogs.length, ...args.data });
      }),
      findMany: jest.fn(() => Promise.resolve(auditLogs)),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

// Mock Razorpay instance
jest.mock("razorpay", () => {
  return jest.fn().mockImplementation(() => {
    return {
      orders: {
        create: jest.fn().mockResolvedValue({ id: "order_123", amount: 600000, currency: "INR" }),
      },
    };
  });
});

describe("Phase 9: Audit Logging Integration Tests", () => {
  beforeEach(() => {
    auditLogs = [];
    jest.clearAllMocks();
  });

  it("1. Full project lifecycle logs should correctly reconstruct state transitions with no gaps", async () => {
    // 1. Create project (Client)
    const project = await ProjectService.createProject("client_user", {
      title: "Lifecycle Project",
      description: "Lifecycle test description",
      budget: 5000,
      deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
      skills: ["React"],
    });

    // Mock project return values for subsequent steps
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...project,
      payment: null,
      escrow: null,
    });

    // 2. Select Freelancer (Client hiring Freelancer)
    await ProposalService.selectFreelancer("proj_lifecycle", "client_user", "freelancer_user");

    // Mock project state update to ASSIGNED
    const assignedProject = {
      ...project,
      status: ProjectStatus.ASSIGNED,
      freelancerId: "freelancer_user",
      agreedAmount: 6000,
      payment: null,
      escrow: null,
    };
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(assignedProject);

    // 3. Create Razorpay order (Client pay)
    await PaymentService.createOrder("proj_lifecycle", "client_user");

    // Mock payment state update to PENDING
    const payment = { id: "pay_123", projectId: "proj_lifecycle", status: PaymentStatus.PENDING };
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...assignedProject,
      payment,
    });

    // 4. Verify payment success (Simulating payment verification)
    await PaymentService.verifyPayment("order_123", "pay_success", "valid_sig", "client_user");

    // Mock payment SUCCESS and Escrow HOLDING
    const paymentSuccess = { ...payment, status: PaymentStatus.SUCCESS };
    const escrowHolding = { id: "escrow_lifecycle", projectId: "proj_lifecycle", status: EscrowStatus.HOLDING };
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...assignedProject,
      payment: paymentSuccess,
      escrow: escrowHolding,
    });

    // 5. Submit deliverables (Freelancer)
    await SubmissionService.submitWork("proj_lifecycle", "freelancer_user", {
      githubLink: "https://github.com/foo",
      notes: "First submission deliverables.",
    });

    // Mock project status transition to UNDER_REVIEW and Escrow UNDER_REVIEW
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...assignedProject,
      status: ProjectStatus.UNDER_REVIEW,
      payment: paymentSuccess,
      escrow: { ...escrowHolding, status: EscrowStatus.UNDER_REVIEW },
    });

    // 6. Request Changes (Client rejects)
    await ProjectService.requestChanges("proj_lifecycle", "client_user", "Please modify style.");

    // Mock project status back to IN_PROGRESS and Escrow back to HOLDING
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...assignedProject,
      status: ProjectStatus.IN_PROGRESS,
      payment: paymentSuccess,
      escrow: { ...escrowHolding, status: EscrowStatus.HOLDING },
    });

    // 7. Resubmit work (Freelancer resubmits)
    await SubmissionService.submitWork("proj_lifecycle", "freelancer_user", {
      githubLink: "https://github.com/foo",
      notes: "Revised submission deliverables.",
    });

    // Mock project status back to UNDER_REVIEW and Escrow back to UNDER_REVIEW
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...assignedProject,
      status: ProjectStatus.UNDER_REVIEW,
      payment: paymentSuccess,
      escrow: { ...escrowHolding, status: EscrowStatus.UNDER_REVIEW },
    });

    // 8. Approve work (Client completes project)
    await ProjectService.approve("proj_lifecycle", "client_user");

    // Assert that the resulting AuditLog entries exactly reconstruct the lifecycle timeline in chronological order
    expect(auditLogs.length).toBeGreaterThan(0);

    // Verify Project status progression
    const projectLogs = auditLogs.filter(log => log.entityType === "Project");
    expect(projectLogs[0].action).toBe("CREATE_PROJECT");
    expect(projectLogs[0].newState).toBe(ProjectStatus.OPEN);

    expect(projectLogs[1].action).toBe("TRANSITION_ASSIGNED");
    expect(projectLogs[1].prevState).toBe(ProjectStatus.OPEN);
    expect(projectLogs[1].newState).toBe(ProjectStatus.ASSIGNED);

    expect(projectLogs[2].action).toBe("TRANSITION_UNDER_REVIEW");
    expect(projectLogs[2].prevState).toBe(ProjectStatus.ASSIGNED);
    expect(projectLogs[2].newState).toBe(ProjectStatus.UNDER_REVIEW);

    expect(projectLogs[3].action).toBe("TRANSITION_IN_PROGRESS");
    expect(projectLogs[3].prevState).toBe(ProjectStatus.UNDER_REVIEW);
    expect(projectLogs[3].newState).toBe(ProjectStatus.IN_PROGRESS);

    expect(projectLogs[4].action).toBe("TRANSITION_UNDER_REVIEW");
    expect(projectLogs[4].prevState).toBe(ProjectStatus.IN_PROGRESS);
    expect(projectLogs[4].newState).toBe(ProjectStatus.UNDER_REVIEW);

    expect(projectLogs[5].action).toBe("TRANSITION_COMPLETED");
    expect(projectLogs[5].prevState).toBe(ProjectStatus.UNDER_REVIEW);
    expect(projectLogs[5].newState).toBe(ProjectStatus.COMPLETED);

    // Verify Escrow status progression
    const escrowLogs = auditLogs.filter(log => log.entityType === "Escrow");
    expect(escrowLogs[0].action).toBe("CREATE_ESCROW");
  });

  it("2. Dispute lifecycle logs should correctly reconstruct dispute escalation and resolution path", async () => {
    // Mock project setup
    const project = {
      id: "proj_dispute",
      status: ProjectStatus.UNDER_REVIEW,
      clientId: "client_user",
      freelancerId: "freelancer_user",
      payment: { id: "pay_123", status: PaymentStatus.SUCCESS },
      escrow: { id: "escrow_dispute", status: EscrowStatus.UNDER_REVIEW },
    };
    (prisma.project.findUnique as jest.Mock).mockResolvedValue(project);
    (prisma.escrow.findUnique as jest.Mock).mockResolvedValue(project.escrow);

    // 1. Raise Dispute (Client)
    await ProjectService.raiseDispute("proj_dispute", "client_user", "Freelancer did not follow requirements.");

    // Mock project after dispute raised
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      ...project,
      escrow: { id: "escrow_dispute", status: EscrowStatus.DISPUTED },
    });

    // 2. Add Evidence
    await DisputeService.addEvidence("disp_123", "client_user", "link", "https://evidence.link");

    // 3. Resolve Dispute (Admin RESOLVE to CLIENT -> REFUND)
    await DisputeService.resolveDispute("disp_123", "admin_user", "REFUND", "Refunding money to client.");

    // Assert that audit logs verify the dispute transitions
    const disputeLogs = auditLogs.filter(log => log.entityType === "Dispute");
    expect(disputeLogs[0].action).toBe("CREATE_DISPUTE");
    expect(disputeLogs[0].newState).toBe(DisputeStatus.OPEN);

    expect(disputeLogs[1].action).toBe("RESOLVE_REFUND");
    expect(disputeLogs[1].newState).toBe(DisputeStatus.RESOLVED);

    // Verify associated project transition during dispute resolution
    const projectLogs = auditLogs.filter(log => log.entityType === "Project" && log.action === "TRANSITION_CANCELLED");
    expect(projectLogs.length).toBe(1);
    expect(projectLogs[0].newState).toBe(ProjectStatus.CANCELLED);
  });

  it("3. getLogsForEntity is rejected for any non-Admin role", async () => {
    // Non-admin roles should throw
    await expect(AuditService.getLogsForEntity("Project", "proj_123", Role.CLIENT))
      .rejects.toThrow("Forbidden: Admin access only.");

    await expect(AuditService.getLogsForEntity("Project", "proj_123", Role.FREELANCER))
      .rejects.toThrow("Forbidden: Admin access only.");

    // Admin role should pass and call findMany
    const result = await AuditService.getLogsForEntity("Project", "proj_123", Role.ADMIN);
    expect(result).toBeDefined();
    expect(prisma.auditLog.findMany).toHaveBeenCalled();
  });
});
