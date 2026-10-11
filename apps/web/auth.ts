import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { dbConfigured } from "@/lib/db";
import { consumeEmailLoginCode, emailLoginConfigured } from "@/lib/email-login";
import { upsertUser } from "@/lib/repo";

export const googleConfigured = () => Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const appleConfigured = () => Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
export const authConfigured = () => Boolean(process.env.AUTH_SECRET && dbConfigured() && (googleConfigured() || appleConfigured() || emailLoginConfigured()));

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...(googleConfigured() ? [Google] : []),
    ...(appleConfigured() ? [Apple] : []),
    Credentials({
      id: "email-code",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        if (!emailLoginConfigured() || !dbConfigured()) return null;
        const ok = await consumeEmailLoginCode(credentials?.email, credentials?.code);
        if (!ok) return null;
        return { id: ok.email, email: ok.email, name: ok.email.split("@")[0] };
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email && dbConfigured());
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
