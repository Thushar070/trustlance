import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus } from "@prisma/client";

export async function GET() {
  try {
    const authResult = await requireRole(Role.ADMIN);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const projects = await prisma.project.findMany({
      where: {
        status: {
          in: [
            ProjectStatus.ASSIGNED,
            ProjectStatus.IN_PROGRESS,
            ProjectStatus.UNDER_REVIEW,
            ProjectStatus.COMPLETED,
            ProjectStatus.CANCELLED,
            ProjectStatus.CLOSED,
          ],
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        freelancer: {
          select: {
            name: true,
            email: true,
          },
        },
        escrow: {
          select: {
            dispute: {
              select: {
                id: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = projects.map((p) => ({
      projectId: p.id,
      projectTitle: p.title,
      projectStatus: p.status,
      clientName: p.client.name,
      clientEmail: p.client.email,
      freelancerName: p.freelancer?.name || null,
      freelancerEmail: p.freelancer?.email || null,
      disputeId: p.escrow?.dispute?.id || null,
    }));

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
