import { POST as reconcileHandler } from "@/app/api/admin/payments/[paymentId]/reconcile-escrow/route";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import { Role, PaymentStatus, EscrowStatus } from "@prisma/client";

jest.mock("@/lib/auth/require-role");

jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    payment: {
      findUnique: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Admin Reconcile Escrow API Route Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. reconcile-escrow is rejected for a non-Admin user", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: false,
      error: "Forbidden: Admin role required",
      status: 403,
    });

    const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
      method: "POST",
    });
    const res = await reconcileHandler(req, { params: Promise.resolve({ paymentId: "pay_123" }) });

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toContain("Forbidden");
  });

  it("2. reconcile-escrow returns 404 if the payment record does not exist", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin_user", role: Role.ADMIN, email: "admin@test.com" } },
    });

    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
      method: "POST",
    });
    const res = await reconcileHandler(req, { params: Promise.resolve({ paymentId: "pay_nonexistent" }) });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  it("3. reconcile-escrow is rejected for a payment that is NOT SUCCESS", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin_user", role: Role.ADMIN, email: "admin@test.com" } },
    });

    const pendingPayment = {
      id: "pay_123",
      status: PaymentStatus.PENDING,
      projectId: "proj_123",
      project: {
        id: "proj_123",
        escrow: null,
      },
    };
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(pendingPayment);

    const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
      method: "POST",
    });
    const res = await reconcileHandler(req, { params: Promise.resolve({ paymentId: "pay_123" }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("SUCCESS status");
  });

  it("4. reconcile-escrow is rejected if an Escrow already exists for that project", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin_user", role: Role.ADMIN, email: "admin@test.com" } },
    });

    const paymentWithEscrow = {
      id: "pay_123",
      status: PaymentStatus.SUCCESS,
      projectId: "proj_123",
      project: {
        id: "proj_123",
        escrow: {
          id: "escrow_123",
          status: EscrowStatus.HOLDING,
        },
      },
    };
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(paymentWithEscrow);

    const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
      method: "POST",
    });
    const res = await reconcileHandler(req, { params: Promise.resolve({ paymentId: "pay_123" }) });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("already exists");
  });

  it("5. reconcile-escrow successfully creates and transitions Escrow to HOLDING", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      session: { user: { id: "admin_user", role: Role.ADMIN, email: "admin@test.com" } },
    });

    const paymentWithoutEscrow = {
      id: "pay_123",
      status: PaymentStatus.SUCCESS,
      projectId: "proj_123",
      project: {
        id: "proj_123",
        escrow: null,
      },
    };
    (prisma.payment.findUnique as jest.Mock).mockResolvedValue(paymentWithoutEscrow);

    // Mock escrow service calls executed by escrow-service.ts inside route
    (prisma.escrow.findUnique as jest.Mock)
      .mockResolvedValueOnce(null) // inside createEscrowForProject first check
      .mockResolvedValueOnce({ id: "escrow_created", projectId: "proj_123", status: EscrowStatus.CREATED }); // inside transition lookup

    (prisma.escrow.create as jest.Mock).mockResolvedValue({
      id: "escrow_created",
      projectId: "proj_123",
      status: EscrowStatus.CREATED,
    });

    (prisma.escrow.update as jest.Mock).mockResolvedValue({
      id: "escrow_created",
      projectId: "proj_123",
      status: EscrowStatus.HOLDING,
    });

    const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
      method: "POST",
    });
    const res = await reconcileHandler(req, { params: Promise.resolve({ paymentId: "pay_123" }) });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain("reconciled");

    // Verify escrow creation and transition mock calls
    expect(prisma.escrow.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          projectId: "proj_123",
          status: EscrowStatus.CREATED,
        },
      })
    );

    expect(prisma.escrow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "escrow_created" },
        data: { status: EscrowStatus.HOLDING },
      })
    );
  });
});
