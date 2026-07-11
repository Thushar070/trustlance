import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { updateProposalSchema } from "@/lib/validators/proposal";
import { ProposalService } from "@/lib/services/proposal-service";
import { Role } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(Role.FREELANCER);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { id: proposalId } = await params;
    const freelancerId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const parseResult = updateProposalSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    try {
      const updatedProposal = await ProposalService.updateProposal(proposalId, freelancerId, parseResult.data);
      return NextResponse.json(updatedProposal);
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Error updating proposal";
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireRole(Role.FREELANCER);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { id: proposalId } = await params;
    const freelancerId = authResult.session.user.id;

    try {
      await ProposalService.deleteProposal(proposalId, freelancerId);
      return NextResponse.json({ success: true, message: "Proposal successfully withdrawn." });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Error deleting proposal";
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
