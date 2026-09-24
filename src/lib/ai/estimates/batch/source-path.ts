const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORIGINAL_FILES: Record<string, readonly string[]> = {
  "application/pdf": ["original.pdf"],
  "image/png": ["original.png"],
  "image/jpeg": ["original.jpg", "original.jpeg"],
  "text/csv": ["original.csv"],
  "text/plain": ["original.txt"],
  "text/markdown": ["original.md"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["original.xlsx"],
};

/** Validate before any service-role Storage access; source metadata may have been patched by a client. */
export function isCanonicalEstimateSourcePath(organizationId: string, source: {
  id: string;
  organization_id: string;
  storage_path: string | null;
  mime_type: string | null;
}): boolean {
  if (source.organization_id !== organizationId || !UUID.test(organizationId) || !UUID.test(source.id)
    || !source.storage_path || !source.mime_type) return false;
  const prefix = `${organizationId}/${source.id}/`;
  return (ORIGINAL_FILES[source.mime_type] ?? []).some((file) => source.storage_path === `${prefix}${file}`);
}
