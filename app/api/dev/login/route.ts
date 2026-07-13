import { NextResponse } from "next/server";
import { encode } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Forbidden in production" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "thushar2410612@ssn.edu.in";
  const name = searchParams.get("name") || "Thushar Client";
  const roleStr = searchParams.get("role") || "CLIENT";
  
  // Map role
  const role = roleStr === "ADMIN" ? Role.ADMIN : roleStr === "FREELANCER" ? Role.FREELANCER : Role.CLIENT;

  // Upsert user in db
  let dbUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        profileCompleted: true,
        businessName: role === Role.CLIENT ? "Acme Enterprise" : undefined,
        bio: role === Role.FREELANCER ? "Expert developer specializing in trust systems." : undefined,
      },
    });
  } else {
    // Make sure profile is marked completed in dev to skip complete-profile redirect
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { profileCompleted: true },
    });
  }

  const token = {
    name: dbUser.name,
    email: dbUser.email,
    picture: null,
    sub: dbUser.id,
    id: dbUser.id,
    role: dbUser.role,
    profileCompleted: true,
  };

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET is missing" }, { status: 500 });
  }

  const sessionToken = await encode({
    token,
    secret,
  });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set("next-auth.session-token", sessionToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
