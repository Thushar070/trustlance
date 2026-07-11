import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { SubmissionService } from "@/lib/services/submission-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;
    const userId = session.user.id;

    try {
      const submissions = await SubmissionService.listSubmissionsForProject(projectId, userId);
      return NextResponse.json(submissions, { status: 200 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Failed to retrieve submissions";
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
