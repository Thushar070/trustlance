import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { PaymentService } from "@/lib/services/payment-service";
import { Role } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const authResult = await requireRole(Role.CLIENT);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const { projectId } = await params;
    const clientId = authResult.session.user.id;

    try {
      const orderData = await PaymentService.createOrder(projectId, clientId);
      return NextResponse.json({
        ...orderData,
        keyId: process.env.RAZORPAY_KEY_ID,
      }, { status: 201 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Failed to create payment order";
      if (message.includes("Forbidden")) {
        return NextResponse.json({ error: message }, { status: 403 });
      }
      if (message.includes("not found")) {
        return NextResponse.json({ error: message }, { status: 404 });
      }
      if (message.includes("Conflict")) {
        return NextResponse.json({ error: message }, { status: 409 });
      }
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
