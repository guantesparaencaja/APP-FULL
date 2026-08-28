export const ADMIN_EMAILS = [
  'hernandezkevin001998@gmail.com',
  'guantesparaencajar@gmail.com',
].map((email) => email.toLowerCase());

export function isAdminUser(user?: { role?: string | null; email?: string | null } | null): boolean {
  return Boolean(user && (user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()))));
}
