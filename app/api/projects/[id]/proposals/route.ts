import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { ProposalService } from "@/lib/services/proposal-service";
import { Role } from "@prisma/client";

export async function GET(
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

    try {
      const proposals = await ProposalService.listProposalsForProject(projectId, clientId);
      return NextResponse.json(proposals);
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Error listing proposals";
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
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
