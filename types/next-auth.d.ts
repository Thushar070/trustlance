import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      role?: Role | null;
      profileCompleted?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: Role | null;
    profileCompleted?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: Role | null;
    profileCompleted?: boolean;
  }
}
