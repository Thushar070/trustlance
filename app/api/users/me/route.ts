import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validators/user";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        location: true,
        businessName: true,
        bio: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parseResult = updateProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Filter out undefined and convert empty strings to null or keep them
    const { name, phone, location, businessName, bio } = parseResult.data;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: name !== undefined ? (name === "" ? null : name) : undefined,
        phone: phone !== undefined ? (phone === "" ? null : phone) : undefined,
        location: location !== undefined ? (location === "" ? null : location) : undefined,
        businessName: businessName !== undefined ? (businessName === "" ? null : businessName) : undefined,
        bio: bio !== undefined ? (bio === "" ? null : bio) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        location: true,
        businessName: true,
        bio: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
