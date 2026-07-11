import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { EscrowService } from "@/lib/services/escrow-service";
import { Role, EscrowStatus, PaymentStatus } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;

    // Gated to Admin only
    const authResult = await requireRole(Role.ADMIN);
    if (!authResult.authorized || !authResult.session?.user) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const adminId = authResult.session.user.id || "";

    // Locate the Payment record and include project and existing escrow
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        project: {
          include: {
            escrow: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found." }, { status: 404 });
    }

    // Verify Payment.status is SUCCESS
    if (payment.status !== PaymentStatus.SUCCESS) {
      return NextResponse.json(
        { error: "Validation failed: Reconcile is only allowed for payments in SUCCESS status." },
        { status: 400 }
      );
    }

    // Verify no Escrow exists yet for this project
    if (payment.project.escrow) {
      return NextResponse.json(
        { error: "Validation failed: An Escrow record already exists for this project." },
        { status: 400 }
      );
    }

    // Perform transaction to initialize escrow and transition it to HOLDING
    await prisma.$transaction(async (tx) => {
      const escrow = await EscrowService.createEscrowForProject(payment.projectId, tx);
      await EscrowService.transition(escrow.id, EscrowStatus.HOLDING, adminId, tx);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Escrow successfully reconciled and transitioned to HOLDING status.",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
