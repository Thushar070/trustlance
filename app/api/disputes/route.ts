import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, DisputeStatus } from "@prisma/client";

export async function GET() {
  try {
    const authResult = await requireRole(Role.ADMIN);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const disputes = await prisma.dispute.findMany({
      where: {
        status: {
          in: [DisputeStatus.OPEN, DisputeStatus.ADMIN_REVIEW],
        },
      },
      include: {
        escrow: {
          include: {
            project: {
              include: {
                client: { select: { id: true, name: true, email: true } },
                freelancer: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
      // Sort oldest first
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(disputes);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
