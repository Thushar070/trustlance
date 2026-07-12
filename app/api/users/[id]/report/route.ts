import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { ReportService } from "@/lib/services/connection-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id: reportedUserId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Validation failed: reason is required." }, { status: 400 });
    }

    const report = await ReportService.submitReport(
      session.user.id,
      reportedUserId,
      reason
    );

    return NextResponse.json(report);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    if (message.includes("Conflict")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message.includes("User not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
