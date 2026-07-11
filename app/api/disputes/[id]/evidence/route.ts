import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { DisputeService } from "@/lib/services/dispute-service";

export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const { type, url } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: "Validation failed: 'type' and 'url' are required fields." },
        { status: 400 }
      );
    }

    if (type !== "file" && type !== "link" && type !== "screenshot") {
      return NextResponse.json(
        { error: "Validation failed: 'type' must be 'file', 'link', or 'screenshot'." },
        { status: 400 }
      );
    }

    // Call service to add evidence (gating & limits are handled in DisputeService)
    try {
      const evidence = await DisputeService.addEvidence(id, session.user.id || "", type, url);
      return NextResponse.json(evidence, { status: 201 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add evidence";
      const status = msg.includes("Forbidden") ? 403 : 400;
      return NextResponse.json({ error: msg }, { status });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
