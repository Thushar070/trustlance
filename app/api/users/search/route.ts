import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@prisma/client";

const searchRateLimits = new Map<string, { count: number; windowStart: number }>();

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized: Please log in." }, { status: 401 });
    }

    const userId = session.user.id;
    const now = Date.now();
    const limit = 100;
    const windowMs = 60 * 1000;

    const record = searchRateLimits.get(userId);
    if (!record || now - record.windowStart > windowMs) {
      searchRateLimits.set(userId, { count: 1, windowStart: now });
    } else {
      if (record.count >= limit) {
        return NextResponse.json(
          { error: "Rate limit exceeded: Maximum of 100 search queries per minute." },
          { status: 429 }
        );
      }
      record.count += 1;
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

    // Compute stats & skills-via-proposals by batch fetching to avoid N+1 query patterns
    const userIds = users.map((u) => u.id);

    const [freelancerProjectCounts, clientProjectCounts, allRatings] = await Promise.all([
      prisma.project.groupBy ? await prisma.project.groupBy({
        by: ["freelancerId"],
        where: {
          freelancerId: { in: userIds },
          status: "COMPLETED",
        },
        _count: {
          id: true,
        },
      }) : [],
      prisma.project.groupBy ? await prisma.project.groupBy({
        by: ["clientId"],
        where: {
          clientId: { in: userIds },
          status: "COMPLETED",
        },
        _count: {
          id: true,
        },
      }) : [],
      prisma.rating.findMany ? await prisma.rating.findMany({
        where: { rateeId: { in: userIds } },
        select: { rateeId: true, score: true },
      }) : [],
    ]);

    const freelancerCountMap = new Map<string, number>();
    for (const item of freelancerProjectCounts) {
      if (item.freelancerId) {
        freelancerCountMap.set(item.freelancerId, item._count.id);
      }
    }

    const clientCountMap = new Map<string, number>();
    for (const item of clientProjectCounts) {
      if (item.clientId) {
        clientCountMap.set(item.clientId, item._count.id);
      }
    }

    const ratingsMap = new Map<string, number[]>();
    for (const r of allRatings) {
      const list = ratingsMap.get(r.rateeId) || [];
      list.push(r.score);
      ratingsMap.set(r.rateeId, list);
    }

    const usersWithStats = users.map((user) => {
      // Extract skills
      const skills = Array.from(new Set(user.proposals.flatMap((p) => p.project?.skills || [])));

      // Completed project count
      let completedProjectCount = 0;
      if (user.role === Role.FREELANCER) {
        completedProjectCount = freelancerCountMap.get(user.id) || 0;
      } else if (user.role === Role.CLIENT) {
        completedProjectCount = clientCountMap.get(user.id) || 0;
      }

      // Average Rating
      const userScores = ratingsMap.get(user.id) || [];
      const totalScore = userScores.reduce((sum, s) => sum + s, 0);
      const averageRating = userScores.length > 0 ? parseFloat((totalScore / userScores.length).toFixed(1)) : 0;

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
    });

    // Apply minRating filtering in-memory
    const filteredUsers = usersWithStats.filter((u) => u.averageRating >= minRating);

    return NextResponse.json(filteredUsers);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred during search.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
