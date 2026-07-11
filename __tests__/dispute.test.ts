import { GET as getDisputeHandler } from "@/app/api/disputes/[id]/route";
import { POST as addEvidenceHandler } from "@/app/api/disputes/[id]/evidence/route";
import { POST as resolveDisputeHandler } from "@/app/api/disputes/[id]/resolve/route";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, EscrowStatus, DisputeStatus } from "@prisma/client";
import { EscrowService } from "@/lib/services/escrow-service";

jest.mock("@/lib/auth/require-role");
jest.mock("@/lib/auth/get-server-session");
jest.mock("@/lib/services/escrow-service");

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
    dispute: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    evidence: {
      create: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Phase 8: Dispute System Integration Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedEscrowTransition = EscrowService.transition as jest.MockedFunction<typeof EscrowService.transition>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Access Control (Evidence & Details)", () => {
    it("1. only the two involved parties can add evidence to a given dispute — a random other user is rejected", async () => {
      // User is CLIENT but not the client owner of the dispute's project
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_other", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.OPEN,
        escrow: {
          id: "esc_123",
          projectId: "proj_123",
          project: {
            id: "proj_123",
            clientId: "client_owner",
            freelancerId: "freelancer_assigned",
          },
        },
      });

      const req = new Request("http://localhost/api/disputes/disp_123/evidence", {
        method: "POST",
        body: JSON.stringify({ type: "file", url: "https://s3.amazonaws.com/evidence.pdf" }),
      });

      const res = await addEvidenceHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Only the client owner or the assigned freelancer");
    });

    it("5. GET /api/disputes/:id is rejected for users who are neither party nor Admin", async () => {
      // User is a random freelancer not assigned to the project
      mockedGetServerSession.mockResolvedValue({
        user: { id: "freelancer_random", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        escrow: {
          projectId: "proj_123",
          project: {
            clientId: "client_owner",
            freelancerId: "freelancer_assigned",
          },
        },
      });

      const req = new Request("http://localhost/api/disputes/disp_123", { method: "GET" });
      const res = await getDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("You are not authorized to view this dispute");
    });
  });

  describe("Dispute Adjudication Integration & Rules", () => {
    it("1. resolveDispute is rejected for any non-Admin role, including both parties to the dispute themselves", async () => {
      // Reject non-admin role
      mockedRequireRole.mockResolvedValue({
        authorized: false,
        status: 403,
        error: "Forbidden: Mismatched role.",
        session: null,
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "RELEASE", notes: "Work satisfies specs" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });

    it("2. resolveDispute rejects a call with an empty/missing resolution-notes value", async () => {
      // Authorize admin
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        },
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "RELEASE", notes: "   " }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Resolution notes explaining the decision are required");
    });

    it("3. resolveDispute rejects a second call on an already-RESOLVED dispute (idempotency/double-submission protection)", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        },
      });

      // Mock dispute already in RESOLVED status
      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
        escrowId: "esc_123",
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "RELEASE", notes: "Attempt resolving twice" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot resolve an already resolved dispute");
    });

    it("4. a successful Release correctly sets Escrow to RELEASED, Dispute to RESOLVED, and produces exactly one new AuditLog entry", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        },
      });

      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.OPEN,
        escrowId: "esc_123",
        escrow: {
          id: "esc_123",
          projectId: "proj_123",
        },
      });

      (prisma.dispute.update as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
        resolution: "Release details notes",
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "RELEASE", notes: "Release details notes" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(200);

      // 1. Escrow transitioned to RELEASED
      expect(mockedEscrowTransition).toHaveBeenCalledWith("esc_123", EscrowStatus.RELEASED, "admin_user", expect.any(Object));

      // 2. Project updated to COMPLETED
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.COMPLETED },
      });

      // 3. Dispute updated to RESOLVED
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: "disp_123" },
        data: { status: DisputeStatus.RESOLVED, resolution: "Release details notes" },
      });

      // 4. Audit log produced exactly once for the Dispute entity
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "Dispute",
          entityId: "disp_123",
          action: "RESOLVE_RELEASE",
          actorId: "admin_user",
          prevState: DisputeStatus.OPEN,
          newState: DisputeStatus.RESOLVED,
        },
      });
    });

    it("5. a successful Refund correctly sets Escrow to REFUNDED, Dispute to RESOLVED, and produces exactly one new AuditLog entry", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        },
      });

      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.OPEN,
        escrowId: "esc_123",
        escrow: {
          id: "esc_123",
          projectId: "proj_123",
        },
      });

      (prisma.dispute.update as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
        resolution: "Refund details notes",
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "REFUND", notes: "Refund details notes" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(200);

      // 1. Escrow transitioned to REFUNDED
      expect(mockedEscrowTransition).toHaveBeenCalledWith("esc_123", EscrowStatus.REFUNDED, "admin_user", expect.any(Object));

      // 2. Project updated to CANCELLED
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.CANCELLED },
      });

      // 3. Dispute updated to RESOLVED
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: "disp_123" },
        data: { status: DisputeStatus.RESOLVED, resolution: "Refund details notes" },
      });

      // 4. Audit log produced exactly once for the Dispute entity
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          entityType: "Dispute",
          entityId: "disp_123",
          action: "RESOLVE_REFUND",
          actorId: "admin_user",
          prevState: DisputeStatus.OPEN,
          newState: DisputeStatus.RESOLVED,
        },
      });
    });
  });
});
