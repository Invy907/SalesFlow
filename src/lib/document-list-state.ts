/** URL values must be bounded integers before they can index tabs or database ranges. */
export function parseListInteger(value: string | undefined, fallback: number, maximum = 1_000_000) {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= fallback && parsed <= maximum ? parsed : fallback;
}

export function visibleDocumentSelection(selected: ReadonlySet<string>, rows: ReadonlyArray<{ id: string }>) {
  return new Set(rows.filter((row) => selected.has(row.id)).map((row) => row.id));
}

/** A saved document keeps its original recipient even if the client master is renamed. */
export function documentRecipientName(snapshot: unknown, currentClientName?: string | null) {
  const recipient = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : {};
  for (const value of [recipient.clientName, recipient.companyName, recipient.name, currentClientName]) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

/** PostgREST OR values need quoting separately from SQL LIKE wildcard escaping. */
export function documentSearchPattern(query: string) {
  return `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

export function documentSearchClause(query: string, clientIds: readonly string[]) {
  const pattern = JSON.stringify(documentSearchPattern(query));
  const clauses = [
    "document_number", "subject", "internal_memo",
    "recipient_snapshot->>clientName", "recipient_snapshot->>companyName", "recipient_snapshot->>name",
  ].map((field) => `${field}.ilike.${pattern}`);
  if (clientIds.length) clauses.push(`client_id.in.(${clientIds.join(",")})`);
  return clauses.join(",");
}
