import sgMail from "@sendgrid/mail";
import { SendGridService } from "@/lib/email/sendgrid";
import { NotificationService } from "@/lib/services/notification-service";
import { prisma } from "@/lib/prisma";

// Mock @sendgrid/mail
jest.mock("@sendgrid/mail", () => {
  return {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
  };
});

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    connection: {
      findMany: jest.fn(),
    },
  },
}));

describe("SendGrid Consolidated Mailer Service Audit Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    process.env.SENDGRID_API_KEY = "SG.test_mock_api_key";
    process.env.EMAIL_FROM_ADDRESS = "trustlance.noreply@gmail.com";
    process.env.EMAIL_FROM_NAME = "TrustLance";
    process.env.NODE_ENV = "development";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("Part 1: Key Configuration & Environment Bounds", () => {
    it("should fail loudly in non-production environments if the API key is missing", async () => {
      delete process.env.SENDGRID_API_KEY;
      process.env.NODE_ENV = "development";

      await expect(
        SendGridService.sendFreelancerAssigned("free@test.com", "Free User", "Test Title", "http://test.com")
      ).rejects.toThrow("SENDGRID_API_KEY is missing");
    });

    it("should fail safely in production if the API key is missing (logs warning but doesn't crash)", async () => {
      delete process.env.SENDGRID_API_KEY;
      process.env.NODE_ENV = "production";

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await SendGridService.sendFreelancerAssigned(
        "free@test.com",
        "Free User",
        "Test Title",
        "http://test.com"
      );

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("SENDGRID_API_KEY is missing")
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Part 2: Typed Sender Invocation Assertions", () => {
    it("sendPaymentReceived client variant format matches", async () => {
      const result = await SendGridService.sendPaymentReceived(
        "client@test.com",
        "Client Name",
        "Test Project",
        "http://link.com",
        true
      );

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "client@test.com",
          from: { email: "trustlance.noreply@gmail.com", name: "TrustLance" },
          subject: expect.stringContaining("Payment received"),
          text: expect.stringContaining("successfully received and is now held in escrow"),
        })
      );
    });

    it("sendPaymentReceived freelancer variant format matches", async () => {
      const result = await SendGridService.sendPaymentReceived(
        "free@test.com",
        "Free Name",
        "Test Project",
        "http://link.com",
        false
      );

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "free@test.com",
          text: expect.stringContaining("You can start working on the deliverables now"),
        })
      );
    });

    it("sendChangesRequested passes custom feedback notes in content body", async () => {
      const result = await SendGridService.sendChangesRequested(
        "free@test.com",
        "Free Name",
        "Test Project",
        "http://link.com",
        "Please fix the button alignments."
      );

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "free@test.com",
          text: expect.stringContaining("Please fix the button alignments."),
        })
      );
    });

    it("sendDisputeResolved format matches", async () => {
      const result = await SendGridService.sendDisputeResolved(
        "user@test.com",
        "User Name",
        "Test Project",
        "http://link.com",
        "RELEASE_FUNDS",
        "Arbitrator approved deliverables."
      );

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          text: expect.stringContaining("Resolution: RELEASE_FUNDS"),
        })
      );
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining("Notes:\nArbitrator approved deliverables."),
        })
      );
    });
  });

  describe("Part 3: Resilience, Retry & Fail-Safe Mechanics", () => {
    it("should retry transient failures (e.g. 429/5xx) and succeed on subsequent attempt", async () => {
      // Mock first attempt: fail with 429, second attempt: succeed 202
      const mockError = new Error("Rate limit exceeded") as Error & { code?: number };
      mockError.code = 429;

      (sgMail.send as jest.Mock)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce([{ statusCode: 202 }]);

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await SendGridService.sendFreelancerAssigned(
        "free@test.com",
        "Free User",
        "Test Title",
        "http://test.com"
      );

      expect(result).toBe(true);
      expect(sgMail.send).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Transient error (status: 429). Retrying in")
      );

      consoleWarnSpy.mockRestore();
    });

    it("should fail gracefully, log detailed context without sensitive dispute body if all retries fail", async () => {
      const mockError = new Error("SendGrid system down") as Error & { code?: number; response?: { statusCode?: number; body?: unknown } };
      mockError.code = 503;
      mockError.response = {
        statusCode: 503,
        body: { errors: [{ message: "Service Unavailable" }] },
      };

      (sgMail.send as jest.Mock).mockRejectedValue(mockError);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await SendGridService.sendDisputeRaised(
        "user@test.com",
        "User Name",
        "Project A",
        "http://link",
        "Extremely long dispute text with sensitive credentials"
      );

      // Should complete gracefully, return false, and not bubble up to request 500 crash
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Final delivery failure for trigger "DISPUTE_RAISED"')
      );
      // Verify sensitive text of dispute is not logged in the warning
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Extremely long dispute text")
      );

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Part 4: NotificationService Integration", () => {
    it("PAYMENT_RECEIVED triggers correct SendGridService calls", async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: "proj_123",
        title: "Test Project",
        client: { id: "c1", email: "client@test.com", name: "Client User" },
        freelancer: { id: "f1", email: "free@test.com", name: "Free User" },
      });

      const spyClient = jest.spyOn(SendGridService, "sendPaymentReceived").mockResolvedValue(true);

      await NotificationService.notify("PAYMENT_RECEIVED", { projectId: "proj_123" });

      expect(spyClient).toHaveBeenCalledTimes(2);
      expect(spyClient).toHaveBeenNthCalledWith(1, "client@test.com", "Client User", "Test Project", expect.any(String), true);
      expect(spyClient).toHaveBeenNthCalledWith(2, "free@test.com", "Free User", "Test Project", expect.any(String), false);
    });

    it("CONNECTION_REQUEST_RECEIVED triggers invite mail to recipient", async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
        if (args.where.id === "req_1") {
          return Promise.resolve({ id: "req_1", name: "Alice Requester" });
        }
        if (args.where.id === "add_1") {
          return Promise.resolve({ id: "add_1", name: "Bob Addressee", email: "bob@test.com" });
        }
        return Promise.resolve(null);
      });

      const spyInvite = jest.spyOn(SendGridService, "sendConnectionRequestReceived").mockResolvedValue(true);

      await NotificationService.notify("CONNECTION_REQUEST_RECEIVED", {
        requesterId: "req_1",
        addresseeId: "add_1",
      });

      expect(spyInvite).toHaveBeenCalledTimes(1);
      expect(spyInvite).toHaveBeenCalledWith("bob@test.com", "Bob Addressee", "Alice Requester");
    });
  });
});
