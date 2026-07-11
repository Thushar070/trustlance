import { prisma } from "../prisma";
import { ProjectStatus, Prisma } from "@prisma/client";
import { CreateProjectInput, UpdateProjectInput } from "../validators/project";

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
}
