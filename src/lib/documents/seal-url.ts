import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const SEAL_BUCKET = "org-seals";

/**
 * Signed URL for the company seal image.
 *
 * The bucket is private, so a public share link cannot read it with the viewer's
 * session; the service role signs it instead. The URL exposes nothing but the image.
 */
export async function getDocumentSealUrl(
  sealPath: string | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!sealPath) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.storage.from(SEAL_BUCKET).createSignedUrl(sealPath, expiresInSeconds);
    return data?.signedUrl ?? null;
  } catch {
    // A missing seal must never break the document itself.
    return null;
  }
}

/** Seal URL for an organization. Used where only the org id is known (share links). */
export async function getSealUrlForOrg(
  orgId: string | null | undefined,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!orgId) return null;

  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("company_profiles")
      .select("seal_path")
      .eq("organization_id", orgId)
      .maybeSingle();
    return getDocumentSealUrl(data?.seal_path as string | null | undefined, expiresInSeconds);
  } catch {
    return null;
  }
}
