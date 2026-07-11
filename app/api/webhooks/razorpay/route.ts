import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EscrowService } from "@/lib/services/escrow-service";
import { PaymentStatus, EscrowStatus } from "@prisma/client";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "Webhook secret is not configured in environment variables." },
        { status: 500 }
      );
    }

    const signature = request.headers.get("x-razorpay-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing signature header." }, { status: 400 });
    }

    const rawBody = await request.text();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    let payload: {
      id?: string;
      event?: string;
      payload?: {
        payment?: {
          entity?: {
            id?: string;
            order_id?: string;
          };
        };
      };
    };
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const eventId = payload.id;
    if (!eventId) {
      return NextResponse.json({ error: "Invalid payload: missing event id." }, { status: 400 });
    }

    // Idempotency check: try to create a WebhookEvent row.
    // If it already exists, this event has already been processed.
    try {
      await prisma.webhookEvent.create({
        data: { razorpayEventId: eventId },
      });
    } catch (dbError: unknown) {
      if (
        dbError &&
        typeof dbError === "object" &&
        "code" in dbError &&
        (dbError as { code: string }).code === "P2002"
      ) {
        return NextResponse.json({ message: "Event already processed." }, { status: 200 });
      }
      throw dbError;
    }

    const eventName = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;

    if (!orderId) {
      return NextResponse.json({ message: "Event ignored: missing order_id." }, { status: 200 });
    }

    const dbPayment = await prisma.payment.findFirst({
      where: { razorpayOrderId: orderId },
    });

    if (!dbPayment) {
      return NextResponse.json({ error: `Payment not found for order_id: ${orderId}` }, { status: 404 });
    }

    if (eventName === "payment.captured") {
      // Update Payment to SUCCESS if it's not already
      if (dbPayment.status !== PaymentStatus.SUCCESS) {
        await prisma.payment.update({
          where: { id: dbPayment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            razorpayPaymentId: paymentId,
          },
        });
      }

      // Create Escrow
      const escrow = await EscrowService.createEscrowForProject(dbPayment.projectId);

      // Transition if status is CREATED
      if (escrow.status === EscrowStatus.CREATED) {
        await EscrowService.transition(escrow.id, EscrowStatus.HOLDING, "SYSTEM_WEBHOOK");
      }
    } else if (eventName === "payment.failed") {
      // Update Payment to FAILED
      await prisma.payment.update({
        where: { id: dbPayment.id },
        data: {
          status: PaymentStatus.FAILED,
          razorpayPaymentId: paymentId,
        },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
