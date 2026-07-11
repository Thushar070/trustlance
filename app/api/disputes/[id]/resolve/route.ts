import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { DisputeService } from "@/lib/services/dispute-service";
import { Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Gated to Admin only
    const authResult = await requireRole(Role.ADMIN);
    if (!authResult.authorized || !authResult.session?.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { resolution, notes } = body;

    if (!resolution || (resolution !== "RELEASE" && resolution !== "REFUND")) {
      return NextResponse.json(
        { error: "Validation failed: 'resolution' must be either 'RELEASE' or 'REFUND'." },
        { status: 400 }
      );
    }

    if (!notes || notes.trim() === "") {
      return NextResponse.json(
        { error: "Validation failed: Resolution notes explaining the decision are required." },
        { status: 400 }
      );
    }

    try {
      const updatedDispute = await DisputeService.resolveDispute(
        id,
        authResult.session.user.id || "",
        resolution,
        notes
      );
      return NextResponse.json(updatedDispute);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resolve dispute";
      const status = msg.includes("already resolved") ? 400 : 400; // Let's keep 400 for errors in resolving
      return NextResponse.json({ error: msg }, { status });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
