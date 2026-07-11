import { prisma } from "../prisma";
import { DisputeStatus, EscrowStatus, ProjectStatus, Prisma } from "@prisma/client";
import { EscrowService } from "./escrow-service";

export class DisputeService {
  /**
   * Creates a Dispute record for a project's escrow.
   */
  static async createDispute(escrowId: string, raisedBy: string, reason: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.dispute.create({
      data: {
        escrowId,
        raisedBy,
        reason,
        status: DisputeStatus.OPEN,
      },
    });
  }

  /**
   * Adds evidence files or links to an active dispute.
   * Gated to only the client owner or the assigned freelancer.
   * Enforces a maximum limit of 10 evidence items per party per dispute.
   */
  static async addEvidence(disputeId: string, userId: string, type: string, url: string) {
    if (!url || url.trim() === "") {
      throw new Error("Evidence URL/link is required.");
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        escrow: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!dispute) {
      throw new Error("Dispute not found");
    }

    if (dispute.status === DisputeStatus.RESOLVED) {
      throw new Error("Forbidden: Cannot add evidence to a resolved dispute.");
    }

    const project = dispute.escrow?.project;
    if (!project) {
      throw new Error("Project not found for this dispute.");
    }

    if (project.clientId !== userId && project.freelancerId !== userId) {
      throw new Error("Forbidden: Only the client owner or the assigned freelancer can upload evidence.");
    }

    // Enforce 10 evidence items limit per party
    const count = await prisma.evidence.count({
      where: {
        disputeId,
        userId,
      },
    });

    if (count >= 10) {
      throw new Error("Maximum evidence limit of 10 items reached for this party.");
    }

    return prisma.evidence.create({
      data: {
        disputeId,
        userId,
        type,
        url,
      },
    });
  }

  /**
   * Resolves an open dispute by releasing to freelancer or refunding to client.
   * Transitions associated escrow status, updates project status, records notes, and logs to AuditLog.
   */
  static async resolveDispute(disputeId: string, adminId: string, resolution: "RELEASE" | "REFUND", notes: string) {
    if (!notes || notes.trim() === "") {
      throw new Error("Resolution notes explaining the decision are required.");
    }

    return prisma.$transaction(async (tx) => {
      const dispute = await tx.dispute.findUnique({
        where: { id: disputeId },
        include: {
          escrow: true,
        },
      });

      if (!dispute) {
        throw new Error("Dispute not found");
      }

      if (dispute.status === DisputeStatus.RESOLVED) {
        throw new Error("Cannot resolve an already resolved dispute");
      }

      const escrow = dispute.escrow;
      if (!escrow) {
        throw new Error("Escrow record not found for this dispute.");
      }

      // Resolve project and escrow status transitions
      const targetEscrowStatus = resolution === "RELEASE" ? EscrowStatus.RELEASED : EscrowStatus.REFUNDED;
      const targetProjectStatus = resolution === "RELEASE" ? ProjectStatus.COMPLETED : ProjectStatus.CANCELLED;

      // Transition escrow status (enforces state transitions and creates audit log in the same transaction)
      await EscrowService.transition(escrow.id, targetEscrowStatus, adminId, tx);

      // Update project status
      await tx.project.update({
        where: { id: escrow.projectId },
        data: { status: targetProjectStatus },
      });

      // Update dispute status and resolution notes
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: {
          status: DisputeStatus.RESOLVED,
          resolution: notes,
        },
      });

      // Log the resolution to AuditLog
      await tx.auditLog.create({
        data: {
          entityType: "Dispute",
          entityId: disputeId,
          action: `RESOLVE_${resolution}`,
          actorId: adminId,
          prevState: dispute.status,
          newState: DisputeStatus.RESOLVED,
        },
      });

      return updatedDispute;
    });
  }
}
