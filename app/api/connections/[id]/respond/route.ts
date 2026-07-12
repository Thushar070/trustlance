import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { ConnectionService } from "@/lib/services/connection-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const { id: connectionId } = await params;
    const body = await request.json().catch(() => ({}));
    const { response } = body;

    if (!response || (response !== "ACCEPTED" && response !== "DECLINED")) {
      return NextResponse.json({ error: "Validation failed: response must be ACCEPTED or DECLINED." }, { status: 400 });
    }

    const connection = await ConnectionService.respondToConnectionRequest(
      connectionId,
      session.user.id,
      response
    );

    return NextResponse.json(connection);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred.";
    if (message.includes("Forbidden")) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (message.includes("Conflict")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
