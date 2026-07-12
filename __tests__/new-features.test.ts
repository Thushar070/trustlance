import { Role, ProjectStatus } from "@prisma/client";
import { ProjectService } from "@/lib/services/project-service";
import { MessageService } from "@/lib/services/message-service";
import { GET as getProjectDetailHandler } from "@/app/api/projects/[id]/route";
import { GET as listProjectsHandler } from "@/app/api/projects/route";
import { GET as getAssignmentsHandler } from "@/app/api/admin/assignments/route";
import { PATCH as updateProfileHandler } from "@/app/api/users/me/route";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validators/project";

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
    dispute: {
      findFirst: jest.fn(),
    },
    rating: {
      findUnique: jest.fn(),
    },
  },
}));

describe("New Features Unit & API Gating Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Part A: Restrict Project Visibility", () => {
    it("1. CLIENT calling GET /api/projects is restricted to only their own projects", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", email: "client@test.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      const listSpy = jest.spyOn(ProjectService, "listProjects").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new Request("http://localhost:3000/api/projects?clientId=someone_else");
      const response = await listProjectsHandler(request);

      expect(response.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "client_123", // forced scope override
          currentUserId: "client_123",
        })
      );

      listSpy.mockRestore();
    });

    it("2. FREELANCER calling GET /api/projects still sees all OPEN projects as before", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "freelancer_123", email: "freelancer@test.com", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      const listSpy = jest.spyOn(ProjectService, "listProjects").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new Request("http://localhost:3000/api/projects?status=OPEN");
      const response = await listProjectsHandler(request);

      expect(response.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "OPEN",
          clientId: undefined, // no forced client override
          currentUserId: "freelancer_123",
        })
      );

      listSpy.mockRestore();
    });

    it("3. Regression check: My Projects still returns the Client's own projects", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", email: "client@test.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      const listSpy = jest.spyOn(ProjectService, "listProjects").mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const request = new Request("http://localhost:3000/api/projects?clientId=client_123");
      const response = await listProjectsHandler(request);

      expect(response.status).toBe(200);
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: "client_123",
          currentUserId: "client_123",
        })
      );

      listSpy.mockRestore();
    });
  });

  describe("Part B: Optional Skills Verification", () => {
    it("1. Permissive schema validation should allow project creation with zero skills", () => {
      const payload = {
        title: "Test Optional Skills Title",
        description: "Test Optional Skills description that is sufficiently long.",
        budget: 10000,
        deadline: new Date(Date.now() + 86400000).toISOString(),
        skills: [], // empty skills array
      };

      const result = createProjectSchema.safeParse(payload);
      expect(result.success).toBe(true);
      expect(result.data.skills).toEqual([]);
    });
  });

  describe("Part C: Tighten Admin visibility bounds", () => {
    it("1. GET /api/admin/assignments returns only flat assignments directory and no description/budget", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "admin_123", email: "admin@test.com", role: Role.ADMIN },
        expires: "2026-12-31",
      });

      const mockProjects = [
        {
          id: "proj_123",
          title: "Assigned Project title",
          status: ProjectStatus.ASSIGNED,
          description: "Top secret detailed description",
          budget: 50000,
          client: { name: "Client Corp", email: "client@test.com" },
          freelancer: { name: "Freelancer Dev", email: "freelancer@test.com" },
          escrow: { dispute: { id: "disp_123" } },
        },
      ];
      (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);

      const response = await getAssignmentsHandler();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({
        projectId: "proj_123",
        projectTitle: "Assigned Project title",
        projectStatus: "ASSIGNED",
        clientName: "Client Corp",
        clientEmail: "client@test.com",
        freelancerName: "Freelancer Dev",
        freelancerEmail: "freelancer@test.com",
        disputeId: "disp_123",
      });
      // Verify descriptions or budgets are never leaked
      expect(data[0].description).toBeUndefined();
      expect(data[0].budget).toBeUndefined();
    });

    it("2. Admin is rejected (403) from GET /api/projects/:id for a project with NO dispute at all", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "admin_123", email: "admin@test.com", role: Role.ADMIN },
        expires: "2026-12-31",
      });

      const mockProject = {
        id: "proj_123",
        clientId: "client_123",
        freelancerId: "freelancer_123",
        status: ProjectStatus.ASSIGNED,
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.dispute.findFirst as jest.Mock).mockResolvedValue(null); // No dispute

      const request = new Request("http://localhost:3000/api/projects/proj_123");
      const response = await getProjectDetailHandler(request, {
        params: Promise.resolve({ id: "proj_123" }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("3. Admin IS granted access to GET /api/projects/:id for a project WITH an active/resolved dispute", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "admin_123", email: "admin@test.com", role: Role.ADMIN },
        expires: "2026-12-31",
      });

      const mockProject = {
        id: "proj_123",
        clientId: "client_123",
        freelancerId: "freelancer_123",
        status: ProjectStatus.ASSIGNED,
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.dispute.findFirst as jest.Mock).mockResolvedValue({ id: "dispute_123", status: "OPEN" }); // Has active dispute

      const request = new Request("http://localhost:3000/api/projects/proj_123");
      const response = await getProjectDetailHandler(request, {
        params: Promise.resolve({ id: "proj_123" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.id).toBe("proj_123");
    });

    it("4. Regression: Admin is STILL rejected from messaging actions even when a dispute is open", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        status: ProjectStatus.ASSIGNED,
        clientId: "client_123",
        freelancerId: "freelancer_123",
      });

      // listMessages reject
      await expect(
        MessageService.listMessages("proj_123", "admin_user_id")
      ).rejects.toThrow("Forbidden: Access denied.");

      // sendMessage reject
      await expect(
        MessageService.sendMessage("proj_123", "admin_user_id", "Dispute review inject message")
      ).rejects.toThrow("Forbidden: You are not authorized to message on this project.");
    });
  });

  describe("Part E: User Profile updates", () => {
    it("PATCH /api/users/me fails with short phone number", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_123", email: "user@gmail.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      const request = new Request("http://localhost:3000/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ phone: "123" }),
      });

      const response = await updateProfileHandler(request);
      expect(response.status).toBe(400);
    });
  });
});
