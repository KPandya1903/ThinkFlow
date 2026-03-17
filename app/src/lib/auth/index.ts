import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

/**
 * Module augmentation for NextAuth v5 types.
 * Extends the default User, Session, and JWT interfaces with ITHINK-specific fields.
 */
declare module "next-auth" {
  interface User {
    id: string;
    username: string;
    xp: number;
    level: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      username: string;
      xp: number;
      level: number;
    } & DefaultSession["user"];
  }
}

// JWT type augmentation via @auth/core
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    username: string;
    xp: number;
    level: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.username,
          image: user.avatarUrl,
          username: user.username,
          xp: user.xp,
          level: user.level,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },

  callbacks: {
    async signIn({ user, account }) {
      // Handle Google OAuth sign-in: upsert user record
      if (account?.provider === "google" && user.email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email))
          .limit(1);

        if (!existingUser) {
          // Create a new user from Google profile
          const username = generateUsername(user.email);
          const [newUser] = await db
            .insert(users)
            .values({
              email: user.email,
              username,
              displayName: user.name ?? undefined,
              avatarUrl: user.image ?? undefined,
              authProvider: "google",
            })
            .returning();

          user.id = newUser.id;
          (user as any).username = newUser.username;
          (user as any).xp = newUser.xp;
          (user as any).level = newUser.level;
        } else {
          user.id = existingUser.id;
          (user as any).username = existingUser.username;
          (user as any).xp = existingUser.xp;
          (user as any).level = existingUser.level;
        }
      }

      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // On initial sign-in, populate the JWT with custom fields
      if (user) {
        token.id = user.id as string;
        token.username = (user as any).username;
        token.xp = (user as any).xp;
        token.level = (user as any).level;
      }

      // When session is updated from client via update()
      if (trigger === "update" && session) {
        if (session.xp !== undefined) token.xp = session.xp;
        if (session.level !== undefined) token.level = session.level;
        if (session.username !== undefined) token.username = session.username;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.username = token.username as string;
      session.user.xp = token.xp as number;
      session.user.level = token.level as number;
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callbacks to the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});

/**
 * Generate a unique-ish username from an email address.
 * Strips the domain part and appends a short random suffix.
 */
function generateUsername(email: string): string {
  const base = email
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 20);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}_${suffix}`;
}
