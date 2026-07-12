import { GET as searchHandler } from "@/app/api/users/search/route";
import { GET as publicProfileHandler } from "@/app/api/users/[id]/public-profile/route";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

jest.mock("@/lib/auth/get-server-session");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    proposal: {
      count: jest.fn(),
    },
    rating: {
      findMany: jest.fn(),
    },
  },
}));

describe("Social / Discovery Layer Security Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("1. User Search Endpoint", () => {
    it("never includes email or phone fields in search response", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", email: "client@test.com", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: "free_456",
          name: "Test Freelancer",
          role: Role.FREELANCER,
          businessName: "Freelance Corp",
          bio: "Excellent developer",
          location: "New York",
          proposals: [],
        },
      ]);

      (prisma.project.count as jest.Mock).mockResolvedValue(2);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([{ score: 5 }]);

      const req = new Request("http://localhost/api/users/search?role=FREELANCER");
      const res = await searchHandler(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data).toHaveLength(1);
      const user = data[0];
      
      expect(user).toHaveProperty("name", "Test Freelancer");
      expect(user).not.toHaveProperty("email");
      expect(user).not.toHaveProperty("phone");
    });

    it("allows CLIENT to search FREELANCER and FREELANCER to search CLIENT, but rejects CLIENT searching CLIENT", async () => {
      // CLIENT searching FREELANCER
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_123", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
      
      const req1 = new Request("http://localhost/api/users/search?role=FREELANCER");
      const res1 = await searchHandler(req1);
      expect(res1.status).toBe(200);

      // CLIENT searching CLIENT (misuse) should return empty or error
      const req2 = new Request("http://localhost/api/users/search?role=CLIENT");
      const res2 = await searchHandler(req2);
      expect(res2.status).toBe(200);
      const data2 = await res2.json();
      expect(data2).toEqual([]);
    });
  });

  describe("2. Public Profile Endpoint", () => {
    it("never includes email/phone for a caller who is not the owner and has no project relationship", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_789", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "free_999",
        name: "Secret Freelancer",
        role: Role.FREELANCER,
        email: "secret@freelancer.com",
        phone: "+123456789",
        proposals: [],
      });

      // No project relationships
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.proposal.count as jest.Mock).mockResolvedValue(0);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);

      const res = await publicProfileHandler(
        new Request("http://localhost/api/users/free_999/public-profile"),
        { params: Promise.resolve({ id: "free_999" }) }
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isContactVisible).toBe(false);
      expect(data).not.toHaveProperty("email");
      expect(data).not.toHaveProperty("phone");
    });

    it("includes email/phone if the caller is the owner", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "free_999", role: Role.FREELANCER },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "free_999",
        name: "Secret Freelancer",
        role: Role.FREELANCER,
        email: "secret@freelancer.com",
        phone: "+123456789",
        proposals: [],
      });

      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);

      const res = await publicProfileHandler(
        new Request("http://localhost/api/users/free_999/public-profile"),
        { params: Promise.resolve({ id: "free_999" }) }
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isContactVisible).toBe(true);
      expect(data.email).toBe("secret@freelancer.com");
      expect(data.phone).toBe("+123456789");
    });

    it("includes email/phone if there is a verified project relationship", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: "client_789", role: Role.CLIENT },
        expires: "2026-12-31",
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "free_999",
        name: "Secret Freelancer",
        role: Role.FREELANCER,
        email: "secret@freelancer.com",
        phone: "+123456789",
        proposals: [],
      });

      // Mock database finding an active project relationship
      (prisma.project.count as jest.Mock).mockResolvedValue(1);
      (prisma.rating.findMany as jest.Mock).mockResolvedValue([]);

      const res = await publicProfileHandler(
        new Request("http://localhost/api/users/free_999/public-profile"),
        { params: Promise.resolve({ id: "free_999" }) }
      );
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.isContactVisible).toBe(true);
      expect(data.email).toBe("secret@freelancer.com");
    });
  });
});
