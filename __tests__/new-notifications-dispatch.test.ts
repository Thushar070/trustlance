import { NotificationService } from "@/lib/services/notification-service";
import { Mailer } from "@/lib/notifications/mailer";
import { prisma } from "@/lib/prisma";

// Mock Mailer
jest.mock("@/lib/notifications/mailer", () => {
  return {
    Mailer: {
      sendEmail: jest.fn().mockResolvedValue(true),
    },
  };
});

// Mock Prisma Client
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

describe("New Transactional Notification Triggers & Templates Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("1. PROPOSAL_SUBMITTED triggers email to the project client owner", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_123",
      title: "Test Escrow Contract",
      client: { id: "client_1", email: "client_one@example.com" },
      freelancer: null,
    });

    await NotificationService.notify("PROPOSAL_SUBMITTED", { projectId: "proj_123" });

    expect(Mailer.sendEmail).toHaveBeenCalledTimes(1);
    expect(Mailer.sendEmail).toHaveBeenCalledWith(
      "client_one@example.com",
      expect.stringContaining("New proposal submitted"),
      expect.stringContaining("A freelancer has submitted a new proposal")
    );
  });

  it("2. CONNECTION_REQUEST_RECEIVED triggers email to the invite addressee", async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === "requester_id") {
        return Promise.resolve({ id: "requester_id", name: "Alice Requester" });
      }
      if (args.where.id === "addressee_id") {
        return Promise.resolve({ id: "addressee_id", name: "Bob Addressee", email: "bob@example.com" });
      }
      return Promise.resolve(null);
    });

    await NotificationService.notify("CONNECTION_REQUEST_RECEIVED", {
      requesterId: "requester_id",
      addresseeId: "addressee_id",
    });

    expect(Mailer.sendEmail).toHaveBeenCalledTimes(1);
    expect(Mailer.sendEmail).toHaveBeenCalledWith(
      "bob@example.com",
      expect.stringContaining("New connection request from Alice Requester"),
      expect.stringContaining("Alice Requester has sent you a connection request")
    );
  });

  it("3. CONNECTION_ACCEPTED triggers email to the original requester", async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation((args) => {
      if (args.where.id === "requester_id") {
        return Promise.resolve({ id: "requester_id", name: "Alice Requester", email: "alice@example.com" });
      }
      if (args.where.id === "addressee_id") {
        return Promise.resolve({ id: "addressee_id", name: "Bob Addressee" });
      }
      return Promise.resolve(null);
    });

    await NotificationService.notify("CONNECTION_ACCEPTED", {
      requesterId: "requester_id",
      addresseeId: "addressee_id",
    });

    expect(Mailer.sendEmail).toHaveBeenCalledTimes(1);
    expect(Mailer.sendEmail).toHaveBeenCalledWith(
      "alice@example.com",
      expect.stringContaining("Connection request accepted by Bob Addressee"),
      expect.stringContaining("Bob Addressee has accepted your connection request")
    );
  });

  it("4. NEW_PROJECT_FROM_CONNECTION notifies all connected freelancers", async () => {
    // Project details
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_123",
      title: "Premium React App Redesign",
      clientId: "client_id",
      client: { id: "client_id", name: "John Client", email: "john@example.com" },
    });

    // Connection listing: two connected freelancers
    (prisma.connection.findMany as jest.Mock).mockResolvedValue([
      { id: "c1", requesterId: "client_id", addresseeId: "free_1" },
      { id: "c2", requesterId: "free_2", addresseeId: "client_id" },
    ]);

    // Freelancer profiles
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: "free_1", name: "Freelancer One", email: "free1@example.com" },
      { id: "free_2", name: "Freelancer Two", email: "free2@example.com" },
    ]);

    await NotificationService.notify("NEW_PROJECT_FROM_CONNECTION", { projectId: "proj_123" });

    expect(Mailer.sendEmail).toHaveBeenCalledTimes(2);
    expect(Mailer.sendEmail).toHaveBeenNthCalledWith(
      1,
      "free1@example.com",
      expect.stringContaining("New project from connection"),
      expect.stringContaining("John Client has posted a new open project")
    );
    expect(Mailer.sendEmail).toHaveBeenNthCalledWith(
      2,
      "free2@example.com",
      expect.stringContaining("New project from connection"),
      expect.stringContaining("John Client has posted a new open project")
    );
  });

  it("5. Regression check: FREELANCER_ASSIGNED triggers notifications correctly", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_123",
      title: "Test Escrow Contract",
      client: { id: "client_id", email: "client@example.com" },
      freelancer: { id: "freelancer_id", email: "freelancer@example.com" },
    });

    await NotificationService.notify("FREELANCER_ASSIGNED", { projectId: "proj_123" });

    expect(Mailer.sendEmail).toHaveBeenCalledTimes(1);
    expect(Mailer.sendEmail).toHaveBeenCalledWith(
      "freelancer@example.com",
      expect.stringContaining("You have been assigned to project"),
      expect.stringContaining("You have been selected and assigned as the freelancer")
    );
  });
});
