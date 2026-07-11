import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { AuditService } from "@/lib/services/audit-service";
import { Role } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  try {
    const { entityId } = await params;
    
    // Gated to Admin only
    const authResult = await requireRole(Role.ADMIN);
    if (!authResult.authorized || !authResult.session?.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Missing entity type parameter." }, { status: 400 });
    }

    const logs = await AuditService.getLogsForEntity(
      type,
      entityId,
      authResult.session.user.role as Role
    );

    return NextResponse.json(logs);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
