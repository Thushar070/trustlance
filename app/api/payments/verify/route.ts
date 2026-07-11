import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { PaymentService } from "@/lib/services/payment-service";
import { Role } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const authResult = await requireRole(Role.CLIENT);
    if (!authResult.authorized || !authResult.session?.user?.id) {
      return NextResponse.json(
        { error: authResult.error || "Unauthorized" },
        { status: authResult.status || 401 }
      );
    }

    const clientId = authResult.session.user.id;
    const body = await request.json().catch(() => ({}));
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json(
        { error: "Validation failed: razorpayOrderId, razorpayPaymentId, and razorpaySignature are required." },
        { status: 400 }
      );
    }

    try {
      const payment = await PaymentService.verifyPayment(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        clientId
      );
      return NextResponse.json(payment, { status: 200 });
    } catch (serviceError: unknown) {
      const message = serviceError instanceof Error ? serviceError.message : "Payment verification failed";
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
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
