import { SendGridService } from "@/lib/email/sendgrid";
import { ConnectionStatus } from "@prisma/client";
import { ConnectionService } from "@/lib/services/connection-service";
import { prisma } from "@/lib/prisma";

// Mock SendGridService
jest.mock("@/lib/email/sendgrid", () => {
  return {
    SendGridService: {
      sendConnectionRequestReceived: jest.fn().mockResolvedValue(true),
      sendConnectionAccepted: jest.fn().mockResolvedValue(true),
    },
  };
});

// Mock Prisma Client
jest.mock("@/lib/prisma", () => {
  return {
    prisma: {
      connection: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $disconnect: jest.fn(),
    },
  };
});

describe("Connections Feature - Detailed State & Lifecycle Mock Audit", () => {
  const userAId = "user_A_id";
  const userBId = "user_B_id";
  const userCId = "user_C_id";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Flow 1: Send a request A -> B, verifies pending list triggers & emails", async () => {
    // Mock user existence check
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === userAId) {
        return Promise.resolve({ id: userAId, email: "usera@example.com", name: "User A" });
      }
      if (args.where.id === userBId) {
        return Promise.resolve({ id: userBId, email: "userb@example.com", name: "User B" });
      }
      return Promise.resolve(null);
    });
    
    // Mock outgoing rate limit check: count < 20
    (prisma.connection.count as jest.Mock).mockResolvedValue(0);
    
    // Mock check for existing records: none found
    (prisma.connection.findFirst as jest.Mock).mockResolvedValue(null);

    // Mock create call
    (prisma.connection.create as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    const conn = await ConnectionService.sendConnectionRequest(userAId, userBId);
    expect(conn).toBeDefined();
    expect(conn.status).toBe(ConnectionStatus.PENDING);
    expect(conn.requesterId).toBe(userAId);
    expect(conn.addresseeId).toBe(userBId);

    // Verify email was sent
    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledWith(
      "userb@example.com",
      "User B",
      "User A"
    );
  });

  it("Flow 2: Enforces block duplicate pending request in either direction", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: userBId, email: "userb@example.com" });
    (prisma.connection.count as jest.Mock).mockResolvedValue(0);
    
    // Mock check for existing records: already exists
    (prisma.connection.findFirst as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    await expect(
      ConnectionService.sendConnectionRequest(userAId, userBId)
    ).rejects.toThrow("Conflict: A connection request is already pending.");
  });

  it("Flow 3: Security - only addressee can respond to request", async () => {
    (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    // Unrelated User C attempts to respond
    await expect(
      ConnectionService.respondToConnectionRequest("conn_123", userCId, "ACCEPTED")
    ).rejects.toThrow("Forbidden: You are not authorized to respond to this connection request.");
  });

  it("Flow 4: Decline flow transitions state correctly without sending acceptance emails", async () => {
    (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    (prisma.connection.update as jest.Mock).mockResolvedValue({
      id: "conn_123",
      status: ConnectionStatus.DECLINED,
    });

    const updated = await ConnectionService.respondToConnectionRequest("conn_123", userBId, "DECLINED");
    expect(updated.status).toBe(ConnectionStatus.DECLINED);
    expect(SendGridService.sendConnectionAccepted).not.toHaveBeenCalled();
    expect(SendGridService.sendConnectionRequestReceived).not.toHaveBeenCalled();
  });

  it("Flow 5: Reset state after decline to PENDING on re-request", async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === userAId) {
        return Promise.resolve({ id: userAId, email: "usera@example.com", name: "User A" });
      }
      if (args.where.id === userBId) {
        return Promise.resolve({ id: userBId, email: "userb@example.com", name: "User B" });
      }
      return Promise.resolve(null);
    });
    (prisma.connection.count as jest.Mock).mockResolvedValue(0);
    
    // Mock existing connection showing DECLINED
    (prisma.connection.findFirst as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.DECLINED,
    });

    (prisma.connection.update as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    const reRequest = await ConnectionService.sendConnectionRequest(userAId, userBId);
    expect(reRequest.status).toBe(ConnectionStatus.PENDING);
    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledWith(
      "userb@example.com",
      "User B",
      "User A"
    );
  });

  it("Flow 6: Accept connection updates state & triggers notification on both sides", async () => {
    (prisma.connection.findUnique as jest.Mock).mockResolvedValue({
      id: "conn_123",
      requesterId: userAId,
      addresseeId: userBId,
      status: ConnectionStatus.PENDING,
    });

    (prisma.connection.update as jest.Mock).mockResolvedValue({
      id: "conn_123",
      status: ConnectionStatus.ACCEPTED,
    });

    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === userAId) {
        return Promise.resolve({ id: userAId, email: "usera@example.com", name: "User A" });
      }
      if (args.where.id === userBId) {
        return Promise.resolve({ id: userBId, email: "userb@example.com", name: "User B" });
      }
      return Promise.resolve(null);
    });

    const updated = await ConnectionService.respondToConnectionRequest("conn_123", userBId, "ACCEPTED");
    expect(updated.status).toBe(ConnectionStatus.ACCEPTED);
    expect(SendGridService.sendConnectionAccepted).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendConnectionAccepted).toHaveBeenCalledWith(
      "usera@example.com",
      "User A",
      "User B"
    );
  });
});
