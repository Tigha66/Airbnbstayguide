import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { dbConfigured, query } from "@/lib/db";
import { authenticatePassword, passwordLoginConfigured } from "@/lib/password-login";

export const googleConfigured = () => Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
export const appleConfigured = () => Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
export const authConfigured = passwordLoginConfigured;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    ...(googleConfigured() ? [Google] : []),
    ...(appleConfigured() ? [Apple] : []),
    Credentials({
      id: "password",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        return authenticatePassword(credentials);
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      return Boolean(user.email && dbConfigured());
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        if (account?.provider === "password") {
          token.uid = user.id;
          return token;
        }
        // Do not merge an OAuth identity into an unverified password account.
        const [row] = await query<{ id: string }>(
          `INSERT INTO users (email, name, image) VALUES ($1, $2, $3)
           ON CONFLICT (email) DO UPDATE SET name = COALESCE(EXCLUDED.name, users.name), image = COALESCE(EXCLUDED.image, users.image)
           WHERE users.password_hash IS NULL RETURNING id`,
          [user.email.toLowerCase(), user.name ?? null, user.image ?? null],
        );
        if (!row) throw new Error("Use email and password for this account");
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
