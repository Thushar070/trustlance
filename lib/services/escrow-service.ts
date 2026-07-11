import { prisma } from "../prisma";
import { EscrowStatus, Prisma } from "@prisma/client";

const ALLOWED_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  [EscrowStatus.CREATED]: [EscrowStatus.HOLDING],
  [EscrowStatus.HOLDING]: [EscrowStatus.WORK_SUBMITTED],
  [EscrowStatus.WORK_SUBMITTED]: [EscrowStatus.UNDER_REVIEW],
  [EscrowStatus.UNDER_REVIEW]: [EscrowStatus.RELEASED, EscrowStatus.DISPUTED, EscrowStatus.HOLDING],
  [EscrowStatus.DISPUTED]: [EscrowStatus.RELEASED, EscrowStatus.REFUNDED],
  [EscrowStatus.RELEASED]: [],
  [EscrowStatus.REFUNDED]: [],
};

export class EscrowService {
  /**
   * Creates an Escrow record for a project in CREATED status if it doesn't already exist.
   */
  static async createEscrowForProject(projectId: string) {
    const existing = await prisma.escrow.findUnique({
      where: { projectId },
    });

    if (existing) {
      return existing;
    }

    return prisma.escrow.create({
      data: {
        projectId,
        status: EscrowStatus.CREATED,
      },
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
