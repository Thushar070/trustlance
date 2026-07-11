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

  describe("Dispute Resolution & Role Gates", () => {
    it("2. only Admin can call resolve, and a non-admin (including the two involved parties) is rejected", async () => {
      // Reject non-admin (e.g. CLIENT owner)
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

    it("3. resolving correctly transitions Escrow to RELEASED or REFUNDED and sets Dispute.status to RESOLVED", async () => {
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

      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        escrowId: "esc_123",
        status: DisputeStatus.OPEN,
        escrow: {
          id: "esc_123",
          projectId: "proj_123",
        },
      });

      (prisma.dispute.update as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
        resolution: "Client deserves full refund",
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "REFUND", notes: "Client deserves full refund" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(200);

      // Verify escrow-service transition call
      expect(mockedEscrowTransition).toHaveBeenCalledWith("esc_123", EscrowStatus.REFUNDED, "admin_user");

      // Verify project status updated to CANCELLED (on refund resolution)
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.CANCELLED },
      });

      // Verify dispute record updated
      expect(prisma.dispute.update).toHaveBeenCalledWith({
        where: { id: "disp_123" },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: "Client deserves full refund",
        },
      });
    });

    it("4. a resolved dispute cannot be resolved again — calling resolve twice on the same dispute fails", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        },
      });

      // Dispute is already RESOLVED
      (prisma.dispute.findUnique as jest.Mock).mockResolvedValue({
        id: "disp_123",
        status: DisputeStatus.RESOLVED,
        escrowId: "esc_123",
      });

      const req = new Request("http://localhost/api/disputes/disp_123/resolve", {
        method: "POST",
        body: JSON.stringify({ resolution: "RELEASE", notes: "Secondary resolve attempt" }),
      });

      const res = await resolveDisputeHandler(req, { params: Promise.resolve({ id: "disp_123" }) });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("Cannot resolve an already resolved dispute");
    });
  });
});
