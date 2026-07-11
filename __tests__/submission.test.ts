import { POST as presignHandler } from "@/app/api/uploads/presign/route";
import { POST as submitWorkHandler } from "@/app/api/projects/[id]/submit-work/route";
import { GET as listSubmissionsHandler } from "@/app/api/projects/[id]/submissions/route";
import { presignRequestSchema, createSubmissionSchema } from "@/lib/validators/submission";
import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, ProjectStatus, EscrowStatus } from "@prisma/client";

// Mock auth guards
jest.mock("@/lib/auth/require-role");
jest.mock("@/lib/auth/get-server-session");

// Mock S3 storage SDK
jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.amazonaws.com/mock-signed-url"),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => {
  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    escrow: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    submission: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };
  return { prisma: mockPrisma };
});

describe("Phase 6: Submission Tests", () => {
  const mockedRequireRole = requireRole as jest.MockedFunction<typeof requireRole>;
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Unit: File Upload Validations", () => {
    it("file upload validation rejects a disallowed file type", () => {
      const result = presignRequestSchema.safeParse({
        fileName: "malicious.exe",
        contentType: "application/x-msdownload",
        fileSize: 1000,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.contentType?.[0]).toContain("File type is not allowed");
      }
    });

    it("file upload validation rejects a file over the size limit", () => {
      const result = presignRequestSchema.safeParse({
        fileName: "archive.zip",
        contentType: "application/zip",
        fileSize: 60 * 1024 * 1024, // 60MB
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fileSize?.[0]).toContain("File size must not exceed 50MB");
      }
    });
  });

  describe("Integration: Work Submission Roles & Invariants", () => {
    it("only the assigned Freelancer can submit work on a given project", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "freelancer_other", role: Role.FREELANCER },
          expires: "2026-12-31",
        },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        freelancerId: "freelancer_assigned",
        status: ProjectStatus.ASSIGNED,
        escrow: {
          status: EscrowStatus.HOLDING,
        },
      });

      const req = new Request("http://localhost/api/projects/proj_123/submit-work", {
        method: "POST",
        body: JSON.stringify({
          fileUrl: "https://bucket.s3.amazonaws.com/submissions/file.zip",
        }),
      });

      const res = await submitWorkHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("You are not the assigned freelancer");
    });

    it("submission requires at least one of file/GitHub/demo link — rejects an entirely empty submission", async () => {
      const result = createSubmissionSchema.safeParse({
        fileUrl: "",
        githubLink: "",
        demoLink: "",
        notes: "Some note text.",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.fileUrl?.[0]).toContain("At least one of File, GitHub link, or Demo link");
      }
    });

    it("submitting work correctly transitions both Project.status and Escrow.status via escrow-service.ts and writes audit logs", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "freelancer_123", role: Role.FREELANCER },
          expires: "2026-12-31",
        },
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        freelancerId: "freelancer_123",
        status: ProjectStatus.ASSIGNED,
        escrow: {
          id: "esc_123",
          status: EscrowStatus.HOLDING,
        },
      });

      (prisma.submission.create as jest.Mock).mockResolvedValue({
        id: "sub_123",
        projectId: "proj_123",
      });

      const req = new Request("http://localhost/api/projects/proj_123/submit-work", {
        method: "POST",
        body: JSON.stringify({
          githubLink: "https://github.com/user/repo",
          notes: "Work submitted.",
        }),
      });

      (prisma.escrow.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "esc_123", status: EscrowStatus.HOLDING })
        .mockResolvedValueOnce({ id: "esc_123", status: EscrowStatus.WORK_SUBMITTED });

      const res = await submitWorkHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe("sub_123");

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: "proj_123" },
        data: { status: ProjectStatus.UNDER_REVIEW },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Project",
          entityId: "proj_123",
          action: "TRANSITION_UNDER_REVIEW",
          actorId: "freelancer_123",
          prevState: ProjectStatus.ASSIGNED,
          newState: ProjectStatus.UNDER_REVIEW,
        }),
      }));

      expect(prisma.escrow.update).toHaveBeenNthCalledWith(1, {
        where: { id: "esc_123" },
        data: { status: EscrowStatus.WORK_SUBMITTED },
      });
      expect(prisma.escrow.update).toHaveBeenNthCalledWith(2, {
        where: { id: "esc_123" },
        data: { status: EscrowStatus.UNDER_REVIEW },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Escrow",
          entityId: "esc_123",
          action: "TRANSITION_WORK_SUBMITTED",
          actorId: "freelancer_123",
          prevState: "HOLDING",
          newState: "WORK_SUBMITTED",
        }),
      }));
      expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          entityType: "Escrow",
          entityId: "esc_123",
          action: "TRANSITION_UNDER_REVIEW",
          actorId: "freelancer_123",
          prevState: "WORK_SUBMITTED",
          newState: "UNDER_REVIEW",
        }),
      }));
    });

    it("only the project's Client and assigned Freelancer can view a project's submissions", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "user_third_party", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        clientId: "client_assigned",
        freelancerId: "freelancer_assigned",
      });

      const req = new Request("http://localhost/api/projects/proj_123/submissions", {
        method: "GET",
      });

      const res = await listSubmissionsHandler(req, { params: Promise.resolve({ id: "proj_123" }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Only the client owner or the assigned freelancer");
    });

    it("presign API route generates S3 upload details for Freelancer", async () => {
      mockedRequireRole.mockResolvedValue({
        authorized: true,
        status: 200,
        error: null,
        session: {
          user: { id: "freelancer_123", role: Role.FREELANCER },
          expires: "2026-12-31",
        },
      });

      const req = new Request("http://localhost/api/uploads/presign", {
        method: "POST",
        body: JSON.stringify({
          fileName: "test.zip",
          contentType: "application/zip",
          fileSize: 1024,
        }),
      });

      const res = await presignHandler(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.uploadUrl).toBe("https://s3.amazonaws.com/mock-signed-url");
      expect(data.fileUrl).toContain("submissions/");
    });
  });
});
