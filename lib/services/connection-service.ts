import { prisma } from "../prisma";
import { ConnectionStatus } from "@prisma/client";
import { NotificationService } from "./notification-service";

export class ConnectionService {
  /**
   * Sends a connection request from requesterId to addresseeId.
   * Outgoing rate limit: max 20 connection requests per hour.
   * Merge logic:
   * - Reject duplicate pending/accepted requests in either direction.
   * - A requesting B when B already requested A surfaces as "respond to their existing request"
   */
  static async sendConnectionRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) {
      throw new Error("Validation failed: You cannot send a connection request to yourself.");
    }

    // Verify target user exists
    const addresseeUser = await prisma.user.findUnique({
      where: { id: addresseeId },
    });
    if (!addresseeUser) {
      throw new Error("User not found.");
    }

    // Outgoing rate limit check: max 20 per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyRequestCount = await prisma.connection.count({
      where: {
        requesterId,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyRequestCount >= 20) {
      throw new Error("Rate limit exceeded: Maximum of 20 connection requests per hour.");
    }

    // Check existing connection record in either direction
    const existing = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === ConnectionStatus.ACCEPTED) {
        throw new Error("Conflict: You are already connected with this user.");
      }

      if (existing.status === ConnectionStatus.PENDING) {
        if (existing.requesterId === requesterId) {
          throw new Error("Conflict: A connection request is already pending.");
        } else {
          // B already requested A. A trying to request B should respond to B's request.
          throw new Error("Conflict: This user has already sent you a request. Please respond to their existing request.");
        }
      }

      // If status is DECLINED, allow re-requesting by resetting state to PENDING
      const updated = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          requesterId,
          addresseeId,
          status: ConnectionStatus.PENDING,
          createdAt: new Date(),
          respondedAt: null,
        },
      });

      // Send incoming request email notification
      await NotificationService.notify("CONNECTION_REQUEST_RECEIVED", {
        requesterId,
        addresseeId,
      });

      return updated;
    }

    // Create fresh connection request
    const conn = await prisma.connection.create({
      data: {
        requesterId,
        addresseeId,
        status: ConnectionStatus.PENDING,
      },
    });

    // Send incoming request email notification
    await NotificationService.notify("CONNECTION_REQUEST_RECEIVED", {
      requesterId,
      addresseeId,
    });

    return conn;
  }

  /**
   * Responds to a connection request. Only the addressee can respond.
   */
  static async respondToConnectionRequest(
    connectionId: string,
    addresseeId: string,
    response: "ACCEPTED" | "DECLINED"
  ) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error("Connection request not found.");
    }

    if (connection.addresseeId !== addresseeId) {
      throw new Error("Forbidden: You are not authorized to respond to this connection request.");
    }

    if (connection.status !== ConnectionStatus.PENDING) {
      throw new Error("Conflict: This connection request has already been resolved.");
    }

    const updated = await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: response as ConnectionStatus,
        respondedAt: new Date(),
      },
    });

    // Send connection acceptance email notification
    if (response === "ACCEPTED") {
      await NotificationService.notify("CONNECTION_ACCEPTED", {
        requesterId: connection.requesterId,
        addresseeId: connection.addresseeId,
      });
    }

    return updated;
  }

  /**
   * Lists all accepted connections for a user.
   */
  static async listConnectionsForUser(userId: string) {
    const connections = await prisma.connection.findMany({
      where: {
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
    });

    const list = await Promise.all(
      connections.map(async (c) => {
        const otherId = c.requesterId === userId ? c.addresseeId : c.requesterId;
        const other = await prisma.user.findUnique({
          where: { id: otherId },
          select: {
            id: true,
            name: true,
            role: true,
            businessName: true,
            location: true,
            bio: true,
          },
        });
        return {
          connectionId: c.id,
          connectedAt: c.respondedAt || c.createdAt,
          user: other,
        };
      })
    );

    return list.filter((item) => item.user !== null);
  }

  /**
   * Lists incoming pending connection requests for a user.
   */
  static async listPendingRequestsForUser(userId: string) {
    const incoming = await prisma.connection.findMany({
      where: {
        addresseeId: userId,
        status: ConnectionStatus.PENDING,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const list = await Promise.all(
      incoming.map(async (c) => {
        const requester = await prisma.user.findUnique({
          where: { id: c.requesterId },
          select: {
            id: true,
            name: true,
            role: true,
            businessName: true,
            location: true,
            bio: true,
          },
        });
        return {
          connectionId: c.id,
          createdAt: c.createdAt,
          requester,
        };
      })
    );

    return list.filter((item) => item.requester !== null);
  }

  /**
   * Gets connection status between two users.
   */
  static async getConnectionStatus(userIdA: string, userIdB: string) {
    const conn = await prisma.connection.findFirst({
      where: {
        OR: [
          { requesterId: userIdA, addresseeId: userIdB },
          { requesterId: userIdB, addresseeId: userIdA },
        ],
      },
    });

    if (!conn) return { status: "NONE", id: null, requesterId: null };
    return {
      status: conn.status,
      id: conn.id,
      requesterId: conn.requesterId,
    };
  }
}

export class ReportService {
  /**
   * Submits a report against a user.
   */
  static async submitReport(reporterId: string, reportedUserId: string, reason: string) {
    if (reporterId === reportedUserId) {
      throw new Error("Conflict: You cannot report yourself.");
    }

    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
    });
    if (!reportedUser) {
      throw new Error("User not found.");
    }

    if (!reason.trim()) {
      throw new Error("Validation failed: A report reason is required.");
    }

    return prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason,
      },
    });
  }

  /**
   * Lists all flagged reports (Admin only).
   */
  static async listReports() {
    const reports = await prisma.report.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return Promise.all(
      reports.map(async (r) => {
        const reporter = await prisma.user.findUnique({
          where: { id: r.reporterId },
          select: { name: true, role: true },
        });
        const reported = await prisma.user.findUnique({
          where: { id: r.reportedUserId },
          select: { name: true, role: true },
        });
        return {
          id: r.id,
          reason: r.reason,
          createdAt: r.createdAt,
          reporterId: r.reporterId,
          reporterName: reporter?.name || "Deleted User",
          reporterRole: reporter?.role || "USER",
          reportedUserId: r.reportedUserId,
          reportedName: reported?.name || "Deleted User",
          reportedRole: reported?.role || "USER",
        };
      })
    );
  }
}
