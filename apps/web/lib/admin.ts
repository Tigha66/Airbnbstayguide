/**
 * Owner (founder) access. Set ADMIN_EMAILS in Vercel as a comma-separated list to change it;
 * without it, only the founder's Google account can open /admin.
 */
const DEFAULT_ADMINS = ["abdelhaktirha@gmail.com"];

export function adminEmails() {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? configured : DEFAULT_ADMINS;
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email) && adminEmails().includes(email!.trim().toLowerCase());
}
