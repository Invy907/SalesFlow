import * as XLSX from "xlsx";

export type SpreadsheetLineItem = {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
};

/** A row added but left empty. Rendered as a blank line rather than zeros. */
export function isBlankDocumentLine(line: SpreadsheetLineItem) {
  return !line.name.trim() && line.qty === 0 && line.unitPrice === 0;
}

export type SalesDocumentSpreadsheetInput = {
  title: string;
  filenameBase: string;
  fields: Array<[string, string | number]>;
  lineHeaders: string[];
  lines: SpreadsheetLineItem[];
  summaryRows: Array<[string, number]>;
  remarks?: string;
  remarksLabel?: string;
};

function sanitizeFilename(name: string) {
  return name.replace(/[/\\?%*:|"<>]/g, "-").trim() || "document";
}

function lineAmount(line: SpreadsheetLineItem) {
  return Math.floor(line.qty * line.unitPrice);
}

export function downloadSalesDocumentXlsx(input: SalesDocumentSpreadsheetInput) {
  const rows: (string | number)[][] = [[input.title], [], ...input.fields.map(([label, value]) => [label, value])];

  if (input.remarks?.trim()) {
    rows.push([], [input.remarksLabel ?? "Remarks", input.remarks]);
  }

  rows.push([], input.lineHeaders);

  if (input.lines.length === 0) {
    rows.push(["—"]);
  } else {
    for (const line of input.lines) {
      rows.push([line.name, line.qty, line.unit, line.unitPrice, lineAmount(line)]);
    }
  }

  rows.push([]);
  for (const [label, value] of input.summaryRows) {
    rows.push(["", "", "", label, value]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  const sheetName = sanitizeFilename(input.title).slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Sheet1");
  XLSX.writeFile(workbook, `${sanitizeFilename(input.filenameBase)}.xlsx`);
}
