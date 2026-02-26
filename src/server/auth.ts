import { env } from "@/env";
import { db } from "@/server/db";
import { isValidEmail } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession, type Session } from "next-auth";
import { type Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      hasAccess: boolean;
      location?: string;
      role: string;
      isAdmin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    hasAccess: boolean;
    role: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - Refresh session every 24 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.hasAccess = user.hasAccess;
        token.name = user.name;
        token.image = user.image;
        token.picture = user.image;
        token.location = (user as Session["user"]).location;
        token.role = user.role;
        token.isAdmin = user.role === "ADMIN";
      }

      // Handle updates
      if (trigger === "update" && (session as Session)?.user) {
        const user = await db.user.findUnique({
          where: { id: token.id as string },
        });
        // Session callback executed
        if (session) {
          token.name = (session as Session).user.name;
          token.image = (session as Session).user.image;
          token.picture = (session as Session).user.image;
          token.location = (session as Session).user.location;
          token.role = (session as Session).user.role;
          token.isAdmin = (session as Session).user.role === "ADMIN";
        }
        if (user) {
          token.hasAccess = user?.hasAccess ?? false;
          token.role = user.role;
          token.isAdmin = user.role === "ADMIN";
        }
      }

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.hasAccess = token.hasAccess as boolean;
      session.user.location = token.location as string;
      session.user.role = token.role as string;
      session.user.isAdmin = token.role === "ADMIN";
      return session;
    },
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          // Validate email
          if (!user.email || !isValidEmail(user.email)) {
            logger.error("Invalid email format during sign-in", new Error("Invalid email"), { email: user.email });
            return false;
          }

          const dbUser = await db.user.findUnique({
            where: { email: user.email },
            select: { id: true, hasAccess: true, role: true },
          });

          if (dbUser) {
            user.hasAccess = dbUser.hasAccess;
            user.role = dbUser.role;

            // Log successful sign-in
            logger.debug("User signed in", { userId: dbUser.id, email: user.email });
          } else {
            user.hasAccess = false;
            user.role = "USER";

            // Log new user sign-in
            logger.debug("New user signed in", { email: user.email });
          }
        }

        return true;
      } catch (error) {
        logger.error("Sign-in error", error as Error);
        // Return false to prevent sign-in on error
        return false;
      }
    },
  },

  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    }),
  ],
});
