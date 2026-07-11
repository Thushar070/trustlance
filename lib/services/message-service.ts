import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@prisma/client";

export class MessageService {
  /**
   * Sends a private message between the client and assigned freelancer.
   */
  static async sendMessage(projectId: string, senderId: string, content: string) {
    if (!content || content.trim() === "") {
      throw new Error("Message content cannot be empty.");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        clientId: true,
        freelancerId: true,
        status: true,
      },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    if (project.status === ProjectStatus.OPEN) {
      throw new Error("Cannot message on a project that is still open.");
    }

    const isClient = project.clientId === senderId;
    const isFreelancer = project.freelancerId === senderId;

    if (!isClient && !isFreelancer) {
      throw new Error("Forbidden: You are not authorized to message on this project.");
    }

    return prisma.message.create({
      data: {
        projectId,
        senderId,
        content: content.trim(),
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Lists the threaded messages for a project, visible only to its Client and Freelancer.
   */
  static async listMessages(projectId: string, userId: string, page: number = 1, limit: number = 50) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        clientId: true,
        freelancerId: true,
      },
    });

    if (!project) {
      throw new Error("Project not found.");
    }

    const isClient = project.clientId === userId;
    const isFreelancer = project.freelancerId === userId;

    // Explicitly reject anyone who is not the client or the assigned freelancer (including Admins)
    if (!isClient && !isFreelancer) {
      throw new Error("Forbidden: Access denied.");
    }

    const parsedPage = Math.max(1, page);
    const parsedLimit = Math.max(1, limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const [total, items] = await Promise.all([
      prisma.message.count({
        where: { projectId },
      }),
      prisma.message.findMany({
        where: { projectId },
        skip,
        take: parsedLimit,
        orderBy: { createdAt: "asc" },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    };
  }
}
