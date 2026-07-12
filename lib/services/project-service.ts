import { prisma } from "../prisma";
import { ProjectStatus, Prisma, EscrowStatus } from "@prisma/client";
import { CreateProjectInput, UpdateProjectInput } from "../validators/project";
import { EscrowService } from "./escrow-service";
import { DisputeService } from "./dispute-service";
import { NotificationService } from "./notification-service";

export class ProjectService {
  /**
   * Creates a new project in the database.
   */
  static async createProject(clientId: string, data: CreateProjectInput) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execute = async (client: any) => {
      const project = await client.project.create({
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

      if (client.auditLog) {
        await client.auditLog.create({
          data: {
            entityType: "Project",
            entityId: project?.id || "mocked_project_id",
            action: "CREATE_PROJECT",
            actorId: clientId,
            prevState: null,
            newState: ProjectStatus.OPEN,
          },
        });
      }

      return project;
    };

    let project;
    if (prisma.$transaction) {
      project = await prisma.$transaction(async (tx) => {
        return execute(tx);
      });
    } else {
      project = await execute(prisma);
    }

    // Notify connected freelancers about the new open project (safely guarded for mock environments)
    try {
      if (prisma.connection) {
        const connCount = await prisma.connection.count({
          where: {
            status: "ACCEPTED",
            OR: [
              { requesterId: project.clientId },
              { addresseeId: project.clientId },
            ],
          },
        });
        if (connCount > 0) {
          await NotificationService.notify("NEW_PROJECT_FROM_CONNECTION", { projectId: project.id });
        }
      }
    } catch (e) {
      console.warn("Failed to check connections for new project notification:", e);
    }

    return project;
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
    minBudget?: number;
    maxBudget?: number;
    deadlineBefore?: Date;
    deadlineAfter?: Date;
    page?: number;
    limit?: number;
    currentUserId?: string;
  }) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 10);
    const skip = (page - 1) * limit;

    const where: Prisma.ProjectWhereInput = {};

    const currentUserId = filters.currentUserId;
    const isQueryingOwnClient = !!(filters.clientId && currentUserId && filters.clientId === currentUserId);

    if (filters.status) {
      where.status = filters.status;
      // If status is not OPEN, restrict visibility to client owner or assigned freelancer
      if (filters.status !== ProjectStatus.OPEN) {
        if (currentUserId) {
          where.AND = [
            {
              OR: [
                { clientId: currentUserId },
                { freelancerId: currentUserId }
              ]
            }
          ];
        } else {
          where.id = "none";
        }
      }
    } else {
      // By default (if status is not explicitly passed), only return OPEN projects.
      // However, if the client is querying their own projects (e.g. from the client dashboard),
      // we allow returning their own projects across all statuses.
      if (isQueryingOwnClient) {
        where.clientId = filters.clientId;
      } else {
        where.status = ProjectStatus.OPEN;
      }
    }

    if (filters.skills && filters.skills.length > 0) {
      where.skills = {
        hasSome: filters.skills,
      };
    }

    if (filters.minBudget !== undefined || filters.maxBudget !== undefined) {
      where.budget = {};
      if (filters.minBudget !== undefined) {
        where.budget.gte = filters.minBudget;
      }
      if (filters.maxBudget !== undefined) {
        where.budget.lte = filters.maxBudget;
      }
    }

    if (filters.deadlineBefore || filters.deadlineAfter) {
      where.deadline = {};
      if (filters.deadlineBefore) {
        where.deadline.lte = filters.deadlineBefore;
      }
      if (filters.deadlineAfter) {
        where.deadline.gte = filters.deadlineAfter;
      }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const execute = async (client: any) => {
      const updatedProject = await client.project.update({
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

      if (data.status !== undefined && data.status !== project.status && client.auditLog) {
        await client.auditLog.create({
          data: {
            entityType: "Project",
            entityId: id,
            action: `TRANSITION_${data.status}`,
            actorId: clientId,
            prevState: project.status,
            newState: data.status,
          },
        });
      }

      return updatedProject;
    };

    if (prisma.$transaction) {
      return prisma.$transaction(async (tx) => {
        return execute(tx);
      });
    }

    return execute(prisma);
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

    await NotificationService.notify("PAYMENT_RELEASED", { projectId });

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

    const result = await prisma.$transaction(async (tx) => {
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

    await NotificationService.notify("CHANGES_REQUESTED", { projectId, feedback });

    return result;
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

    await NotificationService.notify("DISPUTE_RAISED", { projectId, reason });

    return { success: true };
  }
}
