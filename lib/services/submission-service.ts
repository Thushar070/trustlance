import { prisma } from "../prisma";
import { ProjectStatus, EscrowStatus } from "@prisma/client";
import { EscrowService } from "./escrow-service";
import { CreateSubmissionInput } from "../validators/submission";

export class SubmissionService {
  /**
   * Submits freelancer work for a project.
   * Updates Project status to UNDER_REVIEW, and transitions Escrow from HOLDING -> WORK_SUBMITTED -> UNDER_REVIEW.
   */
  static async submitWork(projectId: string, freelancerId: string, data: CreateSubmissionInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { escrow: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.freelancerId !== freelancerId) {
      throw new Error("Forbidden: You are not the assigned freelancer for this project.");
    }

    if (project.status !== ProjectStatus.ASSIGNED && project.status !== ProjectStatus.IN_PROGRESS) {
      throw new Error(`Forbidden: Project cannot accept work submissions in its current status: ${project.status}`);
    }

    const escrow = project.escrow;
    if (!escrow) {
      throw new Error("Escrow record not found for this project.");
    }

    if (escrow.status !== EscrowStatus.HOLDING) {
      throw new Error(`Forbidden: Escrow must be in HOLDING status to submit work (current status: ${escrow.status}).`);
    }

    // Perform database transaction for Submission creation & Project status update
    const submission = await prisma.$transaction(async (tx) => {
      const createdSubmission = await tx.submission.create({
        data: {
          projectId,
          fileUrl: data.fileUrl || null,
          githubLink: data.githubLink || null,
          demoLink: data.demoLink || null,
          notes: data.notes || null,
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.UNDER_REVIEW },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Project",
          entityId: projectId,
          action: "TRANSITION_UNDER_REVIEW",
          actorId: freelancerId,
          prevState: project.status,
          newState: ProjectStatus.UNDER_REVIEW,
        },
      });

      return createdSubmission;
    });

    // Perform Escrow state machine transitions sequentially
    await EscrowService.transition(escrow.id, EscrowStatus.WORK_SUBMITTED, freelancerId);
    await EscrowService.transition(escrow.id, EscrowStatus.UNDER_REVIEW, freelancerId);

    return submission;
  }

  /**
   * Retrieves submissions list for a project.
   * Gated to project Client owner and assigned Freelancer only.
   */
  static async listSubmissionsForProject(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== userId && project.freelancerId !== userId) {
      throw new Error("Forbidden: Only the client owner or the assigned freelancer can view submissions.");
    }

    return prisma.submission.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
  }
}
