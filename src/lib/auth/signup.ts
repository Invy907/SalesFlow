type SignUpResult = {
  user: { identities?: Array<{ id: string }> } | null;
  session: unknown;
};

/** Supabase may return success without error when the email is already registered. */
export function isSignupEmailAlreadyRegistered(data: SignUpResult | null | undefined): boolean {
  const user = data?.user;
  if (!user || data?.session) return false;
  return (user.identities?.length ?? 0) === 0;
}
