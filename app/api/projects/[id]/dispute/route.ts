import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { ProjectService } from "@/lib/services/project-service";

export async function POST(
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
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim() === "") {
      return NextResponse.json({ error: "Reason for dispute is required." }, { status: 400 });
    }

    try {
      const result = await ProjectService.raiseDispute(projectId, userId, reason);
      return NextResponse.json(result, { status: 200 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Failed to raise dispute";
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
