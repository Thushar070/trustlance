import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in first." },
        { status: 401 }
      );
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        evidence: true,
        escrow: {
          include: {
            project: {
              include: {
                client: { select: { id: true, name: true, email: true } },
                freelancer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const project = dispute.escrow?.project;
    if (!project) {
      return NextResponse.json({ error: "Project not found for this dispute" }, { status: 404 });
    }

    // Gated to Client owner, assigned Freelancer, or Admin only
    const isClientOwner = project.clientId === session.user.id;
    const isFreelancerAssigned = project.freelancerId === session.user.id;
    const isAdmin = session.user.role === Role.ADMIN;

    if (!isClientOwner && !isFreelancerAssigned && !isAdmin) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to view this dispute." },
        { status: 403 }
      );
    }

    return NextResponse.json(dispute);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
