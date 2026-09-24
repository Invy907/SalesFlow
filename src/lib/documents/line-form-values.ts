/** Use the same numeric defaults for the editor, preview and saved document. */
export function parseDocumentNumber(value: string): number {
  const parsed = Number(value.replace(/[,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isBlankDocumentLine(row: { name: string; qty: string; unit: string; price: string }): boolean {
  return [row.name, row.qty, row.unit, row.price].every((value) => value.trim() === "");
}

export function documentLineQuantity(row: { name: string; qty: string; unit: string; price: string }): number {
  if (isBlankDocumentLine(row)) return 0;
  return row.qty.trim() === "" ? 1 : parseDocumentNumber(row.qty);
}
