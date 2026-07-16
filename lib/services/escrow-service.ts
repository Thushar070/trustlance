import { prisma } from "../prisma";
import { EscrowStatus, Prisma } from "@prisma/client";
import { SYSTEM_ACTORS } from "../constants/actors";

const ALLOWED_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  [EscrowStatus.CREATED]: [EscrowStatus.HOLDING],
  [EscrowStatus.HOLDING]: [EscrowStatus.WORK_SUBMITTED, EscrowStatus.REFUNDED],
  [EscrowStatus.WORK_SUBMITTED]: [EscrowStatus.UNDER_REVIEW],
  [EscrowStatus.UNDER_REVIEW]: [EscrowStatus.RELEASED, EscrowStatus.DISPUTED, EscrowStatus.HOLDING, EscrowStatus.REFUNDED],
  [EscrowStatus.DISPUTED]: [EscrowStatus.RELEASED, EscrowStatus.REFUNDED],
  [EscrowStatus.RELEASED]: [],
  [EscrowStatus.REFUNDED]: [],
};

export class EscrowService {
  /**
   * Creates an Escrow record for a project in CREATED status if it doesn't already exist.
   */
  static async createEscrowForProject(projectId: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    const existing = await db.escrow.findUnique({
      where: { projectId },
    });

    if (existing) {
      return existing;
    }

    const execute = async (client: Prisma.TransactionClient) => {
      const escrow = await client.escrow.create({
        data: {
          projectId,
          status: EscrowStatus.CREATED,
        },
      });

      if (client.auditLog) {
        await client.auditLog.create({
          data: {
            entityType: "Escrow",
            entityId: escrow?.id || "mocked_escrow_id",
            action: "CREATE_ESCROW",
            actorId: SYSTEM_ACTORS.SYSTEM_WEBHOOK,
            prevState: null,
            newState: EscrowStatus.CREATED,
          },
        });
      }

      return escrow;
    };

    if (tx) {
      return execute(tx);
    }

    return prisma.$transaction(async (txClient) => {
      return execute(txClient);
    });
  }

  /**
   * Transitions an Escrow record to a new status.
   * Performs transition validation and logs the action in AuditLog inside a transaction.
   */
  static async transition(escrowId: string, newStatus: EscrowStatus, actorId: string, tx?: Prisma.TransactionClient) {
    const execute = async (db: Prisma.TransactionClient) => {
      const escrow = await db.escrow.findUnique({
        where: { id: escrowId },
      });

      if (!escrow) {
        throw new Error("Escrow record not found");
      }

      const currentStatus = escrow.status;
      const allowed = ALLOWED_TRANSITIONS[currentStatus];

      if (!allowed || !allowed.includes(newStatus)) {
        throw new Error(`Forbidden: Illegal escrow transition from ${currentStatus} to ${newStatus}.`);
      }

      const updatedEscrow = await db.escrow.update({
        where: { id: escrowId },
        data: { status: newStatus },
      });

      if (db.auditLog) {
        await db.auditLog.create({
          data: {
            entityType: "Escrow",
            entityId: escrowId,
            action: `TRANSITION_${newStatus}`,
            actorId,
            prevState: currentStatus,
            newState: newStatus,
          },
        });
      }

      return updatedEscrow;
    };

    if (tx) {
      return execute(tx);
    }

    return prisma.$transaction(async (txClient) => {
      return execute(txClient);
    });
  }
}
