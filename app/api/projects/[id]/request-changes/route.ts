import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { ProjectService } from "@/lib/services/project-service";
import { Role } from "@prisma/client";

export async function POST(
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

    const { id: projectId } = await params;
    const clientId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const { feedback } = body;

    if (!feedback || typeof feedback !== "string" || feedback.trim() === "") {
      return NextResponse.json({ error: "Feedback message is required." }, { status: 400 });
    }

    try {
      const result = await ProjectService.requestChanges(projectId, clientId, feedback);
      return NextResponse.json(result, { status: 200 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Request changes failed";
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
