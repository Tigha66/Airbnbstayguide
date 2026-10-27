/** Server-only complimentary feature grants. This never changes a Stripe plan. */
export function managerAccessEmails() {
  return [...new Set((process.env.MANAGER_ACCESS_EMAILS ?? "").split(",")
    .map(email => email.trim().toLowerCase()).filter(Boolean))];
}

/** Used inside owner-scoped database statements so revocation applies to writes too. */
export function managerAccessSql() {
  // Only server configuration enters this expression. Quote values as SQL literals;
  // never accept a grant from a browser payload, session claim or profile field.
  const emails = managerAccessEmails().map(email => "'" + email.replaceAll("'", "''") + "'");
  return emails.length
    ? `(u.plan = 'manager' OR (u.email_verified_at IS NOT NULL AND lower(u.email) IN (${emails.join(",")})))`
    : "(u.plan = 'manager')";
}
