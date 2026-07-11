import { prisma } from "../prisma";
import { Role } from "@prisma/client";

export class AuditService {
  /**
   * Retrieves chronological audit logs for a specific entity. Gated to ADMIN role.
   */
  static async getLogsForEntity(entityType: string, entityId: string, userRole: Role) {
    if (userRole !== Role.ADMIN) {
      throw new Error("Forbidden: Admin access only.");
    }

    return prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  }
}
