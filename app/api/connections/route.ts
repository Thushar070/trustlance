import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { ConnectionService } from "@/lib/services/connection-service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: "Validation failed: targetUserId is required." }, { status: 400 });
    }

    const connection = await ConnectionService.sendConnectionRequest(session.user.id, targetUserId);
    return NextResponse.json(connection);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    if (message.includes("Rate limit")) {
      return NextResponse.json({ error: message }, { status: 429 });
    }
    if (message.includes("Conflict")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const accepted = await ConnectionService.listConnectionsForUser(session.user.id);
    const pending = await ConnectionService.listPendingRequestsForUser(session.user.id);

    return NextResponse.json({ accepted, pending });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
