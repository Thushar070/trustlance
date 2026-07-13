import { NotificationService } from "@/lib/services/notification-service";
import { Mailer } from "@/lib/notifications/mailer";
import { ProposalService } from "@/lib/services/proposal-service";
import { ProjectService } from "@/lib/services/project-service";
import { SubmissionService } from "@/lib/services/submission-service";
import { DisputeService } from "@/lib/services/dispute-service";
import { POST as webhookHandler } from "@/app/api/webhooks/razorpay/route";
import { createHmac } from "crypto";
import { ProjectStatus, EscrowStatus, DisputeStatus, PaymentStatus } from "@prisma/client";

// Mock Mailer
jest.mock("@/lib/notifications/mailer", () => {
  return {
    Mailer: {
      sendEmail: jest.fn().mockResolvedValue(true),
    },
  };
});

// Setup mock database tables in-memory
let mockProjectDb: Record<string, Record<string, unknown>> = {};
let mockProposalDb: Record<string, Record<string, unknown>> = {};
let mockPaymentDb: Record<string, Record<string, unknown>> = {};
let mockEscrowDb: Record<string, Record<string, unknown>> = {};
let mockDisputeDb: Record<string, Record<string, unknown>> = {};

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
          client: { id: project.clientId, email: `${project.clientId}@test.com` },
          freelancer: project.freelancerId
            ? { id: project.freelancerId, email: `${project.freelancerId}@test.com` }
            : null,
          escrow: Object.values(mockEscrowDb).find((e) => e.projectId === project.id) || null,
          payment: Object.values(mockPaymentDb).find((p) => p.projectId === project.id) || null,
        };
      }),
      create: jest.fn((args) => {
        const id = args.data.id || "proj_lifecycle";
        const project = {
          id,
          title: args.data.title,
          description: args.data.description,
          budget: args.data.budget,
          status: ProjectStatus.OPEN,
          clientId: args.data.clientId,
          freelancerId: null,
          agreedAmount: null,
          escrowId: null,
          paymentId: null,
        };
        mockProjectDb[id] = project;
        return project;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        const current = mockProjectDb[id];
        if (current) {
          if (args.data.status) current.status = args.data.status;
          if (args.data.freelancerId) current.freelancerId = args.data.freelancerId;
          if (args.data.agreedAmount) current.agreedAmount = args.data.agreedAmount;
          if (args.data.escrowId) current.escrowId = args.data.escrowId;
          if (args.data.paymentId) current.paymentId = args.data.paymentId;
        }
        return current;
      }),
    },
    proposal: {
      findFirst: jest.fn((args) => {
        const projectId = args.where.projectId;
        const freelancerId = args.where.freelancerId;
        return Object.values(mockProposalDb).find(
          (p) => (p as Record<string, unknown>).projectId === projectId && (p as Record<string, unknown>).freelancerId === freelancerId
        ) || null;
      }),
      create: jest.fn((args) => {
        const id = "prop_123";
        const prop = {
          id,
          projectId: args.data.projectId,
          freelancerId: args.data.freelancerId,
          price: args.data.price,
          status: "PENDING",
        };
        mockProposalDb[id] = prop;
        return prop;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockProposalDb[id]) {
          mockProposalDb[id].status = args.data.status;
        }
        return mockProposalDb[id];
      }),
      updateMany: jest.fn((args) => {
        const projectId = args.where.projectId;
        const acceptId = args.where.id?.not;
        Object.values(mockProposalDb).forEach((p) => {
          if (p.projectId === projectId && p.id !== acceptId) {
            p.status = "REJECTED";
          }
        });
        return { count: 1 };
      }),
    },
    payment: {
      findFirst: jest.fn((args) => {
        const orderId = args.where.razorpayOrderId;
        return Object.values(mockPaymentDb).find((p) => p.razorpayOrderId === orderId) || null;
      }),
      findUnique: jest.fn((args) => {
        const id = args.where.id;
        const p = mockPaymentDb[id];
        if (!p) return null;
        return {
          ...p,
          project: {
            id: p.projectId,
            escrow: mockEscrowDb[mockProjectDb[p.projectId]?.escrowId] || null,
          },
        };
      }),
      create: jest.fn((args) => {
        const id = args.data.id || "pay_lifecycle";
        const payment = {
          id,
          projectId: args.data.projectId,
          razorpayOrderId: args.data.razorpayOrderId,
          razorpayPaymentId: args.data.razorpayPaymentId || null,
          amount: args.data.amount,
          status: PaymentStatus.PENDING,
        };
        mockPaymentDb[id] = payment;
        mockProjectDb[args.data.projectId].paymentId = id;
        return payment;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockPaymentDb[id]) {
          if (args.data.status) mockPaymentDb[id].status = args.data.status;
          if (args.data.razorpayPaymentId) mockPaymentDb[id].razorpayPaymentId = args.data.razorpayPaymentId;
        }
        return mockPaymentDb[id];
      }),
    },
    escrow: {
      findUnique: jest.fn((args) => {
        const id = args.where.id || (args.where.projectId ? (Object.values(mockEscrowDb).find((e) => e.projectId === args.where.projectId) as Record<string, unknown> | undefined)?.id : null);
        return mockEscrowDb[id] || null;
      }),
      create: jest.fn((args) => {
        const id = args.data.id || "escrow_lifecycle";
        const escrow = {
          id,
          projectId: args.data.projectId,
          status: args.data.status || EscrowStatus.CREATED,
        };
        mockEscrowDb[id] = escrow;
        mockProjectDb[args.data.projectId].escrowId = id;
        return escrow;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockEscrowDb[id]) {
          if (args.data.status) mockEscrowDb[id].status = args.data.status;
        }
        return mockEscrowDb[id];
      }),
    },
    submission: {
      create: jest.fn((args) => {
        const sub = {
          id: "sub_123",
          projectId: args.data.projectId,
          fileUrl: args.data.fileUrl,
        };
        return sub;
      }),
      findFirst: jest.fn(() => ({ id: "sub_123", feedback: "" })),
      update: jest.fn(),
    },
    dispute: {
      findUnique: jest.fn((args) => {
        const id = args.where.id;
        const dispute = mockDisputeDb[id];
        if (!dispute) return null;
        return {
          ...dispute,
          escrow: mockEscrowDb[dispute.escrowId],
        };
      }),
      create: jest.fn((args) => {
        const id = "dispute_lifecycle";
        const dispute = {
          id,
          escrowId: args.data.escrowId,
          raisedBy: args.data.raisedBy,
          reason: args.data.reason,
          status: DisputeStatus.PENDING,
        };
        mockDisputeDb[id] = dispute;
        return dispute;
      }),
      update: jest.fn((args) => {
        const id = args.where.id;
        if (mockDisputeDb[id]) {
          mockDisputeDb[id].status = args.data.status;
          mockDisputeDb[id].resolution = args.data.resolution;
        }
        return mockDisputeDb[id];
      }),
    },
    user: {
      findMany: jest.fn(() => [{ email: "admin@test.com" }]),
    },
    webhookEvent: {
      create: jest.fn().mockResolvedValue({ id: "evt_lifecycle" }),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Phase 10: Email Notification Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProjectDb = {};
    mockProposalDb = {};
    mockPaymentDb = {};
    mockEscrowDb = {};
    mockDisputeDb = {};
  });

  it("1. notify() is called with the correct event name and payload for the PAYMENT_RECEIVED trigger", async () => {
    mockProjectDb["proj_123"] = {
      id: "proj_123",
      title: "Test Payment Title",
      clientId: "client_user",
      freelancerId: "freelancer_user",
    };

    await NotificationService.notify("PAYMENT_RECEIVED", { projectId: "proj_123" });

    // Payment received notifies both Client and Freelancer
    expect(Mailer.sendEmail).toHaveBeenCalledTimes(2);
    expect(Mailer.sendEmail).toHaveBeenCalledWith("client_user@test.com", expect.stringContaining("Payment received"), expect.any(String));
    expect(Mailer.sendEmail).toHaveBeenCalledWith("freelancer_user@test.com", expect.stringContaining("Payment received"), expect.any(String));
  });

  it("2. notify() is called correctly for the DISPUTE_RAISED trigger", async () => {
    mockProjectDb["proj_123"] = {
      id: "proj_123",
      title: "Test Dispute Title",
      clientId: "client_user",
      freelancerId: "freelancer_user",
    };

    await NotificationService.notify("DISPUTE_RAISED", {
      projectId: "proj_123",
      reason: "Deliverables are poor quality",
    });

    // Dispute raised notifies Client, Freelancer, and all platform Admins
    expect(Mailer.sendEmail).toHaveBeenCalledTimes(3);
    expect(Mailer.sendEmail).toHaveBeenCalledWith("client_user@test.com", expect.stringContaining("Dispute raised"), expect.stringContaining("poor quality"));
    expect(Mailer.sendEmail).toHaveBeenCalledWith("freelancer_user@test.com", expect.stringContaining("Dispute raised"), expect.stringContaining("poor quality"));
    expect(Mailer.sendEmail).toHaveBeenCalledWith(["admin@test.com"], expect.stringContaining("Dispute raised"), expect.stringContaining("poor quality"));
  });

  it("3. A mailer failure (mocked to throw) does not propagate and does not prevent underlying operations", async () => {
    mockProjectDb["proj_123"] = {
      id: "proj_123",
      title: "Test Approve Title",
      clientId: "client_user",
      freelancerId: "freelancer_user",
      status: ProjectStatus.UNDER_REVIEW,
      escrowId: "escrow_123",
    };
    mockEscrowDb["escrow_123"] = {
      id: "escrow_123",
      projectId: "proj_123",
      status: EscrowStatus.UNDER_REVIEW,
    };

    // Make Mailer throw
    (Mailer.sendEmail as jest.Mock).mockRejectedValueOnce(new Error("SMTP failure"));

    // Approve the work
    const result = await ProjectService.approve("proj_123", "client_user");

    // The approve logic transitions the Project and Escrow, and triggers notify("PAYMENT_RELEASED")
    // Verify that the approval completed successfully despite SMTP throwing
    expect(result.success).toBe(true);
    expect(mockProjectDb["proj_123"].status).toBe(ProjectStatus.COMPLETED);
    expect(mockEscrowDb["escrow_123"].status).toBe(EscrowStatus.RELEASED);
  });

  it("4. Integration: triggering each of the 8 events in a full lifecycle results in exactly 8 notify calls", async () => {
    // Spy on notify to count calls
    const notifySpy = jest.spyOn(NotificationService, "notify");

    // 1. Create project
    await ProjectService.createProject("client_user", {
      title: "Lifecycle Project",
      description: "Lifecycle test description",
      budget: 5000,
      deadline: new Date(Date.now() + 86400000).toISOString(),
      skills: ["React"],
    });

    // 2. Select Freelancer (Triggers 1: FREELANCER_ASSIGNED)
    mockProposalDb["prop_123"] = {
      id: "prop_123",
      projectId: "proj_lifecycle",
      freelancerId: "freelancer_user",
      status: "PENDING",
    };
    await ProposalService.selectFreelancer("proj_lifecycle", "client_user", "freelancer_user");

    // 3. Webhook payment.captured (Triggers 2: PAYMENT_RECEIVED)
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret";
    const bodyStr = JSON.stringify({
      id: "evt_captured_lifecycle",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_captured_123",
            order_id: "order_123",
            status: "captured",
            amount: 500000,
          },
        },
      },
    });
    mockPaymentDb["pay_lifecycle"] = {
      id: "pay_lifecycle",
      projectId: "proj_lifecycle",
      razorpayOrderId: "order_123",
      amount: 5000,
      status: PaymentStatus.PENDING,
    };

    const webhookHeaders = new Headers();
    const sig = createHmac("sha256", "test_secret")
      .update(bodyStr)
      .digest("hex");
    webhookHeaders.set("x-razorpay-signature", sig);

    const req = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: webhookHeaders,
      body: bodyStr,
    });
    await webhookHandler(req);

    // 4. Submit deliverables (Triggers 3: WORK_SUBMITTED)
    await SubmissionService.submitWork("proj_lifecycle", "freelancer_user", {
      githubLink: "https://github.com/foo",
    });

    // 5. Request Changes (Triggers 4: CHANGES_REQUESTED)
    await ProjectService.requestChanges("proj_lifecycle", "client_user", "Please modify design.");

    // 6. Resubmit deliverables (Triggers 5: WORK_SUBMITTED)
    await SubmissionService.submitWork("proj_lifecycle", "freelancer_user", {
      githubLink: "https://github.com/foo",
    });

    // 7. Raise Dispute (Triggers 6: DISPUTE_RAISED)
    await ProjectService.raiseDispute("proj_lifecycle", "client_user", "Disagree on changes.");

    // 8. Resolve Dispute via RELEASE (Triggers 7: DISPUTE_RESOLVED and 8: PAYMENT_RELEASED)
    await DisputeService.resolveDispute("dispute_lifecycle", "admin_user", "RELEASE", "Decided to pay freelancer.");

    // Verify notify calls
    const eventSequence = notifySpy.mock.calls.map((c) => c[0]);
    expect(notifySpy).toHaveBeenCalledTimes(8);
    expect(eventSequence).toEqual([
      "FREELANCER_ASSIGNED",
      "PAYMENT_RECEIVED",
      "WORK_SUBMITTED",
      "CHANGES_REQUESTED",
      "WORK_SUBMITTED",
      "DISPUTE_RAISED",
      "DISPUTE_RESOLVED",
      "PAYMENT_RELEASED",
    ]);

    notifySpy.mockRestore();
  });
});


