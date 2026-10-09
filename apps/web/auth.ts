import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { dbConfigured } from "@/lib/db";
import { upsertUser } from "@/lib/repo";

export const authConfigured = () =>
  Boolean(process.env.AUTH_SECRET && process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && dbConfigured());

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    // Only Google accounts whose email Google has verified (accounts are keyed by email).
    async signIn({ user, account, profile }) {
      if (!user.email || !dbConfigured()) return false;
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const row = await upsertUser(user.email, user.name, user.image);
        token.uid = row.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = String(token.uid);
      return session;
    },
  },
});
