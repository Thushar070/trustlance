/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role, ProjectStatus, DisputeStatus, EscrowStatus } from "@prisma/client";
import { getServerSession } from "@/lib/auth/get-server-session";
import { requireRole } from "@/lib/auth/require-role";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { authOptions } from "@/lib/auth/auth-options";
import { TokenBlacklist } from "@/lib/auth/blacklist";

// Route Handlers
import { GET as getProjectHandler, PATCH as updateProjectHandler } from "@/app/api/projects/[id]/route";
import { POST as applyProjectHandler } from "@/app/api/projects/[id]/apply/route";
import { POST as submitWorkHandler } from "@/app/api/projects/[id]/submit-work/route";
import { POST as resolveDisputeHandler } from "@/app/api/disputes/[id]/resolve/route";
import { POST as runAutoReleaseHandler } from "@/app/api/admin/run-auto-release/route";
import { POST as verifyPaymentHandler } from "@/app/api/payments/verify/route";
import { POST as razorpayWebhookHandler } from "@/app/api/webhooks/razorpay/route";
import { GET as listMessagesHandler } from "@/app/api/projects/[id]/messages/route";
import { GET as getPublicProfileHandler } from "@/app/api/users/[id]/public-profile/route";
import { ConnectionService } from "@/lib/services/connection-service";
import { ProjectService } from "@/lib/services/project-service";
import { MessageService } from "@/lib/services/message-service";
import { POST as completeProfileHandler } from "@/app/api/users/complete-profile/route";
import { POST as rateProjectHandler } from "@/app/api/projects/[id]/rating/route";
import { GET as searchUsersHandler } from "@/app/api/users/search/route";
import { createProjectSchema } from "@/lib/validators/project";
import { submitProposalSchema } from "@/lib/validators/proposal";
import { completeClientProfileSchema, completeFreelancerProfileSchema } from "@/lib/validators/user";

// Mock NextAuth helpers
jest.mock("@/lib/auth/get-server-session");
jest.mock("@/lib/auth/require-role");
jest.mock("@/lib/services/connection-service", () => ({
  ConnectionService: {
    getConnectionStatus: jest.fn(),
  },
}));

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    proposal: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    connection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    dispute: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    webhookEvent: {
      create: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("Adversarial Security Audit & Penetration Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PART 3: AUTHORIZATION & IDOR SWEEP", () => {
    describe("IDOR and Assigned Relationship Attacks", () => {
      it("should reject an unrelated client/freelancer trying to view a private project (GET /api/projects/:id)", async () => {
        // Mock session as unrelated freelancer
        mockedGetServerSession.mockResolvedValue({
          user: { id: "user_unrelated", role: Role.FREELANCER },
          expires: "2026-12-31",
        });

        // Mock project in ASSIGNED status (meaning not open anymore)
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_1",
          clientId: "client_owner",
          freelancerId: "freelancer_assigned",
          status: ProjectStatus.ASSIGNED,
        });

        const params = Promise.resolve({ id: "proj_1" });
        const res = await getProjectHandler(new Request("http://localhost/api/projects/proj_1"), { params });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("Forbidden");
      });

      it("should reject an unrelated client trying to update a project (PATCH /api/projects/:id)", async () => {
        mockedRequireRole.mockResolvedValue({
          authorized: true,
          status: 200,
          error: null,
          session: { user: { id: "client_unrelated", role: Role.CLIENT }, expires: "2026-12-31" } as any,
        });

        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_1",
          clientId: "client_owner",
          status: ProjectStatus.OPEN,
        });

        const params = Promise.resolve({ id: "proj_1" });
        const req = new Request("http://localhost/api/projects/proj_1", {
          method: "PATCH",
          body: JSON.stringify({ title: "Hacked Title" }),
        });
        const res = await updateProjectHandler(req, { params });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("Forbidden");
      });

      it("should reject cross-project submission by a freelancer assigned to a different project", async () => {
        mockedRequireRole.mockResolvedValue({
          authorized: true,
          status: 200,
          error: null,
          session: { user: { id: "freelancer_A", role: Role.FREELANCER }, expires: "2026-12-31" } as any,
        });

        // Project B is assigned to freelancer_B
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_B",
          clientId: "client_owner",
          freelancerId: "freelancer_B",
          status: ProjectStatus.ASSIGNED,
          escrow: { id: "esc_B", status: EscrowStatus.HOLDING },
        });

        const params = Promise.resolve({ id: "proj_B" });
        const req = new Request("http://localhost/api/projects/proj_B/submit-work", {
          method: "POST",
          body: JSON.stringify({ fileUrl: "https://s3.amazonaws.com/submissions/deliverable.zip" }),
        });
        const res = await submitWorkHandler(req, { params });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("Forbidden");
      });

      it("should reject private message reads from an Admin role (GET /api/projects/:id/messages)", async () => {
        mockedGetServerSession.mockResolvedValue({
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        });

        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_1",
          clientId: "client_owner",
          freelancerId: "freelancer_assigned",
        });

        const params = Promise.resolve({ id: "proj_1" });
        const res = await listMessagesHandler(new Request("http://localhost/api/projects/proj_1/messages"), { params });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("Forbidden");
      });
    });

    describe("Role Escalation Gating", () => {
      it("should deny CLIENT role from applying to a project (POST /api/projects/:id/apply)", async () => {
        mockedRequireRole.mockResolvedValue({
          authorized: false,
          status: 403,
          error: "Forbidden: Mismatched role.",
          session: null,
        });

        const params = Promise.resolve({ id: "proj_1" });
        const req = new Request("http://localhost/api/projects/proj_1/apply", {
          method: "POST",
          body: JSON.stringify({ message: "I want this project!", estimatedDays: 5, price: 100 }),
        });
        const res = await applyProjectHandler(req, { params });

        expect(res.status).toBe(403);
      });

      it("should deny FREELANCER role from resolving a dispute (POST /api/disputes/:id/resolve)", async () => {
        mockedRequireRole.mockResolvedValue({
          authorized: false,
          status: 403,
          error: "Forbidden: Admin access required.",
          session: null,
        });

        const params = Promise.resolve({ id: "disp_1" });
        const req = new Request("http://localhost/api/disputes/disp_1/resolve", {
          method: "POST",
          body: JSON.stringify({ resolution: "RELEASE", notes: "Freelancer wins" }),
        });
        const res = await resolveDisputeHandler(req, { params });

        expect(res.status).toBe(403);
      });
    });

    describe("Admin Dispute-Gated Project Access", () => {
      it("should deny Admin access to project details if NO dispute exists for it", async () => {
        mockedGetServerSession.mockResolvedValue({
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        });

        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_no_dispute",
          clientId: "client_owner",
          freelancerId: "freelancer_assigned",
          status: ProjectStatus.ASSIGNED,
        });

        // Mock dispute count or findFirst to return null (no dispute exists)
        (prisma.dispute.findFirst as jest.Mock).mockResolvedValue(null);

        const params = Promise.resolve({ id: "proj_no_dispute" });
        const res = await getProjectHandler(new Request("http://localhost/api/projects/proj_no_dispute"), { params });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.error).toContain("Forbidden");
      });

      it("should allow Admin access to project details if an active/resolved dispute DOES exist", async () => {
        mockedGetServerSession.mockResolvedValue({
          user: { id: "admin_user", role: Role.ADMIN },
          expires: "2026-12-31",
        });

        (prisma.project.findUnique as jest.Mock).mockResolvedValue({
          id: "proj_with_dispute",
          clientId: "client_owner",
          freelancerId: "freelancer_assigned",
          status: ProjectStatus.ASSIGNED,
        });

        // Mock rating findUnique to prevent crashes
        (prisma.rating.findUnique as jest.Mock).mockResolvedValue(null);

        // Mock dispute findFirst to return a dispute record
        (prisma.dispute.findFirst as jest.Mock).mockResolvedValue({
          id: "disp_1",
          status: DisputeStatus.OPEN,
        });

        const params = Promise.resolve({ id: "proj_with_dispute" });
        const res = await getProjectHandler(new Request("http://localhost/api/projects/proj_with_dispute"), { params });

        expect(res.status).toBe(200);
      });
    });
  });

  describe("PART 5: PAYMENTS & WEBHOOK RE-VERIFICATION", () => {
    it("should reject verifyPayment call with an invalid Razorpay signature", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: { user: { id: "client_owner", role: Role.CLIENT }, expires: "2026-12-31" } as any,
      });

      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "pay_1",
        projectId: "proj_1",
        razorpayOrderId: "order_1",
        amount: 5000,
        status: "PENDING",
        project: { clientId: "client_owner" },
      });

      const req = new Request("http://localhost/api/payments/verify", {
        method: "POST",
        body: JSON.stringify({
          razorpayOrderId: "order_1",
          razorpayPaymentId: "pay_id_123",
          razorpaySignature: "invalid_fabricated_signature",
        }),
      });

      const res = await verifyPaymentHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("signature verification failed");
    });

    it("should reject replayed webhook payloads using the WebhookEvent unique constraint check", async () => {
      // Mock valid signature validation bypass by setting header signature to match expected signature
      // The webhook route handler validates signature using RAZORPAY_WEBHOOK_SECRET
      process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret";

      const payload = {
        id: "evt_duplicate",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_999",
              order_id: "order_999",
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", "test_secret")
        .update(rawBody)
        .digest("hex");

      // Mock unique constraint error on WebhookEvent creation (code P2002)
      const p2002Error = new Error("Unique constraint failed");
      (p2002Error as any).code = "P2002";
      (prisma.webhookEvent.create as jest.Mock).mockRejectedValue(p2002Error);

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: rawBody,
      });

      const res = await razorpayWebhookHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.message).toContain("Event already processed");
    });

    it("should accept webhook captured event when the paid amount matches dbPayment.amount * 100", async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret";

      const payload = {
        id: "evt_valid_amount",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_123",
              amount: 500000,
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", "test_secret")
        .update(rawBody)
        .digest("hex");

      (prisma.webhookEvent.create as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "pay_1",
        projectId: "proj_1",
        razorpayOrderId: "order_123",
        amount: 5000,
        status: "PENDING",
      });

      const mockTx = {
        payment: {
          update: jest.fn().mockResolvedValue({ id: "pay_1" }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: "log_1" }),
        },
        escrow: {
          findUnique: jest.fn().mockResolvedValue({ id: "esc_1", status: "CREATED" }),
          create: jest.fn().mockResolvedValue({ id: "esc_1", status: "CREATED" }),
          update: jest.fn().mockResolvedValue({ id: "esc_1", status: "HOLDING" }),
        },
      };
      (prisma as any).$transaction = jest.fn(async (cb) => cb(mockTx));

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: rawBody,
      });

      const res = await razorpayWebhookHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(mockTx.payment.update).toHaveBeenCalled();
    });

    it("should reject webhook captured event when the paid amount does NOT match dbPayment.amount * 100", async () => {
      process.env.RAZORPAY_WEBHOOK_SECRET = "test_secret";

      const payload = {
        id: "evt_invalid_amount",
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_123",
              order_id: "order_123",
              amount: 400000,
            },
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const signature = crypto
        .createHmac("sha256", "test_secret")
        .update(rawBody)
        .digest("hex");

      (prisma.webhookEvent.create as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: "pay_1",
        projectId: "proj_1",
        razorpayOrderId: "order_123",
        amount: 5000,
        status: "PENDING",
      });

      const mockTx = {
        payment: { update: jest.fn() },
        escrow: { update: jest.fn() },
      };
      (prisma as any).$transaction = jest.fn(async (cb) => cb(mockTx));

      const req = new Request("http://localhost/api/webhooks/razorpay", {
        method: "POST",
        headers: {
          "x-razorpay-signature": signature,
        },
        body: rawBody,
      });

      const res = await razorpayWebhookHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Payment verification failed: Amount mismatch");
      expect(mockTx.payment.update).not.toHaveBeenCalled();
    });
  });

  describe("PART 6: CRON SECRET PROTECTION", () => {
    it("should reject manual auto-release trigger if CRON_SECRET is wrong", async () => {
      process.env.CRON_SECRET = "correct_secret";

      const req = new Request("http://localhost/api/admin/run-auto-release", {
        method: "POST",
        headers: {
          "Authorization": "Bearer wrong_secret",
        },
      });

      mockedRequireRole.mockResolvedValue({
        authorized: false,
        status: 403,
        error: "Forbidden",
        session: null,
      });

      const res = await runAutoReleaseHandler(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain("Forbidden");
    });
  });

  describe("PART 2: SESSION BLACKLIST & SIGN OUT REPLAY", () => {
    it("should invalidate the token and session after signOut event is triggered", async () => {
      TokenBlacklist.clear();
      const token = {
        jti: "test_token_jti_123",
        email: "test@example.com",
        name: "Test User",
      };

      // 1. Initially, token and session should be resolved successfully
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr_123",
        email: "test@example.com",
        role: Role.CLIENT,
        profileCompleted: true,
      });

      const nextAuthJwtCallback = authOptions.callbacks?.jwt;
      const nextAuthSessionCallback = authOptions.callbacks?.session;
      const nextAuthSignOutEvent = authOptions.events?.signOut;

      expect(nextAuthJwtCallback).toBeDefined();
      expect(nextAuthSessionCallback).toBeDefined();
      expect(nextAuthSignOutEvent).toBeDefined();

      const resolvedToken = await nextAuthJwtCallback!({ token: { ...token } } as any);
      expect(resolvedToken.id).toBe("usr_123");
      expect(resolvedToken.role).toBe(Role.CLIENT);

      const mockSession = { user: { name: "Test User" }, expires: "2026-12-31" };
      const resolvedSession = await nextAuthSessionCallback!({ session: mockSession as any, token: resolvedToken as any });
      expect(resolvedSession.user).toBeDefined();
      expect(resolvedSession.user?.id).toBe("usr_123");

      // 2. Trigger signOut event (captures and blacklists the token jti)
      await nextAuthSignOutEvent!({ token: resolvedToken as any } as any);

      // 3. Replaying the token now should result in cleared session fields
      const replayedToken = await nextAuthJwtCallback!({ token: { ...token } } as any);
      expect(replayedToken.id).toBeUndefined();
      expect(replayedToken.role).toBeUndefined();

      const replayedSession = await nextAuthSessionCallback!({ session: mockSession as any, token: replayedToken as any });
      expect(replayedSession.user).toBeNull();
    });
  });

  describe("PART 2 / PART 3: public profile connection visibility", () => {
    it("should allow visibility of email and phone only when connection status is ACCEPTED", async () => {
      // Mock session
      mockedGetServerSession.mockResolvedValue({
        user: { id: "viewer_user", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      // Mock profile user
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "profile_user",
        email: "profile@example.com",
        phone: "1234567890",
        name: "Profile User",
        role: Role.FREELANCER,
        businessName: "Business",
        bio: "Bio",
        location: "Location",
        proposals: [],
      });

      // No project relationship or proposal relationship
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(0);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);

      const params = Promise.resolve({ id: "profile_user" });

      // Scenario A: Connection Status is ACCEPTED -> contact fields visible
      (ConnectionService.getConnectionStatus as jest.Mock).mockResolvedValue({
        status: "ACCEPTED",
        id: "conn_123",
        requesterId: "viewer_user",
      });

      let res = await getPublicProfileHandler(new Request("http://localhost/api/users/profile_user/public-profile"), { params });
      expect(res.status).toBe(200);
      let body = await res.json();
      expect(body.isContactVisible).toBe(true);
      expect(body.email).toBe("profile@example.com");
      expect(body.phone).toBe("1234567890");

      // Scenario B: Connection Status is PENDING -> contact fields hidden
      (ConnectionService.getConnectionStatus as jest.Mock).mockResolvedValue({
        status: "PENDING",
        id: "conn_123",
        requesterId: "viewer_user",
      });

      res = await getPublicProfileHandler(new Request("http://localhost/api/users/profile_user/public-profile"), { params });
      expect(res.status).toBe(200);
      body = await res.json();
      expect(body.isContactVisible).toBe(false);
      expect(body.email).toBeUndefined();
      expect(body.phone).toBeUndefined();

      // Scenario C: Connection Status is DECLINED -> contact fields hidden
      (ConnectionService.getConnectionStatus as jest.Mock).mockResolvedValue({
        status: "DECLINED",
        id: "conn_123",
        requesterId: "viewer_user",
      });

      res = await getPublicProfileHandler(new Request("http://localhost/api/users/profile_user/public-profile"), { params });
      expect(res.status).toBe(200);
      body = await res.json();
      expect(body.isContactVisible).toBe(false);
      expect(body.email).toBeUndefined();
      expect(body.phone).toBeUndefined();
    });
  });

  describe("PART 6: RATE LIMITING EXTENSIONS", () => {
    it("should reject project creation if client rate limit is exceeded", async () => {
      (prisma.project.count as jest.Mock).mockResolvedValue(5);

      await expect(
        ProjectService.createProject("client_1", {
          title: "New Project",
          description: "Description longer than 20 chars",
          budget: 500,
          deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          skills: ["React"],
        } as any)
      ).rejects.toThrow("Rate limit exceeded: Maximum of 5 project creations per hour.");
    });

    it("should reject sending messages if message rate limit is exceeded", async () => {
      (prisma.message.count as jest.Mock).mockResolvedValue(60);

      await expect(
        MessageService.sendMessage("project_1", "sender_123", "Hello World")
      ).rejects.toThrow("Rate limit exceeded: Maximum of 60 messages per minute.");
    });

    it("should reject profile updates via API route if rate limit is exceeded", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.auditLog.count as jest.Mock).mockResolvedValue(10);

      const req = new Request("http://localhost/api/users/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Client",
          phone: "9876543210",
          location: "Location",
          businessName: "Business",
        }),
      });

      const res = await completeProfileHandler(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain("Rate limit exceeded: Maximum of 10 profile updates per hour.");
    });

    it("should reject rating submission via API route if rate limit is exceeded", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "rater_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.rating.count as jest.Mock).mockResolvedValue(5);

      const req = new Request("http://localhost/api/projects/proj_1/rating", {
        method: "POST",
        body: JSON.stringify({
          score: 5,
          comment: "Excellent",
        }),
      });

      const res = await rateProjectHandler(req, { params: Promise.resolve({ id: "proj_1" }) });
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain("Rate limit exceeded: Maximum of 5 ratings per minute.");
    });

    it("should reject search query after 100 queries within a minute", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "searcher_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      // Scenario: Call search 100 times successfully
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      for (let i = 0; i < 100; i++) {
        const req = new Request(`http://localhost/api/users/search?role=FREELANCER&query=test`);
        const res = await searchUsersHandler(req);
        expect(res.status).toBe(200);
      }

      // The 101st call should return 429
      const req = new Request(`http://localhost/api/users/search?role=FREELANCER&query=test`);
      const res = await searchUsersHandler(req);
      expect(res.status).toBe(429);
      const body = await res.json();
      expect(body.error).toContain("Rate limit exceeded: Maximum of 100 search queries per minute.");
    });
  });

  describe("PART 4 / PART 8: ZOD SCHEMA WHITESPACE TRIMMING", () => {
    it("should reject whitespace-only strings and correctly trim fields in createProjectSchema", () => {
      // 1. Whitespace only -> fail
      let res = createProjectSchema.safeParse({
        title: "     ",
        description: "                    ",
        budget: 500,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(res.success).toBe(false);

      // 2. Valid with whitespace -> trimmed and passed
      res = createProjectSchema.safeParse({
        title: "  Valid Title   ",
        description: "   This description is longer than twenty characters   ",
        budget: 500,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.title).toBe("Valid Title");
        expect(res.data.description).toBe("This description is longer than twenty characters");
      }
    });

    it("should reject whitespace-only strings and correctly trim fields in submitProposalSchema", () => {
      let res = submitProposalSchema.safeParse({
        message: "          ",
        estimatedDays: 5,
        price: 100,
      });
      expect(res.success).toBe(false);

      res = submitProposalSchema.safeParse({
        message: "   This cover message is long enough to pass validation.   ",
        estimatedDays: 5,
        price: 100,
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.message).toBe("This cover message is long enough to pass validation.");
      }
    });

    it("should reject whitespace-only strings and correctly trim fields in profile completion schemas", () => {
      // Client
      let resClient = completeClientProfileSchema.safeParse({
        name: "   ",
        phone: "9876543210",
        location: "  ",
        businessName: "     ",
      });
      expect(resClient.success).toBe(false);

      resClient = completeClientProfileSchema.safeParse({
        name: "  John Client ",
        phone: "9876543210",
        location: " London ",
        businessName: " Acme Corp ",
      });
      expect(resClient.success).toBe(true);
      if (resClient.success) {
        expect(resClient.data.name).toBe("John Client");
        expect(resClient.data.location).toBe("London");
        expect(resClient.data.businessName).toBe("Acme Corp");
      }

      // Freelancer
      let resFreelancer = completeFreelancerProfileSchema.safeParse({
        name: "   ",
        phone: "9876543210",
        location: "  ",
        bio: "          ",
      });
      expect(resFreelancer.success).toBe(false);

      resFreelancer = completeFreelancerProfileSchema.safeParse({
        name: "  Jane Freelancer ",
        phone: "9876543210",
        location: " Paris ",
        bio: " This is a long biography for testing freelancer. ",
      });
      expect(resFreelancer.success).toBe(true);
      if (resFreelancer.success) {
        expect(resFreelancer.data.name).toBe("Jane Freelancer");
        expect(resFreelancer.data.location).toBe("Paris");
        expect(resFreelancer.data.bio).toBe("This is a long biography for testing freelancer.");
      }
    });
  });

  describe("PART 7 / PART 11: PAGINATION LIMITS BOUNDING", () => {
    it("should clamp listProjects pagination limit parameters between 1 and 100", async () => {
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      // 1. limit: 1000 -> clamps to 100
      await ProjectService.listProjects({ limit: 1000 });
      expect(prisma.project.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );

      // 2. limit: -5 -> defaults to 1
      await ProjectService.listProjects({ limit: -5 });
      expect(prisma.project.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 1,
        })
      );
    });

    it("should clamp listMessages pagination limit parameters between 1 and 100", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_1",
        clientId: "user_123",
        freelancerId: "freelancer_123",
      });
      (prisma.message.count as jest.Mock).mockResolvedValue(0);
      (prisma.message.findMany as jest.Mock).mockResolvedValue([]);

      // 1. limit: 500 -> clamps to 100
      await MessageService.listMessages("proj_1", "user_123", 1, 500);
      expect(prisma.message.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );

      // 2. limit: -10 -> defaults to 1
      await MessageService.listMessages("proj_1", "user_123", 1, -10);
      expect(prisma.message.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          take: 1,
        })
      );
    });
  });
});

