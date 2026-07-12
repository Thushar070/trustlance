import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { updateProjectSchema } from "@/lib/validators/project";
import { ProjectService } from "@/lib/services/project-service";
import { Role, ProjectStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const project = await ProjectService.getProjectById(id);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isClientOwner = project.clientId === session.user.id;
    const isFreelancerAssigned = project.freelancerId === session.user.id;
    const isFreelancerRole = session.user.role === Role.FREELANCER;
    const isAdmin = session.user.role === Role.ADMIN;

    let isAuthorized = false;

    if (isClientOwner || isFreelancerAssigned) {
      isAuthorized = true;
    } else if (isFreelancerRole && project.status === ProjectStatus.OPEN) {
      isAuthorized = true;
    } else if (isAdmin) {
      // Admin is only granted full access if an active or resolved dispute exists
      const { prisma } = await import("@/lib/prisma");
      const dispute = await prisma.dispute.findFirst({
        where: {
          escrow: { projectId: project.id },
          status: { in: ["OPEN", "ADMIN_REVIEW", "RESOLVED"] }
        }
      });
      if (dispute) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If the logged-in user is a freelancer, attach their own proposal if it exists
    let myProposal = null;
    if (session.user.role === Role.FREELANCER) {
      const { prisma } = await import("@/lib/prisma");
      myProposal = await prisma.proposal.findFirst({
        where: {
          projectId: id,
          freelancerId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      ...project,
      myProposal,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(Role.CLIENT);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { id } = await params;
    const clientId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const parseResult = updateProjectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const updatedProject = await ProjectService.updateProject(id, clientId, parseResult.data);
      return NextResponse.json(updatedProject);
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Failed to update project";
      if (message.includes("Forbidden")) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (message.includes("not found")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
