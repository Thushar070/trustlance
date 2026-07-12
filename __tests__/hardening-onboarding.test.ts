/* eslint-disable @typescript-eslint/no-explicit-any */
import { Role } from "@prisma/client";
import { middleware } from "../middleware";
import { POST as completeProfileHandler } from "../app/api/users/complete-profile/route";
import { GET as adminOverviewHandler } from "../app/api/admin/overview/route";
import { GET as adminAssignmentsHandler } from "../app/api/admin/assignments/route";
import { POST as adminAutoReleaseHandler } from "../app/api/admin/run-auto-release/route";
import { POST as adminReconcileHandler } from "../app/api/admin/payments/[paymentId]/reconcile-escrow/route";
import { GET as auditLogsHandler } from "../app/api/audit-logs/[entityId]/route";
import { getServerSession } from "@/lib/auth/get-server-session";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

// Mock NextAuth helpers
jest.mock("@/lib/auth/get-server-session");
jest.mock("next-auth/jwt");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    project: {
      groupBy: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
  },
}));

describe("Security Hardening & Onboarding Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
  const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Part 2: Admin API Route Gating (CLIENT & FREELANCER Rejection)", () => {
    const rolesToTest = [Role.CLIENT, Role.FREELANCER];

    rolesToTest.forEach((role) => {
      describe(`Gating check for Role: ${role}`, () => {
        beforeEach(() => {
          mockedGetServerSession.mockResolvedValue({
            user: { id: "user_123", email: "user@test.com", role },
            expires: "2026-12-31",
          });
        });

        it("should reject access to GET /api/admin/overview", async () => {
          const res = await adminOverviewHandler();
          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error).toContain("Forbidden");
        });

        it("should reject access to GET /api/admin/assignments", async () => {
          const res = await adminAssignmentsHandler();
          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error).toContain("Forbidden");
        });

        it("should reject access to POST /api/admin/run-auto-release", async () => {
          const req = new Request("http://localhost:3000/api/admin/run-auto-release", {
            method: "POST",
          });
          const res = await adminAutoReleaseHandler(req);
          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error).toContain("Forbidden");
        });

        it("should reject access to POST /api/admin/payments/:id/reconcile-escrow", async () => {
          const req = new Request("http://localhost:3000/api/admin/payments/pay_123/reconcile-escrow", {
            method: "POST",
          });
          const params = Promise.resolve({ paymentId: "pay_123" });
          const res = await adminReconcileHandler(req, { params });
          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error).toContain("Forbidden");
        });

        it("should reject access to GET /api/audit-logs/:id", async () => {
          const req = new Request("http://localhost:3000/api/audit-logs/proj_123?type=PROJECT");
          const params = Promise.resolve({ entityId: "proj_123" });
          const res = await auditLogsHandler(req, { params });
          expect(res.status).toBe(403);
          const body = await res.json();
          expect(body.error).toContain("Forbidden");
        });
      });
    });
  });

  describe("Part 3: Onboarding complete-profile API Validations", () => {
    it("1. should reject submission if missing name, phone or location", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", email: "client@test.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "client_123",
        role: Role.CLIENT,
        profileCompleted: false,
      });

      const req = new Request("http://localhost:3000/api/users/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          name: "Test Name",
          // missing phone, location, businessName
        }),
      });

      const res = await completeProfileHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Validation failed.");
      expect(body.details.phone).toBeDefined();
      expect(body.details.location).toBeDefined();
    });

    it("2. should reject Client if businessName is missing", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", email: "client@test.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "client_123",
        role: Role.CLIENT,
        profileCompleted: false,
      });

      const req = new Request("http://localhost:3000/api/users/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          name: "Client Name",
          phone: "+15555555555",
          location: "California, USA",
          // missing businessName for client
        }),
      });

      const res = await completeProfileHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details.businessName).toBeDefined();
    });

    it("3. should reject Freelancer if bio is missing or too short", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "free_123", email: "free@test.com", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "free_123",
        role: Role.FREELANCER,
        profileCompleted: false,
      });

      const req = new Request("http://localhost:3000/api/users/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          name: "Freelancer Name",
          phone: "+15555555555",
          location: "Delhi, India",
          bio: "short", // bio too short (<10 chars)
        }),
      });

      const res = await completeProfileHandler(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.details.bio).toBeDefined();
    });

    it("4. should successfully update profileCompleted on valid parameters", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "free_123", email: "free@test.com", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "free_123",
        role: Role.FREELANCER,
        profileCompleted: false,
      });

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "free_123",
        profileCompleted: true,
      });

      const req = new Request("http://localhost:3000/api/users/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          name: "Freelancer Name",
          phone: "+15555555555",
          location: "Delhi, India",
          bio: "This is a valid freelancer biography text of reasonable length.",
        }),
      });

      const res = await completeProfileHandler(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "free_123" },
        data: {
          name: "Freelancer Name",
          phone: "+15555555555",
          location: "Delhi, India",
          bio: "This is a valid freelancer biography text of reasonable length.",
          profileCompleted: true,
        },
      });
    });
  });

  describe("Part 3: Middleware Onboarding & Redirection States", () => {
    it("1. should redirect unauthenticated visitor to /login (except root landing or login pages)", async () => {
      mockedGetToken.mockResolvedValue(null);

      const req1 = new NextRequest("http://localhost:3000/client/projects");
      const res1 = await middleware(req1);
      expect(res1?.status).toBe(307);
      expect(res1?.headers.get("location")).toBe("http://localhost:3000/login");

      const req2 = new NextRequest("http://localhost:3000/");
      const res2 = await middleware(req2);
      expect(res2?.headers.get("location")).toBeNull();
    });

    it("2. should redirect authenticated user with no role to /select-role", async () => {
      mockedGetToken.mockResolvedValue({
        email: "newuser@test.com",
        role: null,
        profileCompleted: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/client/projects");
      const res = await middleware(req);
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/select-role");
    });

    it("3. should redirect user with role but profile incomplete to /complete-profile", async () => {
      mockedGetToken.mockResolvedValue({
        email: "client@test.com",
        role: Role.CLIENT,
        profileCompleted: false,
      } as any);

      const req = new NextRequest("http://localhost:3000/client/projects");
      const res = await middleware(req);
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/complete-profile");
    });

    it("4. should allow normal route access once role and profileCompleted are true", async () => {
      mockedGetToken.mockResolvedValue({
        email: "client@test.com",
        role: Role.CLIENT,
        profileCompleted: true,
      } as any);

      const req = new NextRequest("http://localhost:3000/client/projects");
      const res = await middleware(req);
      expect(res?.headers.get("location")).toBeNull();
    });

    it("5. should block non-admins from /admin/* paths and redirect them to root", async () => {
      mockedGetToken.mockResolvedValue({
        email: "client@test.com",
        role: Role.CLIENT,
        profileCompleted: true,
      } as any);

      const req = new NextRequest("http://localhost:3000/admin/overview");
      const res = await middleware(req);
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/");
    });

    it("6. should block clients from /projects list and redirect to /client/projects", async () => {
      mockedGetToken.mockResolvedValue({
        email: "client@test.com",
        role: Role.CLIENT,
        profileCompleted: true,
      } as any);

      const req = new NextRequest("http://localhost:3000/projects");
      const res = await middleware(req);
      expect(res?.status).toBe(307);
      expect(res?.headers.get("location")).toBe("http://localhost:3000/client/projects");
    });
  });
});
