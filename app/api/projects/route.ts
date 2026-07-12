import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { createProjectSchema } from "@/lib/validators/project";
import { ProjectService } from "@/lib/services/project-service";
import { Role, ProjectStatus } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(Role.CLIENT);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const clientId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const parseResult = createProjectSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const project = await ProjectService.createProject(clientId, parseResult.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const skillsParam = searchParams.get("skills");
    const clientIdParam = searchParams.get("clientId");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const minBudgetParam = searchParams.get("minBudget");
    const maxBudgetParam = searchParams.get("maxBudget");
    const deadlineBeforeParam = searchParams.get("deadlineBefore");
    const deadlineAfterParam = searchParams.get("deadlineAfter");

    const status = statusParam && Object.values(ProjectStatus).includes(statusParam as ProjectStatus)
      ? (statusParam as ProjectStatus)
      : undefined;

    const skills = skillsParam
      ? skillsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const minBudget = minBudgetParam ? parseInt(minBudgetParam, 10) : undefined;
    const maxBudget = maxBudgetParam ? parseInt(maxBudgetParam, 10) : undefined;
    const deadlineBefore = deadlineBeforeParam ? new Date(deadlineBeforeParam) : undefined;
    const deadlineAfter = deadlineAfterParam ? new Date(deadlineAfterParam) : undefined;

    // Scope Clients to only their own projects
    let clientIdFilter = clientIdParam || undefined;
    if (session.user.role === Role.CLIENT) {
      clientIdFilter = session.user.id;
    }

    const result = await ProjectService.listProjects({
      status,
      skills,
      clientId: clientIdFilter,
      minBudget: minBudget && !isNaN(minBudget) ? minBudget : undefined,
      maxBudget: maxBudget && !isNaN(maxBudget) ? maxBudget : undefined,
      deadlineBefore: deadlineBefore && !isNaN(deadlineBefore.getTime()) ? deadlineBefore : undefined,
      deadlineAfter: deadlineAfter && !isNaN(deadlineAfter.getTime()) ? deadlineAfter : undefined,
      page,
      limit,
      currentUserId: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
