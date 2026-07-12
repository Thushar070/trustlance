import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const callerRole = session.user.role;
    
    // Parse query params
    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const query = searchParams.get("query") || "";
    const skill = searchParams.get("skill") || "";
    const minRating = parseFloat(searchParams.get("minRating") || "0");

    // Rejection rule:
    // CLIENT can search role=FREELANCER; FREELANCER can search role=CLIENT.
    // Cross-role search is rejected or returns empty.
    if (callerRole === Role.CLIENT && role !== Role.FREELANCER) {
      return NextResponse.json([]);
    }
    if (callerRole === Role.FREELANCER && role !== Role.CLIENT) {
      return NextResponse.json([]);
    }
    if (callerRole === Role.ADMIN) {
      // Admins are not part of user discovery
      return NextResponse.json([]);
    }

    // Build DB filters
    const where: Prisma.UserWhereInput = {
      role: role as Role,
      profileCompleted: true,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { businessName: { contains: query, mode: "insensitive" } },
        { bio: { contains: query, mode: "insensitive" } },
      ];
    }

    if (skill && role === Role.FREELANCER) {
      // Find freelancers with proposals matching this skill
      where.proposals = {
        some: {
          project: {
            skills: {
              has: skill,
            },
          },
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        businessName: true,
        bio: true,
        location: true,
        createdAt: true,
        proposals: {
          include: {
            project: {
              select: {
                skills: true,
              },
            },
          },
        },
      },
    });

    // Compute stats & skills-via-proposals
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Extract skills
        const skills = Array.from(new Set(user.proposals.flatMap((p) => p.project?.skills || [])));

        // Completed project count
        let completedProjectCount = 0;
        if (user.role === Role.FREELANCER) {
          completedProjectCount = await prisma.project.count({
            where: {
              freelancerId: user.id,
              status: "COMPLETED",
            },
          });
        } else if (user.role === Role.CLIENT) {
          completedProjectCount = await prisma.project.count({
            where: {
              clientId: user.id,
              status: "COMPLETED",
            },
          });
        }

        // Average Rating
        const ratings = await prisma.rating.findMany({
          where: { rateeId: user.id },
          select: { score: true },
        });
        const totalScore = ratings.reduce((sum, r) => sum + r.score, 0);
        const averageRating = ratings.length > 0 ? parseFloat((totalScore / ratings.length).toFixed(1)) : 0;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          businessName: user.businessName,
          bio: user.bio,
          location: user.location,
          skills,
          averageRating,
          completedProjectCount,
          createdAt: user.createdAt,
        };
      })
    );

    // Apply minRating filtering in-memory
    const filteredUsers = usersWithStats.filter((u) => u.averageRating >= minRating);

    return NextResponse.json(filteredUsers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred during search.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
