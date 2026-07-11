import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, DisputeStatus, PaymentStatus } from "@prisma/client";

export async function GET() {
  try {
    const auth = await requireRole(Role.ADMIN);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Forbidden" },
        { status: auth.status || 403 }
      );
    }

    // 1. Projects by status
    const projectsGroup = await prisma.project.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });

    const projectsByStatus: Record<ProjectStatus, number> = {
      [ProjectStatus.OPEN]: 0,
      [ProjectStatus.ASSIGNED]: 0,
      [ProjectStatus.IN_PROGRESS]: 0,
      [ProjectStatus.UNDER_REVIEW]: 0,
      [ProjectStatus.COMPLETED]: 0,
      [ProjectStatus.CANCELLED]: 0,
      [ProjectStatus.CLOSED]: 0,
    };

    for (const group of projectsGroup) {
      projectsByStatus[group.status] = group._count.id;
    }

    // 2. Open disputes count
    const openDisputesCount = await prisma.dispute.count({
      where: {
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.ADMIN_REVIEW],
        },
      },
    });

    // 3. Total payment volume
    const paymentSum = await prisma.payment.aggregate({
      where: {
        status: PaymentStatus.SUCCESS,
      },
      _sum: {
        amount: true,
      },
    });

    const totalPaymentVolume = paymentSum._sum.amount || 0;

    return NextResponse.json({
      projectsByStatus,
      openDisputesCount,
      totalPaymentVolume,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
