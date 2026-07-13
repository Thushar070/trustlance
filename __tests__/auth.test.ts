import { requireRole } from "@/lib/auth/require-role";
import { getServerSession } from "@/lib/auth/get-server-session";
import { Role } from "@prisma/client";
import { ROLE_OVERRIDES, getRoleOverride } from "@/lib/auth/role-overrides";

// Mock getServerSession helper
jest.mock("@/lib/auth/get-server-session");

describe("requireRole Unit Tests", () => {
  const mockedGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reject with 401 if user is not authenticated", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const result = await requireRole(Role.CLIENT);

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(401);
    expect(result.error).toContain("Unauthorized");
    expect(result.session).toBeNull();
  });

  it("should reject with 403 if the user's role is mismatched", async () => {
    mockedGetServerSession.mockResolvedValue({
      user: {
        name: "Test User",
        email: "test@example.com",
        role: Role.FREELANCER,
        id: "usr_123",
      },
      expires: "2026-12-31",
    });

    const result = await requireRole(Role.CLIENT);

    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toContain("Forbidden: Mismatched role");
  });

  it("should authorize and return 200 with the active session if role matches", async () => {
    const mockSession = {
      user: {
        name: "Test User",
        email: "test@example.com",
        role: Role.CLIENT,
        id: "usr_123",
      },
      expires: "2026-12-31",
    };
    mockedGetServerSession.mockResolvedValue(mockSession);

    const result = await requireRole(Role.CLIENT);

    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(result.session).toEqual(mockSession);
  });
});

describe("Admin Role Safety Check", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("should confirm that only the specific hardcoded developer email receives the ADMIN role override", () => {
    // Retrieve all emails matching ADMIN role override
    const adminEmails = Object.keys(ROLE_OVERRIDES).filter(
      (email) => ROLE_OVERRIDES[email] === Role.ADMIN
    );

    // Assert that ONLY thusharyyy@gmail.com is mapped to ADMIN
    expect(adminEmails).toEqual(["thusharyyy@gmail.com"]);

    // Verify a random/arbitrary email does not return any override
    expect(getRoleOverride("other-email@gmail.com")).toBeNull();
    expect(getRoleOverride("admin-attacker@ssn.edu.in")).toBeNull();
  });

  it("should return null for role override in production environment", () => {
    process.env.NODE_ENV = "production";

    // Even the developer email should return null in production
    expect(getRoleOverride("thusharyyy@gmail.com")).toBeNull();
    expect(getRoleOverride("thushar2410612@ssn.edu.in")).toBeNull();
    expect(getRoleOverride("thushar.tl.dev@gmail.com")).toBeNull();
  });
});
