import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, EscrowStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    let payments;

    if (userRole === Role.CLIENT) {
      // Clients see all their project payments
      payments = await prisma.payment.findMany({
        where: {
          project: {
            clientId: userId,
          },
        },
        include: {
          project: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else if (userRole === Role.FREELANCER) {
      // Freelancers see payments for their projects where escrow status is RELEASED
      payments = await prisma.payment.findMany({
        where: {
          project: {
            freelancerId: userId,
            escrow: {
              status: EscrowStatus.RELEASED,
            },
          },
        },
        include: {
          project: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } else {
      // Admins or fallback see all payments
      payments = await prisma.payment.findMany({
        include: {
          project: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }

    const formattedPayments = payments.map((p) => ({
      id: p.id,
      projectId: p.projectId,
      projectTitle: p.project?.title || "Untitled Project",
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
    }));

    return NextResponse.json(formattedPayments);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
