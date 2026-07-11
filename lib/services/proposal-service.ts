import { prisma } from "../prisma";
import { ProjectStatus, ProposalStatus } from "@prisma/client";
import { NotificationService } from "./notification-service";
import { SubmitProposalInput, UpdateProposalInput } from "../validators/proposal";

export class ProposalService {
  /**
   * Submits a proposal for a project.
   * Rejects if project is not OPEN, or if a proposal already exists from this freelancer.
   */
  static async submitProposal(freelancerId: string, projectId: string, data: SubmitProposalInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new Error("Forbidden: You can only apply to projects that are currently OPEN.");
    }

    // Check for duplicate application
    const existingProposal = await prisma.proposal.findFirst({
      where: {
        projectId,
        freelancerId,
      },
    });

    if (existingProposal) {
      throw new Error("Conflict: You have already applied to this project.");
    }

    // Default price to project budget if not explicitly provided
    const finalPrice = data.price !== undefined ? data.price : project.budget;

    return prisma.proposal.create({
      data: {
        projectId,
        freelancerId,
        message: data.message,
        estimatedDays: data.estimatedDays,
        price: finalPrice,
        status: ProposalStatus.PENDING,
      },
    });
  }

  /**
   * Lists all proposals for a given project.
   * Gated: Only the project's client owner can view proposals.
   */
  static async listProposalsForProject(projectId: string, clientId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== clientId) {
      throw new Error("Forbidden: Only the project owner can view proposals.");
    }

    return prisma.proposal.findMany({
      where: { projectId },
      include: {
        freelancer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Selects a freelancer for a project.
   * - Transitions project OPEN -> ASSIGNED.
   * - Sets Project.freelancerId and Project.agreedAmount.
   * - Marks selected proposal as ACCEPTED.
   * - Marks all other proposals on that project as REJECTED.
   */
  static async selectFreelancer(projectId: string, clientId: string, freelancerId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== clientId) {
      throw new Error("Forbidden: Only the project owner can select a freelancer.");
    }

    if (project.status !== ProjectStatus.OPEN) {
      throw new Error(`Forbidden: Cannot select freelancer for a project that is already ${project.status}.`);
    }

    // Find the proposal to select
    const proposal = await prisma.proposal.findFirst({
      where: {
        projectId,
        freelancerId,
        status: ProposalStatus.PENDING,
      },
    });

    if (!proposal) {
      throw new Error("Proposal not found or is no longer pending.");
    }

    const agreedPrice = proposal.price ?? project.budget;

    // Use Prisma transaction to atomically update project and proposals
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update Project
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.ASSIGNED,
          freelancerId,
          agreedAmount: agreedPrice,
        },
      });

      if (tx.auditLog) {
        await tx.auditLog.create({
          data: {
            entityType: "Project",
            entityId: projectId,
            action: "TRANSITION_ASSIGNED",
            actorId: clientId,
            prevState: project.status,
            newState: ProjectStatus.ASSIGNED,
          },
        });
      }

      // 2. Mark selected proposal as ACCEPTED
      await tx.proposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.ACCEPTED },
      });

      // 3. Mark all other proposals as REJECTED
      await tx.proposal.updateMany({
        where: {
          projectId,
          id: { not: proposal.id },
        },
        data: { status: ProposalStatus.REJECTED },
      });

      return updatedProject;
    });

    await NotificationService.notify("FREELANCER_ASSIGNED", { projectId });

    return result;
  }

  /**
   * Edits a proposal. Only allowed while the project status is OPEN.
   */
  static async updateProposal(id: string, freelancerId: string, data: UpdateProposalInput) {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.freelancerId !== freelancerId) {
      throw new Error("Forbidden: You do not own this proposal.");
    }

    if (proposal.project.status !== ProjectStatus.OPEN) {
      throw new Error(`Forbidden: Proposal cannot be updated because the project status is ${proposal.project.status}.`);
    }

    const updatedPrice = data.price !== undefined ? data.price : proposal.price;

    return prisma.proposal.update({
      where: { id },
      data: {
        message: data.message !== undefined ? data.message : undefined,
        estimatedDays: data.estimatedDays !== undefined ? data.estimatedDays : undefined,
        price: updatedPrice,
      },
    });
  }

  /**
   * Withdraws (deletes) a proposal. Only allowed while the project status is OPEN.
   */
  static async deleteProposal(id: string, freelancerId: string) {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!proposal) {
      throw new Error("Proposal not found");
    }

    if (proposal.freelancerId !== freelancerId) {
      throw new Error("Forbidden: You do not own this proposal.");
    }

    if (proposal.project.status !== ProjectStatus.OPEN) {
      throw new Error(`Forbidden: Proposal cannot be withdrawn because the project status is ${proposal.project.status}.`);
    }

    return prisma.proposal.delete({
      where: { id },
    });
  }
}
