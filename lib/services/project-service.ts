import { prisma } from "../prisma";
import { ProjectStatus, Prisma, EscrowStatus } from "@prisma/client";
import { CreateProjectInput, UpdateProjectInput } from "../validators/project";
import { EscrowService } from "./escrow-service";
import { DisputeService } from "./dispute-service";

export class ProjectService {
  /**
   * Creates a new project in the database.
   */
  static async createProject(clientId: string, data: CreateProjectInput) {
    return prisma.project.create({
      data: {
        clientId,
        title: data.title,
        description: data.description,
        budget: data.budget,
        deadline: data.deadline,
        skills: data.skills,
        status: ProjectStatus.OPEN,
      },
    });
  }

  /**
   * Retrieves a single project by ID with its client and assigned freelancer details.
   */
  static async getProjectById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        freelancer: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        payment: true,
        escrow: true,
      },
    });
  }

  /**
   * Lists projects based on dynamic filters (status, skills, client owner). Supports pagination.
   */
  static async listProjects(filters: {
    status?: ProjectStatus;
    skills?: string[];
    clientId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    if (filters.skills && filters.skills.length > 0) {
      where.skills = {
        hasSome: filters.skills,
      };
    }

    const [total, items] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          client: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Updates an existing project. Checks resource ownership and restricts updates
   * to projects that are still in the OPEN status.
   */
  static async updateProject(id: string, clientId: string, data: UpdateProjectInput) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Ownership check
    if (project.clientId !== clientId) {
      throw new Error("Forbidden: You do not own this project");
    }

    // Lifecycle state guard: only allow modifications while status is OPEN
    if (project.status !== ProjectStatus.OPEN) {
      throw new Error(`Forbidden: Project cannot be updated because its status is no longer OPEN (current status: ${project.status})`);
    }

    return prisma.project.update({
      where: { id },
      data: {
        title: data.title !== undefined ? data.title : undefined,
        description: data.description !== undefined ? data.description : undefined,
        budget: data.budget !== undefined ? data.budget : undefined,
        deadline: data.deadline !== undefined ? data.deadline : undefined,
        skills: data.skills !== undefined ? data.skills : undefined,
        status: data.status !== undefined ? data.status : undefined,
      },
    });
  }

  /**
   * Approves work submission for a project.
   * Transitions Project to COMPLETED, and Escrow to RELEASED.
   */
  static async approve(projectId: string, clientId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { escrow: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== clientId) {
      throw new Error("Forbidden: You do not own this project.");
    }

    if (project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new Error(`Forbidden: Cannot approve project in ${project.status} status.`);
    }

    const escrow = project.escrow;
    if (!escrow) {
      throw new Error("Escrow record not found for this project.");
    }

    if (escrow.status !== EscrowStatus.UNDER_REVIEW && escrow.status !== EscrowStatus.DISPUTED) {
      throw new Error(`Forbidden: Escrow must be in UNDER_REVIEW or DISPUTED status to approve (current: ${escrow.status}).`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.COMPLETED },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Project",
          entityId: projectId,
          action: "TRANSITION_COMPLETED",
          actorId: clientId,
          prevState: project.status,
          newState: ProjectStatus.COMPLETED,
        },
      });
    });

    await EscrowService.transition(escrow.id, EscrowStatus.RELEASED, clientId);

    return { success: true };
  }

  /**
   * Requests changes on a project's work submission.
   * Reverts Project status to IN_PROGRESS and saves client feedback on the latest submission.
   */
  static async requestChanges(projectId: string, clientId: string, feedback: string) {
    if (!feedback || feedback.trim() === "") {
      throw new Error("Feedback is required to request changes.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { escrow: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== clientId) {
      throw new Error("Forbidden: You do not own this project.");
    }

    if (project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new Error(`Forbidden: Cannot request changes on project in ${project.status} status.`);
    }

    const escrow = project.escrow;
    if (!escrow) {
      throw new Error("Escrow record not found for this project.");
    }

    if (escrow.status !== EscrowStatus.UNDER_REVIEW) {
      throw new Error(`Forbidden: Escrow must be in UNDER_REVIEW status to request changes.`);
    }

    return prisma.$transaction(async (tx) => {
      const latestSubmission = await tx.submission.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });

      if (!latestSubmission) {
        throw new Error("No submissions found to request changes on.");
      }

      await tx.submission.update({
        where: { id: latestSubmission.id },
        data: { feedback },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Project",
          entityId: projectId,
          action: "TRANSITION_IN_PROGRESS",
          actorId: clientId,
          prevState: project.status,
          newState: ProjectStatus.IN_PROGRESS,
        },
      });

      // Call Escrow state transition back to HOLDING in the same transaction context
      await EscrowService.transition(escrow.id, EscrowStatus.HOLDING, clientId, tx);

      return { success: true };
    });
  }

  /**
   * Raises a dispute on a project under review.
   * Transitions Escrow to DISPUTED and creates a minimal Dispute record.
   */
  static async raiseDispute(projectId: string, userId: string, reason: string) {
    if (!reason || reason.trim() === "") {
      throw new Error("Dispute reason is required.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { escrow: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.clientId !== userId && project.freelancerId !== userId) {
      throw new Error("Forbidden: Only the client owner or the assigned freelancer can raise a dispute.");
    }

    if (project.status !== ProjectStatus.UNDER_REVIEW) {
      throw new Error(`Forbidden: Cannot raise dispute on project in ${project.status} status.`);
    }

    const escrow = project.escrow;
    if (!escrow) {
      throw new Error("Escrow record not found for this project.");
    }

    if (escrow.status !== EscrowStatus.UNDER_REVIEW) {
      throw new Error(`Forbidden: Escrow must be in UNDER_REVIEW status to raise a dispute (current: ${escrow.status}).`);
    }

    await prisma.$transaction(async (tx) => {
      await DisputeService.createDispute(escrow.id, userId, reason, tx);

      await tx.auditLog.create({
        data: {
          entityType: "Project",
          entityId: projectId,
          action: "RAISE_DISPUTE",
          actorId: userId,
          prevState: project.status,
          newState: project.status,
        },
      });
    });

    await EscrowService.transition(escrow.id, EscrowStatus.DISPUTED, userId);

    return { success: true };
  }
}
