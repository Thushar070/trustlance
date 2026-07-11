import { POST as approveHandler } from "@/app/api/projects/[id]/approve/route";
import { POST as requestChangesHandler } from "@/app/api/projects/[id]/request-changes/route";
import { POST as disputeHandler } from "@/app/api/projects/[id]/dispute/route";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, EscrowStatus } from "@prisma/client";

jest.mock("@/lib/auth/require-role");
jest.mock("@/lib/auth/get-server-session");

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    submission: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    dispute: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Phase 7: Project Review Integration Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Gating & Role Guards", () => {
    it("only project client owner can approve or request changes", async () => {
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
        id: "proj_123",
        clientId: "client_owner",
        status: ProjectStatus.UNDER_REVIEW,
      });

      const reqApprove = new Request("http://localhost/api/projects/proj_123/approve", { method: "POST" });
      const resApprove = await approveHandler(reqApprove, { params: Promise.resolve({ id: "proj_123" }) });
      expect(resApprove.status).toBe(403);
      const approveData = await resApprove.json();
      expect(approveData.error).toContain("You do not own this project");

      const reqChanges = new Request("http://localhost/api/projects/proj_123/request-changes", {
        method: "POST",
        body: JSON.stringify({ feedback: "Needs changes" }),
      });
      const resChanges = await requestChangesHandler(reqChanges, { params: Promise.resolve({ id: "proj_123" }) });
      expect(resChanges.status).toBe(403);
      const changesData = await resChanges.json();
      expect(changesData.error).toContain("You do not own this project");
    });

    it("only client or freelancer can raise a dispute — third party is rejected", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_third_party", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_owner",
        freelancerId: "freelancer_assigned",
        status: ProjectStatus.UNDER_REVIEW,
      });

      const req = new Request("http://localhost/api/projects/proj_123/dispute", {
        method: "POST",
        body: JSON.stringify({ reason: "Unresolved dispute" }),
      });

      const res = await disputeHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Only the client owner or the assigned freelancer");
    });
  });

  describe("Review & Escrow Transition Logic", () => {
    it("approve transitions escrow to RELEASED, project to COMPLETED, and is proven final (irreversible)", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_owner", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_owner",
        status: ProjectStatus.UNDER_REVIEW,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.UNDER_REVIEW,
        },
      });

      (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
        id: "esc_123",
        status: EscrowStatus.UNDER_REVIEW,
      });

      const req = new Request("http://localhost/api/projects/proj_123/approve", { method: "POST" });
      const res = await approveHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(200);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.COMPLETED },
      });

      expect(prisma.escrow.update).toHaveBeenCalledWith({
        where: { id: "esc_123" },
        data: { status: EscrowStatus.RELEASED },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Project",
          entityId: "proj_123",
          action: "TRANSITION_COMPLETED",
          actorId: "client_owner",
          prevState: ProjectStatus.UNDER_REVIEW,
          newState: ProjectStatus.COMPLETED,
        }),
      }));

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Escrow",
          entityId: "esc_123",
          action: "TRANSITION_RELEASED",
          actorId: "client_owner",
          prevState: "UNDER_REVIEW",
          newState: "RELEASED",
        }),
      }));

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_owner",
        status: ProjectStatus.COMPLETED,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.RELEASED,
        },
      });

      const resSecond = await approveHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(resSecond.status).toBe(403);
      const secondData = await resSecond.json();
      expect(secondData.error).toContain("Cannot approve project in COMPLETED status");
    });

    it("request-changes reverts project status to IN_PROGRESS, sets feedback on latest submission", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "client_owner", role: Role.CLIENT },
          expires: "2026-12-31",
        },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_owner",
        status: ProjectStatus.UNDER_REVIEW,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.UNDER_REVIEW,
        },
      });

      (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
        id: "esc_123",
        status: EscrowStatus.UNDER_REVIEW,
      });

      (prisma.submission.findFirst as jest.Mock).mockResolvedValue({
        id: "sub_456",
        projectId: "proj_123",
      });

      const req = new Request("http://localhost/api/projects/proj_123/request-changes", {
        method: "POST",
        body: JSON.stringify({ feedback: "Change text details" }),
      });

      const res = await requestChangesHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(200);

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      expect(prisma.escrow.update).toHaveBeenCalledWith({
        where: { id: "esc_123" },
        data: { status: EscrowStatus.HOLDING },
      });

      expect(prisma.submission.update).toHaveBeenCalledWith({
        where: { id: "sub_456" },
        data: { feedback: "Change text details" },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Project",
          entityId: "proj_123",
          action: "TRANSITION_IN_PROGRESS",
          actorId: "client_owner",
          prevState: ProjectStatus.UNDER_REVIEW,
          newState: ProjectStatus.IN_PROGRESS,
        }),
      }));
    });

    it("raising a dispute transitions escrow to DISPUTED, inserts Dispute record, and gating verified", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "freelancer_assigned", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_owner",
        freelancerId: "freelancer_assigned",
        status: ProjectStatus.UNDER_REVIEW,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.UNDER_REVIEW,
        },
      });

      (prisma.escrow.findUnique as jest.Mock).mockResolvedValue({
        id: "esc_123",
        status: EscrowStatus.UNDER_REVIEW,
      });

      const req = new Request("http://localhost/api/projects/proj_123/dispute", {
        method: "POST",
        body: JSON.stringify({ reason: "Disputed project specifications" }),
      });

      const res = await disputeHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(200);

      expect(prisma.dispute.create).toHaveBeenCalledWith({
        data: {
          escrowId: "esc_123",
          raisedBy: "freelancer_assigned",
          reason: "Disputed project specifications",
          status: "OPEN",
        },
      });

      expect(prisma.escrow.update).toHaveBeenCalledWith({
        where: { id: "esc_123" },
        data: { status: EscrowStatus.DISPUTED },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Escrow",
          entityId: "esc_123",
          action: "TRANSITION_DISPUTED",
          actorId: "freelancer_assigned",
          prevState: "UNDER_REVIEW",
          newState: "DISPUTED",
        }),
      }));
    });
  });
});
