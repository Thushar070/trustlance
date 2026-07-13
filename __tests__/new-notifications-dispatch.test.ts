import { NotificationService } from "@/lib/services/notification-service";
import { SendGridService } from "@/lib/email/sendgrid";
import { prisma } from "@/lib/prisma";

// Mock SendGridService
jest.mock("@/lib/email/sendgrid", () => {
  return {
    SendGridService: {
      sendProposalSubmitted: jest.fn().mockResolvedValue(true),
      sendConnectionRequestReceived: jest.fn().mockResolvedValue(true),
      sendConnectionAccepted: jest.fn().mockResolvedValue(true),
      sendNewProjectFromConnection: jest.fn().mockResolvedValue(true),
      sendFreelancerAssigned: jest.fn().mockResolvedValue(true),
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
      client: { id: "client_1", email: "client_one@example.com", name: "John Client" },
      freelancer: null,
    });

    await NotificationService.notify("PROPOSAL_SUBMITTED", { projectId: "proj_123" });

    expect(SendGridService.sendProposalSubmitted).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendProposalSubmitted).toHaveBeenCalledWith(
      "client_one@example.com",
      "John Client",
      "Test Escrow Contract",
      "http://localhost:3000/projects/proj_123"
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

    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendConnectionRequestReceived).toHaveBeenCalledWith(
      "bob@example.com",
      "Bob Addressee",
      "Alice Requester"
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

    expect(SendGridService.sendConnectionAccepted).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendConnectionAccepted).toHaveBeenCalledWith(
      "alice@example.com",
      "Alice Requester",
      "Bob Addressee"
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

    expect(SendGridService.sendNewProjectFromConnection).toHaveBeenCalledTimes(2);
    expect(SendGridService.sendNewProjectFromConnection).toHaveBeenNthCalledWith(
      1,
      "free1@example.com",
      "Freelancer One",
      "John Client",
      "Premium React App Redesign",
      "http://localhost:3000/projects/proj_123"
    );
    expect(SendGridService.sendNewProjectFromConnection).toHaveBeenNthCalledWith(
      2,
      "free2@example.com",
      "Freelancer Two",
      "John Client",
      "Premium React App Redesign",
      "http://localhost:3000/projects/proj_123"
    );
  });

  it("5. Regression check: FREELANCER_ASSIGNED triggers notifications correctly", async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: "proj_123",
      title: "Test Escrow Contract",
      client: { id: "client_id", email: "client@example.com", name: "Client Name" },
      freelancer: { id: "freelancer_id", email: "freelancer@example.com", name: "Freelancer Name" },
    });

    await NotificationService.notify("FREELANCER_ASSIGNED", { projectId: "proj_123" });

    expect(SendGridService.sendFreelancerAssigned).toHaveBeenCalledTimes(1);
    expect(SendGridService.sendFreelancerAssigned).toHaveBeenCalledWith(
      "freelancer@example.com",
      "Freelancer Name",
      "Test Escrow Contract",
      "http://localhost:3000/projects/proj_123"
    );
  });
});
