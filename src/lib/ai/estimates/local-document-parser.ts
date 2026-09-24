import * as XLSX from "xlsx";
import { EXTRACTION_SCHEMA_VERSION, type EstimateExtractionResult, type SourceDocumentKind, type EstimateExtractionLine } from "./batch/extraction-schema";

export const LOCAL_DOCUMENT_MIMES = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/markdown"] as const;
export const isLocalDocumentMime = (mime: string | null | undefined) => LOCAL_DOCUMENT_MIMES.includes(mime as typeof LOCAL_DOCUMENT_MIMES[number]);
export class LocalDocumentParseError extends Error {
  constructor(readonly code: string) { super(code); }
}
export function localDocumentErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    LOCAL_TOO_MANY_ROWS: "가격 명세는 파일 전체에서 80행까지 처리할 수 있습니다. 자료를 나누어 올리거나 필요한 내용을 직접 입력해 주세요.",
    LOCAL_INVALID_ENCODING: "UTF-8로 저장된 CSV 또는 텍스트 파일을 올려 주세요. 원본을 보며 직접 입력할 수도 있습니다.",
    LOCAL_TEXT_TOO_LONG: "문서 내용이 입력 한도를 초과했습니다. 작업 본문은 16,000자 이내로 나누고, 표 비고는 500자 이내로 입력해 주세요.",
    LOCAL_MISSING_HEADERS: "표에 품목명·단위·단가·세율 열이 필요합니다. 견적서는 수량도 필요합니다. 샘플 양식으로 다시 올리거나 직접 입력해 주세요.",
    LOCAL_AMBIGUOUS_TAX: "세율을 확인해 주세요. 10%, 5%, 0%, reduced_8(경감), standard_8(일반)으로 구분해 입력할 수 있습니다.",
    LOCAL_INVALID_NUMBER: "단가는 0이 아닌 정수 엔, 수량은 양수여야 합니다. 모호한 숫자·빈 단가를 원본에서 확인하고 직접 입력해 주세요.",
    LOCAL_FORMULA_NOT_ALLOWED: "수식이 있는 표는 계산된 값을 복사해 값만 붙여넣은 뒤 다시 올려 주세요. 수식은 실행하지 않습니다.",
    LOCAL_TEXT_REQUIRES_CONTEXT_KIND: "텍스트 파일은 설계·작업 상세 자료로 올려 주세요. 단가표는 샘플 CSV 또는 XLSX를 사용해 주세요.",
    LOCAL_TABLE_REQUIRES_PRICE_KIND: "표 파일은 단가표·과거 견적 자료로 올려 주세요. 설계·작업 상세는 TXT·MD·PDF를 사용해 주세요.",
    LOCAL_XLSX_TOO_COMPLEX: "표 파일의 크기 또는 구조가 처리 한도를 초과했습니다. 필요한 시트를 작은 파일로 나누어 올려 주세요.",
  };
  return messages[code] ?? "파일의 열 이름과 값 형식을 확인해 다시 올리거나 원본을 보며 직접 입력해 주세요. 자동으로 일부 내용을 가져오지는 않았습니다.";
}
const fail = (code: string): never => { throw new LocalDocumentParseError(code); };
const key = (value: unknown) => String(value ?? "").normalize("NFKC").trim().toLowerCase().replace(/[\s_\-()（）]/g, "");
const headers = {
  name: ["품목명", "품목", "항목", "品目名", "品目", "項目", "商品名", "item", "itemname", "name", "description"],
  unit: ["단위", "単位", "unit"],
  price: ["단가", "単価", "unitprice", "price"],
  tax: ["세율", "세금구분", "税率", "税区分", "taxrate", "taxcategory", "tax"],
  qty: ["수량", "数量", "quantity", "qty"],
  mode: ["세금포함", "세금포함여부", "税込区分", "税方式", "taxmode", "taxinclusion"],
  note: ["규격", "사양", "비고", "規格", "仕様", "備考", "specification", "notes"],
  currency: ["통화", "通貨", "currency"],
} as const;

/** Strict RFC-style CSV reader; malformed quoting is an error, never a partial import. */
export function parseCsvRows(text: string): string[][] {
  const first = text.split(/\r?\n/, 1)[0];
  const delimiter = [",", "\t", ";"].map((value) => ({ value, count: first.split(value).length })).sort((a, b) => b.count - a.count)[0].value;
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  const pushCell = () => { row.push(cell); cell = ""; closed = false; if (row.length > 50) fail("LOCAL_TOO_MANY_COLUMNS"); };
  const pushRow = () => { pushCell(); if (row.some((value) => value.trim())) rows.push(row); row = []; if (rows.length > 81) fail("LOCAL_TOO_MANY_ROWS"); };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === delimiter) pushCell();
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[index + 1] === "\n") index++; pushRow(); }
    else if (char === '"' && !cell && !closed) quoted = true;
    else { if (closed || char === '"') fail("LOCAL_INVALID_CSV"); cell += char; }
  }
  if (quoted) fail("LOCAL_INVALID_CSV");
  if (cell || row.length || closed) pushRow();
  return rows;
}

function numberCell(value: unknown, quantity = false): number {
  const text = String(value ?? "").normalize("NFKC").trim().replace(/^[¥￥]\s*/, "").replace(/\s*円$/, "");
  if (!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,4})?$/.test(text)) return fail("LOCAL_INVALID_NUMBER");
  const number = Number(text.replaceAll(",", ""));
  if (!Number.isFinite(number) || (quantity ? number <= 0 || number > 999999 : !Number.isSafeInteger(number) || Math.abs(number) > 999999999999 || number === 0)) return fail("LOCAL_INVALID_NUMBER");
  return number;
}
function taxCell(value: unknown): Pick<EstimateExtractionLine, "printedTaxRatePercent" | "printedTaxCategory"> {
  const tax = key(value).replace(/%$/, "");
  if (["10", "standard10"].includes(tax)) return { printedTaxRatePercent: 10, printedTaxCategory: "standard_10" };
  if (["5", "standard5"].includes(tax)) return { printedTaxRatePercent: 5, printedTaxCategory: "standard_5" };
  if (["0", "exempt", "비과세", "非課税", "不課税"].includes(tax)) return { printedTaxRatePercent: 0, printedTaxCategory: "exempt" };
  if (["reduced8", "軽減8", "경감8"].includes(tax)) return { printedTaxRatePercent: 8, printedTaxCategory: "reduced_8" };
  if (["standard8", "標準8", "일반8"].includes(tax)) return { printedTaxRatePercent: 8, printedTaxCategory: "standard_8" };
  return fail("LOCAL_AMBIGUOUS_TAX");
}
function taxMode(value: unknown): "included" | "excluded" | "unknown" {
  if (!String(value ?? "").trim()) return "unknown";
  const mode = key(value);
  if (["included", "税込", "포함"].includes(mode)) return "included";
  if (["excluded", "税抜", "별도", "제외"].includes(mode)) return "excluded";
  return fail("LOCAL_AMBIGUOUS_TAX_MODE");
}
function blankResult(documentKind: SourceDocumentKind): EstimateExtractionResult {
  return { schemaVersion: EXTRACTION_SCHEMA_VERSION, documentKind, workDetails: "", assumptions: "", exclusions: "",
    document: { estimateNumber: null, issueDate: null, validUntil: null, currency: "JPY", language: null },
    supplier: { name: null, businessNumber: null, contactName: null }, customer: { name: null, businessNumber: null, contactName: null },
    totals: { printedSubtotal: null, printedDiscount: null, printedTax: null, printedTotal: null, taxMode: "unknown" },
    lines: [], tableRecognitionFailed: false, confidence: 1, notes: [], warnings: [] };
}
function tableLines(rows: unknown[][], kind: SourceDocumentKind): { lines: EstimateExtractionLine[]; mode: "included" | "excluded" | "unknown" } {
  const header = rows[0]?.map(key) ?? [];
  const indexes = Object.fromEntries(Object.entries(headers).map(([field, aliases]) => {
    const matches = header.flatMap((value, index) => (aliases as readonly string[]).map(key).includes(value) ? [index] : []);
    if (matches.length > 1) fail("LOCAL_DUPLICATE_HEADER");
    return [field, matches[0] ?? -1];
  })) as Record<keyof typeof headers, number>;
  if ([indexes.name, indexes.price, indexes.unit, indexes.tax].some((index) => index < 0) || (kind === "estimate" && indexes.qty < 0)) fail("LOCAL_MISSING_HEADERS");
  const modes = new Set<"included" | "excluded" | "unknown">();
  const lines = rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row, index): EstimateExtractionLine => {
    const name = String(row[indexes.name] ?? "").trim(), unit = String(row[indexes.unit] ?? "").trim();
    if (!name || name.length > 255 || !unit || unit.length > 50) fail("LOCAL_INVALID_ITEM");
    const qtyCell = String(row[indexes.qty] ?? "").trim();
    const qty = !qtyCell && kind === "price_list" ? 1 : numberCell(qtyCell, true);
    const price = numberCell(row[indexes.price]);
    const currency = String(row[indexes.currency] ?? "").trim().toUpperCase();
    if (currency && currency !== "JPY") fail("LOCAL_UNSUPPORTED_CURRENCY");
    if (kind === "price_list" && price < 0) fail("LOCAL_INVALID_NUMBER");
    const mode = taxMode(row[indexes.mode]); modes.add(mode);
    const note = String(row[indexes.note] ?? "").trim();
    if (note.length > 500) fail("LOCAL_TEXT_TOO_LONG");
    return { lineNumber: index + 1, rawItemName: name, rawUnit: unit, quantity: qty, unitPrice: price,
      ...taxCell(row[indexes.tax]), specification: note || null, description: null, printedAmount: null, confidence: 1 };
  });
  if (!lines.length) fail("LOCAL_EMPTY_DOCUMENT");
  if (lines.length > 80) fail("LOCAL_TOO_MANY_ROWS");
  if (modes.size > 1) fail("LOCAL_MIXED_TAX_MODE");
  return { lines, mode: [...modes][0] ?? "unknown" };
}

/** Check ZIP directory sizes before XLSX can allocate decompressed sheet data. */
function boundedXlsx(bytes: Buffer) {
  if (bytes.readUInt32LE(0) !== 0x04034b50) fail("LOCAL_INVALID_XLSX");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) fail("LOCAL_INVALID_XLSX");
  const count = bytes.readUInt16LE(end + 10), start = bytes.readUInt32LE(end + 16);
  if (count > 2048 || count === 0xffff || start === 0xffffffff) fail("LOCAL_XLSX_TOO_COMPLEX");
  let cursor = start, total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) fail("LOCAL_INVALID_XLSX");
    total += bytes.readUInt32LE(cursor + 24);
    if (total > 64 * 1024 * 1024) fail("LOCAL_XLSX_TOO_COMPLEX");
    cursor += 46 + bytes.readUInt16LE(cursor + 28) + bytes.readUInt16LE(cursor + 30) + bytes.readUInt16LE(cursor + 32);
  }
}

export async function parseLocalDocument(input: { data: Blob; mimeType: string; documentKind: SourceDocumentKind }): Promise<EstimateExtractionResult> {
  if (input.data.size === 0) fail("LOCAL_EMPTY_DOCUMENT");
  if (input.data.size > 20 * 1024 * 1024) fail("LOCAL_FILE_TOO_LARGE");
  const result = blankResult(input.documentKind);
  if (["text/plain", "text/markdown"].includes(input.mimeType)) {
    if (input.documentKind !== "design" && input.documentKind !== "work_scope") fail("LOCAL_TEXT_REQUIRES_CONTEXT_KIND");
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(await input.data.arrayBuffer()).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim(); }
    catch { return fail("LOCAL_INVALID_ENCODING"); }
    if (text.length < 3) fail("LOCAL_EMPTY_DOCUMENT");
    if (text.length > 16000) fail("LOCAL_TEXT_TOO_LONG");
    result.workDetails = text;
    return result;
  }
  if (input.documentKind === "design" || input.documentKind === "work_scope") fail("LOCAL_TABLE_REQUIRES_PRICE_KIND");
  let tables: unknown[][][];
  if (input.mimeType === "text/csv") {
    let text: string;
    try { text = new TextDecoder("utf-8", { fatal: true }).decode(await input.data.arrayBuffer()).replace(/^\uFEFF/, ""); }
    catch { return fail("LOCAL_INVALID_ENCODING"); }
    tables = [parseCsvRows(text)];
  } else if (input.mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    try {
      const bytes = Buffer.from(await input.data.arrayBuffer());
      if (bytes.length < 22) fail("LOCAL_INVALID_XLSX");
      boundedXlsx(bytes);
      const workbook = XLSX.read(bytes, { type: "buffer", sheetRows: 82, cellFormula: true, cellDates: false, cellNF: true });
      if (workbook.SheetNames.length > 10) fail("LOCAL_XLSX_TOO_COMPLEX");
      tables = workbook.SheetNames.map((name) => {
        const sheet = workbook.Sheets[name];
        const fullRange = sheet["!fullref"] ?? sheet["!ref"];
        if (!fullRange) return [];
        const range = XLSX.utils.decode_range(fullRange);
        if (range.e.r - range.s.r > 80 || range.e.c - range.s.c > 49) fail("LOCAL_TOO_MANY_ROWS");
        for (const [address, cell] of Object.entries(sheet)) if (!address.startsWith("!") && cell && typeof cell === "object" && "f" in cell) fail("LOCAL_FORMULA_NOT_ALLOWED");
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
        const taxIndex = rows[0]?.findIndex((value) => (headers.tax as readonly string[]).map(key).includes(key(value))) ?? -1;
        if (taxIndex >= 0) rows.slice(1).forEach((row, index) => {
          const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r + index + 1, c: range.s.c + taxIndex })];
          // XLSX stores a displayed 10% as 0.1. Only an explicit percent number format establishes this meaning.
          if (typeof cell?.v === "number" && typeof cell.z === "string" && cell.z.includes("%")) row[taxIndex] = `${Number((cell.v * 100).toFixed(6))}%`;
        });
        return rows;
      }).filter((rows) => rows.length);
    } catch (error) { if (error instanceof LocalDocumentParseError) throw error; return fail("LOCAL_INVALID_XLSX"); }
  } else return fail("LOCAL_UNSUPPORTED_FORMAT");
  const modes = new Set<string>();
  for (const rows of tables) {
    const table = tableLines(rows, input.documentKind);
    result.lines.push(...table.lines);
    modes.add(table.mode);
    if (result.lines.length > 80) fail("LOCAL_TOO_MANY_ROWS");
  }
  if (!result.lines.length) fail("LOCAL_EMPTY_DOCUMENT");
  if (modes.size > 1) fail("LOCAL_MIXED_TAX_MODE");
  result.lines.forEach((line, index) => { line.lineNumber = index + 1; });
  result.totals.taxMode = [...modes][0] as "included" | "excluded" | "unknown";
  if (result.totals.taxMode === "unknown") result.warnings.push("세금 포함 여부가 지정되지 않았습니다. 검수 화면에서 원본 기준을 선택해 주세요.");
  return result;
}
