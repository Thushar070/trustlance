import { Role, ConnectionStatus } from "@prisma/client";
import { POST as sendConnectionHandler } from "@/app/api/connections/route";
import { POST as respondConnectionHandler } from "@/app/api/connections/[id]/respond/route";
import { ProposalService } from "@/lib/services/proposal-service";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/get-server-session");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    connection: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    proposal: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Connections and Proposals Security & Gating Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Connection Gating & Authorization Bounds", () => {
    it("rejects unauthorized connection requests (401)", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const req = new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ targetUserId: "user_456" }),
      });
      const res = await sendConnectionHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects self-connection attempts", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      const req = new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ targetUserId: "user_123" }),
      });
      const res = await sendConnectionHandler(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain("yourself");
    });

    it("enforces a strict limit of 20 outgoing connection requests per hour (429)", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user_456" });
      (prisma.connection.count as jest.Mock).mockResolvedValue(20); // 20 requests already sent

      const req = new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ targetUserId: "user_456" }),
      });
      const res = await sendConnectionHandler(req);
      expect(res.status).toBe(429);
      const data = await res.json();
      expect(data.error).toContain("Rate limit exceeded");
    });

    it("rejects duplicate connection requests in either direction with Conflict status (409)", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "user_456" });
      (prisma.connection.count as jest.Mock).mockResolvedValue(5);
      (prisma.connection.findFirst as jest.Mock).mockResolvedValue({
        id: "conn_abc",
        requesterId: "user_123",
        addresseeId: "user_456",
        status: ConnectionStatus.PENDING,
      });

      const req = new Request("http://localhost/api/connections", {
        method: "POST",
        body: JSON.stringify({ targetUserId: "user_456" }),
      });
      const res = await sendConnectionHandler(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain("Conflict");
    });

    it("only permits the addressee to respond to a connection request (403)", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_not_authorized", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
        id: "conn_999",
        requesterId: "user_123",
        addresseeId: "user_456", // user_456 is the only authorized addressee
        status: ConnectionStatus.PENDING,
      });

      const req = new Request("http://localhost/api/connections/conn_999/respond", {
        method: "POST",
        body: JSON.stringify({ response: "ACCEPTED" }),
      });
      const params = Promise.resolve({ id: "conn_999" });
      const res = await respondConnectionHandler(req, { params });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Forbidden");
    });
  });

  describe("Proposal Submissions Rate Limiting Gating", () => {
    it("enforces a strict limit of 10 proposal applications per hour", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_111",
        status: "OPEN",
        budget: 5000,
      });
      (prisma.proposal.count as jest.Mock).mockResolvedValue(10); // 10 proposals already submitted

      await expect(
        ProposalService.submitProposal("free_123", "proj_111", {
          message: "My proposal description",
          estimatedDays: 5,
          price: 4500,
        })
      ).rejects.toThrow("Rate limit exceeded");
    });
  });
});
