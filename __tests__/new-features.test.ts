import { Role, ProjectStatus } from "@prisma/client";
import { ProjectService } from "@/lib/services/project-service";
import { MessageService } from "@/lib/services/message-service";
import { GET as getProjectDetailHandler } from "@/app/api/projects/[id]/route";
import { POST as postMessageHandler, GET as getMessagesHandler } from "@/app/api/projects/[id]/messages/route";
import { PATCH as updateProfileHandler, GET as getProfileHandler } from "@/app/api/users/me/route";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";

// Mock NextAuth helpers
jest.mock("@/lib/auth/get-server-session");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("New Features Unit & API Gating Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Part A: Restrict Project Visibility", () => {
    it("ProjectService.listProjects should filter out non-OPEN status unless user is client/freelancer owner", async () => {
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);

      await ProjectService.listProjects({
        status: ProjectStatus.ASSIGNED,
        currentUserId: "freelancer_123",
      });

      expect(prisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ProjectStatus.ASSIGNED,
            AND: [
              {
                OR: [
                  { clientId: "freelancer_123" },
                  { freelancerId: "freelancer_123" },
                ],
              },
            ],
          }),
        })
      );
    });

    it("GET /api/projects/[id] should forbid access to non-related users for non-OPEN projects", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "third_party_user", email: "third@gmail.com", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      // Mock project is ASSIGNED to a different user
      const mockProject = {
        id: "proj_123",
        clientId: "client_123",
        freelancerId: "freelancer_123",
        status: ProjectStatus.ASSIGNED,
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const request = new Request("http://localhost:3000/api/projects/proj_123");
      const response = await getProjectDetailHandler(request, {
        params: Promise.resolve({ id: "proj_123" }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });
  });

  describe("Part B: Client-Freelancer Messaging", () => {
    it("MessageService should block messaging on OPEN projects", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        status: ProjectStatus.OPEN,
        clientId: "client_123",
        freelancerId: null,
      });

      await expect(
        MessageService.sendMessage("proj_123", "client_123", "Hello world")
      ).rejects.toThrow("Cannot message on a project that is still open.");
    });

    it("MessageService should deny Admins from viewing or sending messages directly", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        status: ProjectStatus.ASSIGNED,
        clientId: "client_123",
        freelancerId: "freelancer_123",
      });

      // Attempt view as admin_user
      await expect(
        MessageService.listMessages("proj_123", "admin_user_id")
      ).rejects.toThrow("Forbidden: Access denied.");

      // Attempt send as admin_user
      await expect(
        MessageService.sendMessage("proj_123", "admin_user_id", "Inject msg")
      ).rejects.toThrow("Forbidden: You are not authorized to message on this project.");
    });
  });

  describe("Part C: User Profile Pages", () => {
    it("PATCH /api/users/me should fail when phone number format is invalid", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", email: "user@gmail.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      const request = new Request("http://localhost:3000/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ phone: "123" }), // too short
      });

      const response = await updateProfileHandler(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Validation failed");
      expect(data.details.phone[0]).toBe("Invalid phone number format.");
    });

    it("PATCH /api/users/me should succeed when profile details are correct", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", email: "user@gmail.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.update as jest.Mock).mockResolvedValue({
        id: "user_123",
        email: "user@gmail.com",
        name: "Jane Updated",
        phone: "+919876543210",
        location: "Bangalore",
        businessName: "Trust Corp",
        bio: "Bio here",
      });

      const request = new Request("http://localhost:3000/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: "Jane Updated",
          phone: "+919876543210",
          location: "Bangalore",
          businessName: "Trust Corp",
          bio: "Bio here",
        }),
      });

      const response = await updateProfileHandler(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe("Jane Updated");
      expect(data.phone).toBe("+919876543210");
    });
  });
});
