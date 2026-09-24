/** Match the writer roles enforced by organization business RLS policies. */
export function canWriteOrganizationBusinessData(role: string | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "member";
}
