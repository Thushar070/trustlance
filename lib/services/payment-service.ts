import Razorpay from "razorpay";
import { prisma } from "../prisma";
import { ProjectStatus, PaymentStatus } from "@prisma/client";
import crypto from "crypto";

let razorpayInstance: Razorpay | null = null;

function getRazorpayInstance(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!razorpayInstance) {
    if (!keyId || !keySecret) {
      throw new Error("Razorpay API credentials are not configured in environment variables.");
    }
    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

export class PaymentService {
  /**
   * Creates a Razorpay order for an ASSIGNED project.
   */
  static async createOrder(projectId: string, clientId: string) {
    // 1. Fetch project with payment relations
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { payment: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // 2. Verify project status is ASSIGNED
    if (project.status !== ProjectStatus.ASSIGNED) {
      throw new Error("Forbidden: Project must be in ASSIGNED status to initiate payment.");
    }

    // 3. Verify caller is the project owner (client)
    if (project.clientId !== clientId) {
      throw new Error("Forbidden: You do not own this project.");
    }

    // 4. Verify no successful payment exists
    if (project.payment && project.payment.status === PaymentStatus.SUCCESS) {
      throw new Error("Conflict: A successful payment already exists for this project.");
    }

    const agreedAmount = project.agreedAmount;
    if (agreedAmount === null || agreedAmount === undefined) {
      throw new Error("Internal Server Error: Project agreed amount is not defined.");
    }

    // 5. Call Razorpay Orders API (agreedAmount is in INR, Razorpay requires paise)
    const razorpay = getRazorpayInstance();
    let order: { id: string; amount: number; currency: string };
    try {
      const response = await razorpay.orders.create({
        amount: agreedAmount * 100,
        currency: "INR",
        receipt: `receipt_order_${projectId}`,
      });
      order = response as { id: string; amount: number; currency: string };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Razorpay Order Creation Failed: ${message}`);
    }

    if (!order || !order.id) {
      throw new Error("Razorpay Order Creation returned an invalid order.");
    }

    // 6. Create or update Payment record
    const payment = await prisma.payment.upsert({
      where: { projectId },
      update: {
        razorpayOrderId: order.id,
        amount: agreedAmount,
        status: PaymentStatus.PENDING,
        razorpayPaymentId: null,
      },
      create: {
        projectId,
        razorpayOrderId: order.id,
        amount: agreedAmount,
        status: PaymentStatus.PENDING,
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      payment,
    };
  }

  /**
   * Verifies the client's signature and finalizes the Payment record as SUCCESS.
   */
  static async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    clientId: string
  ) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Razorpay API credentials are not configured in environment variables.");
    }

    // 1. Locate the Payment record
    const payment = await prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: { project: true },
    });

    if (!payment) {
      throw new Error("Payment record not found");
    }

    // 2. Verify ownership of the associated project
    if (payment.project.clientId !== clientId) {
      throw new Error("Forbidden: You do not own the project associated with this payment.");
    }

    // 3. Recompute HMAC-SHA256 signature
    const generatedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      throw new Error("Payment signature verification failed. The signature is invalid.");
    }

    // 4. Update Payment record to SUCCESS
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        razorpayPaymentId,
      },
    });

    return updatedPayment;
  }
}
