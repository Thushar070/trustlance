import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { getToken } from "next-auth/jwt";
import { POST as selectRoleHandler } from "@/app/api/auth/select-role/route";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

// Mock NextAuth helpers
jest.mock("next-auth/jwt");
jest.mock("@/lib/auth/get-server-session");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("Authentication & RBAC Integration Tests", () => {
  const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Middleware Redirection Flows", () => {
    it("should redirect new Google login (no role yet) to /select-role", async () => {
      // Mock session token with no role
      mockedGetToken.mockResolvedValue({
        email: "newuser@gmail.com",
        name: "New User",
        role: null,
      });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response!.headers.get("location")).toBe("http://localhost:3000/select-role");
    });

    it("should allow request if user already has a role and profile is complete", async () => {
      // Mock session token with CLIENT role
      mockedGetToken.mockResolvedValue({
        email: "client@gmail.com",
        name: "Client User",
        role: Role.CLIENT,
        profileCompleted: true,
      });

      const request = new NextRequest("http://localhost:3000/dashboard");
      const response = await middleware(request);

      if (response) {
        expect(response.headers.get("location")).toBeNull();
      }
    });

    it("should redirect from /select-role to home if user already has a role and profile is complete", async () => {
      // Mock session token with FREELANCER role
      mockedGetToken.mockResolvedValue({
        email: "freelancer@gmail.com",
        name: "Freelancer User",
        role: Role.FREELANCER,
        profileCompleted: true,
      });

      const request = new NextRequest("http://localhost:3000/select-role");
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response!.headers.get("location")).toBe("http://localhost:3000/");
    });
  });

  describe("Role Selection API (/api/auth/select-role)", () => {
    it("should update and persist user role successfully", async () => {
      // Mock active session
      mockedGetServerSession.mockResolvedValue({
        user: { email: "newuser@gmail.com", name: "New User" },
        expires: "2026-12-31",
      });

      // Mock database state (user exists, role is null)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr_999",
        email: "newuser@gmail.com",
        role: null,
      });

      // Mock database update response
      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "usr_999",
        email: "newuser@gmail.com",
        name: "New User",
        role: Role.CLIENT,
      });

      const request = new Request("http://localhost:3000/api/auth/select-role", {
        method: "POST",
        body: JSON.stringify({ role: Role.CLIENT }),
      });

      const response = await selectRoleHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.role).toBe(Role.CLIENT);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "usr_999" },
        data: { role: Role.CLIENT },
      });
    });

    it("should reject role update if user already has a role assigned", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { email: "hasrole@gmail.com", name: "Has Role User" },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "usr_888",
        email: "hasrole@gmail.com",
        role: Role.FREELANCER,
      });

      const request = new Request("http://localhost:3000/api/auth/select-role", {
        method: "POST",
        body: JSON.stringify({ role: Role.CLIENT }),
      });

      const response = await selectRoleHandler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Role has already been assigned");
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("Middleware & Webhook Bypass Regression Tests", () => {
    it("should allow a request to /api/webhooks/razorpay with NO session cookie", async () => {
      mockedGetToken.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/webhooks/razorpay", {
        method: "POST"
      });
      const response = await middleware(request);

      // If middleware returns a response (like NextResponse.next()), it shouldn't redirect or be 401
      if (response) {
        expect(response.headers.get("location")).toBeNull();
        expect(response.status).not.toBe(401);
      }
    });

    it("should reject a request to other /api/* routes with 401 if NO session cookie is present", async () => {
      mockedGetToken.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/projects");
      const response = await middleware(request);

      expect(response).toBeDefined();
      expect(response!.status).toBe(401);
      const data = await response!.json();
      expect(data.error).toContain("Unauthorized");
    });
  });
});
