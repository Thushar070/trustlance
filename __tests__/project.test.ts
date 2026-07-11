import { createProjectSchema } from "@/lib/validators/project";
import { POST as createProjectHandler, GET as listProjectsHandler } from "@/app/api/projects/route";
import { PATCH as updateProjectHandler } from "@/app/api/projects/[id]/route";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus } from "@prisma/client";

// Mock NextAuth helpers
jest.mock("@/lib/auth/require-role");
jest.mock("@/lib/auth/get-server-session");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("Project Posting Validator Unit Tests", () => {
  it("should reject a project with a past deadline", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const result = createProjectSchema.safeParse({
      title: "Valid Project Title",
      description: "This is a valid project description of at least twenty characters.",
      budget: 5000,
      deadline: yesterday.toISOString(),
      skills: ["React"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.deadline?.[0]).toContain("Deadline must be in the future");
    }
  });

  it("should reject a project with budget <= 0", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const result = createProjectSchema.safeParse({
      title: "Valid Project Title",
      description: "This is a valid project description of at least twenty characters.",
      budget: 0,
      deadline: tomorrow.toISOString(),
      skills: ["React"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.budget?.[0]).toContain("Budget must be greater than 0");
    }
  });

  it("should reject a project with zero skills listed", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const result = createProjectSchema.safeParse({
      title: "Valid Project Title",
      description: "This is a valid project description of at least twenty characters.",
      budget: 5000,
      deadline: tomorrow.toISOString(),
      skills: [],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.skills?.[0]).toContain("At least one skill is required");
    }
  });
});

describe("Project Posting API Integration Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should allow a Client to create a project and retrieve it in list query", async () => {
    // 1. Mock client authorization
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_123", email: "client@ssn.edu.in", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const projectPayload = {
      title: "Create Next Escrow",
      description: "Implementing backend state control and payment gateways for client reviews.",
      budget: 12000,
      deadline: tomorrow.toISOString(),
      skills: ["React", "Node.js"],
    };

    const mockCreatedProject = {
      id: "proj_999",
      clientId: "client_123",
      ...projectPayload,
      status: ProjectStatus.OPEN,
      createdAt: new Date(),
    };
    (prisma.project.create as jest.Mock).mockResolvedValue(mockCreatedProject);

    // Call POST handler
    const postReq = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify(projectPayload),
    });
    const postRes = await createProjectHandler(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(201);
    expect(postData.id).toBe("proj_999");
    expect(prisma.project.create).toHaveBeenCalled();

    // 2. Mock GET list query
    mockedGetServerSession.mockResolvedValue({
      user: { id: "client_123", role: Role.CLIENT },
      expires: "2026-12-31",
    });

    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        ...mockCreatedProject,
        client: { name: "Client User" },
      },
    ]);

    const getReq = new Request("http://localhost:3000/api/projects?status=OPEN");
    const getRes = await listProjectsHandler(getReq);
    const getData = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(getData.items.length).toBe(1);
    expect(getData.items[0].id).toBe("proj_999");
  });

  it("should reject project update (PATCH) if client does not own the project", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_other", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_999",
      clientId: "client_123",
      title: "Other Title",
      status: ProjectStatus.OPEN,
    });

    const patchReq = new Request("http://localhost:3000/api/projects/proj_999", {
      method: "PATCH",
      body: JSON.stringify({ title: "Hack Title" }),
    });

    const patchRes = await updateProjectHandler(patchReq, { params: Promise.resolve({ id: "proj_999" }) });
    const patchData = await patchRes.json();

    expect(patchRes.status).toBe(403);
    expect(patchData.error).toContain("You do not own this project");
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("should prevent updating a project whose status is no longer OPEN", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: true,
      status: 200,
      error: null,
      session: {
        user: { id: "client_123", role: Role.CLIENT },
        expires: "2026-12-31",
      },
    });

    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_999",
      clientId: "client_123",
      title: "Some Project",
      status: ProjectStatus.ASSIGNED,
    });

    const patchReq = new Request("http://localhost:3000/api/projects/proj_999", {
      method: "PATCH",
      body: JSON.stringify({ title: "New Title" }),
    });

    const patchRes = await updateProjectHandler(patchReq, { params: Promise.resolve({ id: "proj_999" }) });
    const patchData = await patchRes.json();

    expect(patchRes.status).toBe(403);
    expect(patchData.error).toContain("status is no longer OPEN");
    expect(prisma.project.update).not.toHaveBeenCalled();
  });

  it("should reject project creation if user is a Freelancer", async () => {
    mockedRequireRole.mockResolvedValue({
      authorized: false,
      status: 403,
      error: "Forbidden: Mismatched role.",
      session: null,
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);

    const payload = {
      title: "Freelancer Attempts Post",
      description: "Should fail authorization checks immediately due to wrong role.",
      budget: 15000,
      deadline: tomorrow.toISOString(),
      skills: ["React"],
    };

    const postReq = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const postRes = await createProjectHandler(postReq);
    const postData = await postRes.json();

    expect(postRes.status).toBe(403);
    expect(postData.error).toContain("Forbidden");
    expect(prisma.project.create).not.toHaveBeenCalled();
  });
});
